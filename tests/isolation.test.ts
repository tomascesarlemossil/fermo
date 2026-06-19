import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant, getTenantContext } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";

/**
 * Critério de gate da Fase 0: usuário do tenant A NUNCA lê/escreve dados do
 * tenant B. Estes testes exercem a Prisma Extension multi-tenant diretamente.
 */
describe("isolamento multi-tenant", () => {
  let tenantA: string;
  let tenantB: string;
  let custB: string;

  beforeAll(async () => {
    tenantA = await makeTenant("iso-a");
    tenantB = await makeTenant("iso-b");

    // Customer pertencente ao tenant B.
    const c = await asTenant(tenantB, () =>
      prisma.customer.create({ data: { name: "Segredo do B" } as any }),
    );
    custB = c.id;
    // Customer do tenant A.
    await asTenant(tenantA, () => prisma.customer.create({ data: { name: "Cliente do A" } as any }));
  });

  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, async () => {
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    });
  });

  it("findMany só retorna registros do próprio tenant", async () => {
    const fromA = await asTenant(tenantA, () => prisma.customer.findMany());
    expect(fromA.every((c) => c.tenantId === tenantA)).toBe(true);
    expect(fromA.some((c) => c.name === "Segredo do B")).toBe(false);
  });

  it("findFirst/findUnique do tenant A não enxerga registro do tenant B", async () => {
    const found = await asTenant(tenantA, () => prisma.customer.findFirst({ where: { id: custB } }));
    expect(found).toBeNull();
    const unique = await asTenant(tenantA, () => prisma.customer.findUnique({ where: { id: custB } }));
    expect(unique).toBeNull();
  });

  it("update do tenant A não altera registro do tenant B", async () => {
    const res = await asTenant(tenantA, () =>
      prisma.customer.updateMany({ where: { id: custB }, data: { name: "INVADIDO" } }),
    );
    expect(res.count).toBe(0);
    const stillB = await asTenant(tenantB, () => prisma.customer.findFirst({ where: { id: custB } }));
    expect(stillB?.name).toBe("Segredo do B");
  });

  it("delete do tenant A não remove registro do tenant B", async () => {
    const res = await asTenant(tenantA, () =>
      prisma.customer.deleteMany({ where: { id: custB } }),
    );
    expect(res.count).toBe(0);
    const stillThere = await asTenant(tenantB, () =>
      prisma.customer.findFirst({ where: { id: custB } }),
    );
    expect(stillThere).not.toBeNull();
  });

  it("create injeta o tenantId do contexto (não do input)", async () => {
    const created = await asTenant(tenantA, () =>
      // tentativa de forçar tenantId de B deve ser sobrescrita pelo contexto A
      prisma.customer.create({ data: { name: "X", tenantId: tenantB } as any }),
    );
    expect(created.tenantId).toBe(tenantA);
  });

  it("operação em modelo de negócio sem contexto de tenant lança erro", async () => {
    expect(getTenantContext()).toBeUndefined();
    await expect(prisma.customer.findMany()).rejects.toThrow(/contexto de tenant/);
  });
});
