import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import { createProduct, createMaterial, addBomItem } from "@/server/catalog";
import {
  issueInvoiceForOrder,
  listEntries,
  markEntryPaid,
  generateCommission,
  creditStatus,
  orderCosting,
  createShipment,
  shipShipment,
  createEntry,
} from "@/server/finance";

const DAY = 24 * 60 * 60 * 1000;

describe("Financeiro & Logística", () => {
  let tenantId: string;

  beforeAll(async () => {
    tenantId = await makeTenant("fin");
  });
  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  async function makeOrder(total: number, customerId: string, productId?: string, qty = 0) {
    const order = await prisma.salesOrder.create({
      data: { number: `PED-FIN-${Math.random().toString(36).slice(2, 7)}`, customerId, status: "CONFIRMED", total } as any,
    });
    if (productId) {
      await prisma.salesOrderItem.create({
        data: { orderId: order.id, productId, description: "x", quantity: qty, unitPrice: 0, lineTotal: 0 } as any,
      });
    }
    return order;
  }

  it("faturar gera NF + conta a receber; baixa marca como pago", async () => {
    await asTenant(tenantId, async () => {
      const c = await prisma.customer.create({ data: { name: "Cli F1" } as any });
      const order = await makeOrder(1000, c.id);
      const inv = await issueInvoiceForOrder(order.id);
      expect(inv.number).toMatch(/^NF-\d{4}-\d{4}$/);

      const entries = await listEntries();
      const ar = entries.find((e) => e.salesOrderId === order.id && e.type === "RECEIVABLE")!;
      expect(Number(ar.amount)).toBe(1000);
      expect(ar.status).toBe("OPEN");

      const paid = await markEntryPaid(ar.id);
      expect(paid.status).toBe("PAID");
    });
  });

  it("comissão gera conta a pagar com valor correto", async () => {
    await asTenant(tenantId, async () => {
      const c = await prisma.customer.create({ data: { name: "Cli F2" } as any });
      const order = await makeOrder(2000, c.id);
      const com = await generateCommission(order.id, 0.05);
      expect(com.type).toBe("PAYABLE");
      expect(Number(com.amount)).toBe(100);
    });
  });

  it("custo orçado pela BOM e margem", async () => {
    await asTenant(tenantId, async () => {
      const mat = await createMaterial({ code: "C5", name: "Couro", unit: "m2", costPerUnit: 10 });
      const prod = await createProduct({ sku: "P5", name: "Sapato", basePrice: 0 });
      await addBomItem({ productId: prod.id, type: "MATERIAL", componentMaterialId: mat.id, quantity: 2, unit: "m2" });
      const c = await prisma.customer.create({ data: { name: "Cli F3" } as any });
      const order = await makeOrder(1000, c.id, prod.id, 10); // custo = 10 pares * 2 * 10 = 200

      const costing = await orderCosting(order.id);
      expect(costing.materialCost).toBe(200);
      expect(costing.revenue).toBe(1000);
      expect(costing.margin).toBe(800);
    });
  });

  it("inadimplência bloqueia expedição", async () => {
    await asTenant(tenantId, async () => {
      const c = await prisma.customer.create({ data: { name: "Cli devedor" } as any });
      const order = await makeOrder(500, c.id);
      // título vencido
      await createEntry({
        type: "RECEIVABLE",
        kind: "SALE",
        description: "Atrasado",
        amount: 500,
        dueDate: new Date(Date.now() - 5 * DAY),
        customerId: c.id,
      });
      const credit = await creditStatus(c.id);
      expect(credit.blocked).toBe(true);
      await expect(createShipment(order.id)).rejects.toThrow(/bloqueada/);
    });
  });

  it("expedição marca pedido como SHIPPED", async () => {
    await asTenant(tenantId, async () => {
      const c = await prisma.customer.create({ data: { name: "Cli ok" } as any });
      const order = await makeOrder(300, c.id);
      const shp = await createShipment(order.id);
      const shipped = await shipShipment(shp.id, { carrier: "Correios", trackingCode: "BR123" });
      expect(shipped.status).toBe("SHIPPED");
      const o = await prisma.salesOrder.findFirst({ where: { id: order.id } });
      expect(o!.status).toBe("SHIPPED");
    });
  });
});
