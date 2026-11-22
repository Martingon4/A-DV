import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  await db.organization.upsert({where:{id:"org-demo"},update:{},create:{id:"org-demo",name:"Red comunitaria"}});
  await db.campaign.upsert({where:{id:"campaign-demo"},update:{},create:{id:"campaign-demo",organizationId:"org-demo",name:"Campaña de higiene"}});
  await db.product.upsert({where:{id:"kits"},update:{},create:{id:"kits",organizationId:"org-demo",name:"Kits de higiene",unit:"kits"}});
  await db.balance.upsert({where:{id:"balance-demo"},update:{},create:{id:"balance-demo",organizationId:"org-demo",productId:"kits"}});
  for (const [id,name,location,requested] of [["a","Centro Esperanza","Barrio Norte",80],["b","Casa Encuentro","Barrio Centro",60],["c","Red Amanecer","Barrio Sur",40]] as const) {
    await db.center.upsert({where:{id},update:{},create:{id,organizationId:"org-demo",name,location}});
    await db.request.upsert({where:{id:`request-${id}`},update:{},create:{id:`request-${id}`,organizationId:"org-demo",campaignId:"campaign-demo",productId:"kits",centerId:id,requested}});
  }
  const coordinatorEmail = process.env.COORDINATOR_EMAIL?.trim().toLowerCase();
  if (coordinatorEmail) {
    await db.membership.upsert({
      where: { email: coordinatorEmail },
      update: {},
      create: { email: coordinatorEmail, role: "COORDINATOR", centerId: null, organizationId: "org-demo" }
    });
  }
  for (const [email, role, centerId] of [["coordinador@demo.local","COORDINATOR",null],["centro@demo.local","CENTER","a"]] as const) {
    await db.membership.upsert({where:{email},update:{},create:{email,role,centerId,organizationId:"org-demo"}});
  }
}
main().finally(() => db.$disconnect());
