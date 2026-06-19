import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";

let counter = 0;

/** Cria um tenant isolado para teste (slug único) e retorna o id. */
export async function makeTenant(prefix = "test") {
  const slug = `${prefix}-${Date.now()}-${counter++}`;
  const tenant = await runWithTenant(
    { tenantId: "__test__", bypassTenant: true, source: "test" },
    () => prisma.tenant.create({ data: { slug, name: slug } }),
  );
  return tenant.id;
}

/** Garante que o role 'admin' exista (depende do seed de RBAC). */
export async function adminRoleId() {
  const r = await runWithTenant(
    { tenantId: "__test__", bypassTenant: true, source: "test" },
    () =>
      prisma.role.upsert({
        where: { key: "admin" },
        update: {},
        create: { key: "admin", name: "Administrador" },
      }),
  );
  return r.id;
}

export function asTenant<T>(tenantId: string, fn: () => Promise<T>) {
  // Importante: aguardar DENTRO do contexto. Prisma promises são lazy; se o
  // callback retornar a promise sem await, a query executa fora do AsyncLocalStorage.
  return runWithTenant({ tenantId, userId: "tester", source: "test" }, async () => await fn()) as Promise<T>;
}
