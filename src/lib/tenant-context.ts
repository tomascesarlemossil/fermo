import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto da requisição corrente. tenantId é SEMPRE resolvido pela sessão
 * no servidor (nunca vem do front). A Prisma Extension lê daqui para injetar
 * `where: { tenantId }` automaticamente.
 */
export type TenantContext = {
  tenantId: string;
  userId?: string;
  /** origem da operação para o AuditLog (ex.: "server-action", "api", "seed") */
  source?: string;
  /**
   * Quando true, a extensão NÃO injeta tenantId (uso restrito: login,
   * resolução de tenant público, seed). Use com cuidado.
   */
  bypassTenant?: boolean;
};

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenantId(): string {
  const ctx = storage.getStore();
  if (!ctx?.tenantId) {
    throw new Error("Tenant context ausente: nenhuma operação multi-tenant fora de runWithTenant.");
  }
  return ctx.tenantId;
}
