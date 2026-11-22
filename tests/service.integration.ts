import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { mutate, view } from "../lib/service";
async function main() {
 const org=randomUUID();
 await db.organization.create({data:{id:org,name:"Integración temporal"}});
 await db.center.createMany({data:["a","b","c"].map((id,i)=>({id:org+id,organizationId:org,name:id,location:"Prueba"}))});
 await db.product.create({data:{id:org,organizationId:org,name:"Kit",unit:"kit"}});
 await db.campaign.create({data:{id:org,organizationId:org,name:"Prueba"}});
 await db.balance.create({data:{id:org,organizationId:org,productId:org}});
 for(const [i,id] of ["a","b","c"].entries()) await db.request.create({data:{id:org+id,organizationId:org,productId:org,campaignId:org,centerId:org+id,requested:[80,60,40][i]}});
 const coordinator={email:"test@local",organizationId:org,role:"COORDINATOR",centerId:null};
 const center={...coordinator,role:"CENTER",centerId:org+"a"};
 try {
  const donation={action:"donate",quantity:90,reference:"Prueba",key:randomUUID()};
  await Promise.all([mutate(donation,coordinator),mutate(donation,coordinator)]);
  assert.equal((await view(coordinator)).balance?.onHand,90);
  const draft=await mutate({action:"preview"},coordinator);
  assert.deepEqual(draft?.proposal?.lines.map(l=>l.quantity),[40,30,20]);
  const rival=await mutate({action:"preview"},coordinator);
  await Promise.all([mutate({action:"confirm",id:draft!.proposal!.id},coordinator),mutate({action:"confirm",id:draft!.proposal!.id},coordinator)]);
  assert.equal((await view(coordinator)).balance?.reserved,90);
  await assert.rejects(()=>mutate({action:"confirm",id:rival!.proposal!.id},coordinator),/desactualizada/);
  const centerView=await view(center);
  assert.equal(centerView.requests.length,1);
  assert.equal(centerView.lines.length,1);
  assert.equal(centerView.balance,null);
  await assert.rejects(()=>mutate({action:"request",id:org+"b",quantity:100},center),/permiso/);
  await assert.rejects(()=>mutate(donation,center),/coordinación/);
  const line=centerView.lines[0];
  await Promise.all([mutate({action:"deliver",id:line.id},coordinator),mutate({action:"deliver",id:line.id},coordinator)]);
  assert.equal((await view(coordinator)).balance?.onHand,50);
  assert.equal((await view(coordinator)).balance?.reserved,50);
  const other=(await view(coordinator)).lines.find(l=>l.status==="RESERVED")!;
  await Promise.all([mutate({action:"cancel",id:other.id},coordinator),mutate({action:"cancel",id:other.id},coordinator)]);
  assert.equal((await view(coordinator)).balance?.reserved,50-other.quantity);
  console.log("Integración correcta: reparto, concurrencia, idempotencia, permisos, entrega y cancelación.");
 } finally {
  await db.event.deleteMany({where:{organizationId:org}});
  await db.allocationLine.deleteMany({where:{run:{organizationId:org}}});
  await db.allocationRun.deleteMany({where:{organizationId:org}});
  await db.request.deleteMany({where:{organizationId:org}});
  await db.balance.deleteMany({where:{organizationId:org}});
  await db.center.deleteMany({where:{organizationId:org}});
  await db.campaign.deleteMany({where:{organizationId:org}});
  await db.product.deleteMany({where:{organizationId:org}});
  await db.organization.delete({where:{id:org}});
 }
}
main().finally(()=>db.$disconnect());
