import { auth } from "./auth";
import { db } from "./db";
export async function member() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Inicia sesión para continuar.");
  const membership = await db.membership.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!membership) throw new Error("Tu cuenta necesita una invitación.");
  return membership;
}
