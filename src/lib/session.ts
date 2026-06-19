import { auth } from "./auth";
import { runWithTenant } from "./tenant-context";
import type { PermissionKey } from "./rbac";
import { assertCan } from "./rbac";

export type AppSession = {
  id: string;
  tenantId: string;
  roleId: string;
  roleKey: string;
  permissions: string[];
  customerId?: string | null;
  name?: string | null;
  email?: string | null;
};

export async function getSession(): Promise<AppSession | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  return {
    id: s.user.id,
    tenantId: s.user.tenantId,
    roleId: s.user.roleId,
    roleKey: s.user.roleKey,
    permissions: s.user.permissions ?? [],
    customerId: s.user.customerId,
    name: s.user.name,
    email: s.user.email,
  };
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) throw new Error("Não autenticado.");
  return s;
}

/**
 * Executa `fn` no contexto multi-tenant da sessão atual. Toda Server Action que
 * toca o banco deve passar por aqui — assim tenantId e userId são resolvidos da
 * sessão (nunca do front) e ficam disponíveis para as Prisma Extensions.
 */
export async function withSession<T>(
  fn: (session: AppSession) => Promise<T>,
  opts?: { permission?: PermissionKey; source?: string },
): Promise<T> {
  const session = await requireSession();
  if (opts?.permission) assertCan(session, opts.permission);
  return runWithTenant(
    { tenantId: session.tenantId, userId: session.id, source: opts?.source ?? "server-action" },
    () => fn(session),
  ) as Promise<T>;
}
