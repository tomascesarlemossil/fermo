import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import { createProduct, createMaterial, addBomItem } from "@/server/catalog";
import {
  createSupplier,
  applyStockMovement,
  availableStock,
  createPurchaseOrder,
  receivePurchaseOrder,
  runMrp,
} from "@/server/supply";

/**
 * Fase 4 (Suprimentos): estoque (saldo/reserva), recebimento de compra e MRP.
 */
describe("Suprimentos — estoque, compras e MRP", () => {
  let tenantId: string;
  let matId: string;

  beforeAll(async () => {
    tenantId = await makeTenant("supply");
    await asTenant(tenantId, async () => {
      const m = await createMaterial({ code: "CR", name: "Couro", unit: "m2", costPerUnit: 40 });
      matId = m.id;
    });
  });

  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  it("saldo e reserva refletem os movimentos", async () => {
    await asTenant(tenantId, async () => {
      await applyStockMovement({ refType: "MATERIAL", refId: matId, type: "IN", quantity: 100 });
      expect(await availableStock("MATERIAL", matId)).toBe(100);
      await applyStockMovement({ refType: "MATERIAL", refId: matId, type: "RESERVE", quantity: 30 });
      expect(await availableStock("MATERIAL", matId)).toBe(70);
      await applyStockMovement({ refType: "MATERIAL", refId: matId, type: "OUT", quantity: 20 });
      expect(await availableStock("MATERIAL", matId)).toBe(50); // 80 qty - 30 reservado
    });
  });

  it("recebimento de compra entra no estoque", async () => {
    await asTenant(tenantId, async () => {
      const before = await availableStock("MATERIAL", matId);
      const sup = await createSupplier({ name: "Curtume X", kind: "MATERIAL" });
      const po = await createPurchaseOrder({
        supplierId: sup.id,
        items: [{ materialId: matId, description: "Couro", quantity: 50, unitCost: 40 }],
      });
      expect(po.number).toMatch(/^PC-\d{4}-\d{4}$/);
      const received = await receivePurchaseOrder(po.id);
      expect(received.status).toBe("RECEIVED");
      expect(await availableStock("MATERIAL", matId)).toBe(before + 50);
    });
  });

  it("MRP calcula necessidade líquida a partir da BOM e do estoque", async () => {
    await asTenant(tenantId, async () => {
      // produto com BOM: 2 m2 de couro por par
      const prod = await createProduct({ sku: "BOTA", name: "Bota", basePrice: 0 });
      await addBomItem({ productId: prod.id, type: "MATERIAL", componentMaterialId: matId, quantity: 2, unit: "m2" });

      // pedido ativo com 100 pares desse produto
      const customer = await prisma.customer.create({ data: { name: "Cli" } as any });
      const order = await prisma.salesOrder.create({
        data: { number: "PED-MRP-1", customerId: customer.id, status: "CONFIRMED", total: 0 } as any,
      });
      await prisma.salesOrderItem.create({
        data: { orderId: order.id, productId: prod.id, description: "Bota", quantity: 100, unitPrice: 0, lineTotal: 0 } as any,
      });

      const gross = 100 * 2; // 200 m2
      const available = await availableStock("MATERIAL", matId);
      const mrp = await runMrp();
      const line = mrp.find((l) => l.materialId === matId)!;
      expect(line.gross).toBe(gross);
      expect(line.available).toBe(available);
      expect(line.net).toBe(Math.max(0, gross - available));
    });
  });
});
