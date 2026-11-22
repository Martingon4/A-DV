import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google,
    ...(process.env.DEMO_AUTH === "true" && process.env.NODE_ENV !== "production" ? [Credentials({
      name: "Demostración local",
      credentials: { profile: {} },
      async authorize(credentials) {
        const email = credentials.profile === "center" ? "centro@demo.local" :
          credentials.profile === "coordinator" ? "coordinador@demo.local" : null;
        return email ? { id: email, email, name: email === "centro@demo.local" ? "Centro Esperanza" : "Coordinación" } : null;
      }
    })] : [])
  ],
  callbacks: {
    async signIn({ user }) {
      return !!user.email && !!await db.membership.findUnique({ where: { email: user.email.toLowerCase() } });
    }
  },
  pages: { signIn: "/login" }
});
