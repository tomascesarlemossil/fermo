import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import { runWithTenant } from "./tenant-context";

/**
 * Auth.js (NextAuth v5) — credenciais. Sessão em JWT carrega tenantId, roleKey
 * e o conjunto de permissões para checagem RBAC barata no servidor.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      roleId: string;
      roleKey: string;
      permissions: string[];
      customerId?: string | null;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenant: z.string().optional(),
});

/** Lookup de login roda sem escopo de tenant (resolve o tenant pelo usuário). */
function unscoped<T>(fn: () => Promise<T>) {
  // await DENTRO do contexto: prisma promises são lazy.
  return runWithTenant({ tenantId: "__auth__", bypassTenant: true, source: "auth" }, async () => await fn()) as Promise<T>;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
        tenant: { label: "Empresa", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, tenant } = parsed.data;

        const user = await unscoped(() =>
          prisma.user.findFirst({
            where: {
              email: email.toLowerCase(),
              active: true,
              ...(tenant ? { tenant: { slug: tenant } } : {}),
            },
            include: {
              role: { include: { rolePermissions: { include: { permission: true } } } },
            },
          }),
        );
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          roleId: user.roleId,
          roleKey: user.role.key,
          permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
          customerId: user.customerId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.uid = u.id;
        token.tenantId = u.tenantId;
        token.roleId = u.roleId;
        token.roleKey = u.roleKey;
        token.permissions = u.permissions;
        token.customerId = u.customerId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.tenantId = token.tenantId as string;
        session.user.roleId = token.roleId as string;
        session.user.roleKey = token.roleKey as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.customerId = (token.customerId as string | null) ?? null;
      }
      return session;
    },
  },
});
