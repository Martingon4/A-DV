import { Prisma, Membership } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { allocate } from "./allocation";
const quantity = z.number().int().min(1).max(1000000);
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action:z.literal("donate"), quantity, reference:z.string().trim().min(1).max(160), key:z.string().uuid() }),
  z.object({ action:z.literal("request"), id:z.string(), quantity:quantity.min(0) }),
  z.object({ action:z.literal("preview") }),
  z.object({ action:z.literal("confirm"), id:z.string() }),
  z.object({ action:z.literal("deliver"), id:z.string() }),
  z.object({ action:z.literal("cancel"), id:z.string() })
]);
type Tx = Prisma.TransactionClient;
async function snapshot(tx: Tx, organizationId: string) {
  const balance = await tx.balance.findFirstOrThrow({ where: { organizationId } });
  const requests = await tx.request.findMany({where:{organizationId,productId:balance.productId},include:{center:true,lines:true},orderBy:{id:"asc"}});
  return { balance, requests: requests.map(r => {
    const reserved = r.lines.filter(l=>l.status==="RESERVED").reduce((s,l)=>s+l.quantity,0);
    const delivered = r.lines.filter(l=>l.status==="DELIVERED").reduce((s,l)=>s+l.quantity,0);
    return {id:r.id,name:r.center.name,location:r.center.location,centerId:r.centerId,requested:r.requested,version:r.version,reserved,delivered,pending:r.requested-reserved-delivered};
  }) };
}
export async function view(membership: Membership) {
  return db.$transaction(async tx => {
    const state = await snapshot(tx,membership.organizationId);
    const coordinator = membership.role === "COORDINATOR";
    const requests = state.requests.filter(r=>coordinator || r.centerId===membership.centerId);
    const lines = await tx.allocationLine.findMany({
      where:{run:{organizationId:membership.organizationId},...(coordinator?{}:{request:{centerId:membership.centerId ?? "__no_center__"}})},
      include:{request:{include:{center:true}}},orderBy:{id:"asc"}});
    const events = await tx.event.findMany({where:{organizationId:membership.organizationId,...(coordinator?{}:{centerId:membership.centerId ?? "__no_center__"})},orderBy:{createdAt:"desc"},take:30});
    return { role:membership.role, centerId:membership.centerId ?? "__no_center__", requests, lines, events,
      balance:coordinator?state.balance:null };
  }, {isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
export async function mutate(raw: unknown, membership: Membership) {
  const input = inputSchema.parse(raw);
  if (input.action!=="request" && membership.role!=="COORDINATOR") throw new Error("Esta acción requiere coordinación.");
  // Every writer locks the same organization balance before accessing dependent rows.
  for (let attempt=0; attempt<3; attempt++) {
    try {
      return await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Balance" WHERE "organizationId" = ${membership.organizationId} ORDER BY id FOR UPDATE`;
        const state = await snapshot(tx,membership.organizationId);
        const balance = state.balance;
        const audit = (action:string, amount?:number, centerId?:string, key?:string, reference?:string) =>
          tx.event.create({data:{organizationId:membership.organizationId,actor:membership.email,action,quantity:amount,centerId,idempotencyKey:key,reference}});
        if (input.action==="donate") {
          const existing = await tx.event.findUnique({where:{idempotencyKey:input.key}});
          if (existing) {
            if(existing.organizationId!==membership.organizationId || existing.quantity!==input.quantity || existing.reference!==input.reference) throw new Error("La referencia de operación ya se utilizó.");
            return {message:"Donación ya registrada."};
          }
          await tx.balance.update({where:{id:balance.id},data:{onHand:{increment:input.quantity},version:{increment:1}}});
          await audit("Donación recibida",input.quantity,undefined,input.key,input.reference);
          return {message:"Donación registrada."};
        }
        if (input.action==="request") {
          const request = state.requests.find(r=>r.id===input.id);
          if(!request || (membership.role!=="COORDINATOR" && request.centerId!==membership.centerId)) throw new Error("Solicitud sin permiso de acceso.");
          if(input.quantity<request.reserved+request.delivered) throw new Error("La necesidad debe cubrir las unidades ya reservadas y entregadas.");
          await tx.request.update({where:{id:request.id},data:{requested:input.quantity,version:{increment:1}}});
          await audit("Necesidad actualizada",input.quantity,request.centerId);
          return {message:"Solicitud actualizada."};
        }
        const currentSnapshot = JSON.parse(JSON.stringify(state));
        if(input.action==="preview") {
          const proposal = allocate(balance.onHand-balance.reserved,state.requests.map(r=>({id:r.id,pending:r.pending})));
          const run = await tx.allocationRun.create({data:{organizationId:membership.organizationId,snapshot:currentSnapshot}});
          return {message:"Propuesta preparada.",proposal:{id:run.id,lines:proposal}};
        }
        if(input.action==="confirm") {
          const run = await tx.allocationRun.findFirst({where:{id:input.id,organizationId:membership.organizationId}});
          if(!run) throw new Error("Propuesta inexistente.");
          if(run.status==="CONFIRMED") return {message:"Este reparto ya estaba confirmado."};
          if(JSON.stringify(run.snapshot)!==JSON.stringify(currentSnapshot)) {
            // JSONB key ordering differs from JavaScript object insertion ordering.
            const previous = run.snapshot as typeof currentSnapshot;
            if(JSON.stringify([previous.balance?.version,previous.requests?.map((r:{id:string,version:number,reserved:number,delivered:number})=>[r.id,r.version,r.reserved,r.delivered])])!==
              JSON.stringify([balance.version,state.requests.map(r=>[r.id,r.version,r.reserved,r.delivered])])) throw new Error("La propuesta está desactualizada. Prepara un nuevo reparto.");
          }
          const proposal = allocate(balance.onHand-balance.reserved,state.requests.map(r=>({id:r.id,pending:r.pending})));
          const total = proposal.reduce((s,l)=>s+l.quantity,0);
          if(!total) throw new Error("Se necesita inventario disponible y necesidades pendientes.");
          await tx.allocationLine.createMany({data:proposal.filter(l=>l.quantity>0).map(l=>({runId:run.id,requestId:l.id,quantity:l.quantity,explanation:l.explanation}))});
          await tx.balance.update({where:{id:balance.id},data:{reserved:{increment:total},version:{increment:1}}});
          await tx.allocationRun.update({where:{id:run.id},data:{status:"CONFIRMED"}});
          for(const line of proposal.filter(l=>l.quantity>0)) await audit("Unidades reservadas",line.quantity,state.requests.find(r=>r.id===line.id)!.centerId);
          return {message:"Reparto confirmado e inventario reservado."};
        }
        const line = await tx.allocationLine.findFirst({where:{id:input.id,run:{organizationId:membership.organizationId}},include:{request:true}});
        if(!line) throw new Error("Asignación inexistente.");
        const target = input.action==="deliver"?"DELIVERED":"CANCELLED";
        if(line.status===target) return {message:"Operación ya registrada."};
        if(line.status!=="RESERVED") throw new Error("La asignación ya fue cerrada.");
        await tx.allocationLine.update({where:{id:line.id},data:{status:target}});
        await tx.balance.update({where:{id:balance.id},data:{reserved:{decrement:line.quantity},...(target==="DELIVERED"?{onHand:{decrement:line.quantity}}:{}),version:{increment:1}}});
        await audit(target==="DELIVERED"?"Entrega registrada":"Reserva cancelada",line.quantity,line.request.centerId);
        return {message:target==="DELIVERED"?"Entrega registrada.":"Reserva liberada."};
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    } catch(error) {
      if(error instanceof Prisma.PrismaClientKnownRequestError && (error.code==="P2034" || (error.code==="P2010" && ["40001","40P01"].includes(String(error.meta?.code)))) && attempt<2) continue;
      throw error;
    }
  }
  throw new Error("Vuelve a intentar la operación.");
}
