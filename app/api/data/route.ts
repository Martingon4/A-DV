import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { member } from "@/lib/authorization";
import { mutate, view } from "@/lib/service";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await view(await member())); }
  catch { return Response.json({error:"No se pudo cargar la información. Comprueba tu sesión y la conexión."},{status:401}); }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedHost = request.headers.get("host");
  if (!origin || new URL(origin).host !== expectedHost) return Response.json({error:"Origen de solicitud inválido."},{status:403});
  try { return Response.json(await mutate(await request.json(),await member())); }
  catch(error) {
    return Response.json({error:error instanceof ZodError ? "Revisa los campos y las cantidades enteras." : error instanceof Prisma.PrismaClientKnownRequestError ? "No se pudo guardar. Actualiza los datos y reintenta." : error instanceof Error ? error.message:"No se pudo completar la operación."},{status:400});
  }
}
