import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import { createProduct, createMaterial, addBomItem } from "@/server/catalog";
import { suggestQuotePrice, detectAnomalies } from "@/server/intelligence";
import { createRule, runAutomations, listRules } from "@/server/automations";

describe("Inteligência & automações (Fase 6)", () => {
  let tenantId: string;

  beforeAll(async () => {
    tenantId = await makeTenant("ia");
  });
  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  it("sugere preço a partir do custo da BOM × markup", async () => {
    await asTenant(tenantId, async () => {
      const mat = await createMaterial({ code: "M", name: "Couro", unit: "m2", costPerUnit: 10 });
      const prod = await createProduct({ sku: "P", name: "Sapato", basePrice: 0 });
      await addBomItem({ productId: prod.id, type: "MATERIAL", componentMaterialId: mat.id, quantity: 2, unit: "m2" });

      const s = await suggestQuotePrice(prod.id, 2); // custo 20 × 2 = 40
      expect(s.materialCost).toBe(20);
      expect(s.suggestedUnitPrice).toBe(40);
      expect(s.marginPct).toBeCloseTo(0.5, 5);
    });
  });

  it("detecta anomalia de margem baixa", async () => {
    await asTenant(tenantId, async () => {
      const mat = await createMaterial({ code: "M2", name: "Couro caro", unit: "m2", costPerUnit: 100 });
      const prod = await createProduct({ sku: "P2", name: "Caro", basePrice: 0 });
      await addBomItem({ productId: prod.id, type: "MATERIAL", componentMaterialId: mat.id, quantity: 1, unit: "m2" });
      const c = await prisma.customer.create({ data: { name: "Cli" } as any });
      const order = await prisma.salesOrder.create({
        data: { number: "PED-IA-1", customerId: c.id, status: "CONFIRMED", total: 110 } as any,
      });
      await prisma.salesOrderItem.create({
        data: { orderId: order.id, productId: prod.id, description: "x", quantity: 1, unitPrice: 110, lineTotal: 110 } as any,
      });
      // custo 100, receita 110 → margem ~9% < 20%
      const insights = await detectAnomalies();
      expect(insights.some((i) => i.category === "Margem" && i.message.includes("PED-IA-1"))).toBe(true);
    });
  });

  it("automação ativa cria notificação no gatilho", async () => {
    await asTenant(tenantId, async () => {
      await createRule({
        name: "Avisar novo lead",
        trigger: "lead.created",
        action: "notify",
        title: "Lead: {name}",
        body: "Empresa {company}",
      });
      const before = await prisma.notification.count();
      await runAutomations("lead.created", { name: "Fulano", company: "ACME" });
      const after = await prisma.notification.count();
      expect(after).toBe(before + 1);

      const n = await prisma.notification.findFirst({ orderBy: { createdAt: "desc" } });
      expect(n!.title).toBe("Lead: Fulano");

      const rules = await listRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });
});
