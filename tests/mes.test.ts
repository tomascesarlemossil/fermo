import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import {
  generateRouteForOrder,
  ensureRouteAndGet,
  reportProduction,
  createInspection,
  resolveResult,
  getProductionOrderDetail,
  DEFAULT_SECTORS,
} from "@/server/mes";

/**
 * Fase 3 (MES): roteiro, apontamento (status da etapa/OP) e qualidade.
 */
describe("MES — roteiro, apontamento e qualidade", () => {
  let tenantId: string;
  let opId: string;

  beforeAll(async () => {
    tenantId = await makeTenant("mes");
    await asTenant(tenantId, async () => {
      const customer = await prisma.customer.create({ data: { name: "Cliente MES" } as any });
      const order = await prisma.salesOrder.create({
        data: { number: "PED-TST-0001", customerId: customer.id, status: "CONFIRMED", total: 0 } as any,
      });
      const op = await prisma.productionOrder.create({
        data: { number: "OP-TST-0001", orderId: order.id, status: "PLANNED", quantity: 10 } as any,
      });
      opId = op.id;
      await generateRouteForOrder(op.id);
    });
  });

  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  it("gera o roteiro por setor (idempotente)", async () => {
    await asTenant(tenantId, async () => {
      await generateRouteForOrder(opId); // segunda chamada não duplica
      const detail = await getProductionOrderDetail(opId);
      expect(detail!.steps.length).toBe(DEFAULT_SECTORS.length);
      expect(detail!.steps.map((s) => s.sector)).toEqual([...DEFAULT_SECTORS]);
      expect(detail!.steps.every((s) => s.qtyTarget === 10)).toBe(true);
    });
  });

  it("apontamento evolui etapa e status macro da OP", async () => {
    await asTenant(tenantId, async () => {
      const detail = await ensureRouteAndGet(opId);
      const corte = detail!.steps.find((s) => s.sector === "Corte")!;

      // apontamento parcial
      const r1 = await reportProduction({ stepId: corte.id, quantity: 4, operator: "op1" });
      expect(r1.qtyDone).toBe(4);
      expect(r1.done).toBe(false);
      let op = await prisma.productionOrder.findFirst({ where: { id: opId } });
      expect(op!.status).toBe("CUTTING");

      // completa o Corte → OP avança para Pesponto (STITCHING)
      const r2 = await reportProduction({ stepId: corte.id, quantity: 10, operator: "op1" });
      expect(r2.qtyDone).toBe(10); // capado na meta
      expect(r2.done).toBe(true);
      op = await prisma.productionOrder.findFirst({ where: { id: opId } });
      expect(op!.status).toBe("STITCHING");

      // pedido entra em produção
      const order = await prisma.salesOrder.findFirst({ where: { id: op!.orderId } });
      expect(order!.status).toBe("IN_PRODUCTION");
    });
  });

  it("concluir todas as etapas marca OP como DONE e pedido SHIPPED", async () => {
    await asTenant(tenantId, async () => {
      const detail = await getProductionOrderDetail(opId);
      for (const step of detail!.steps) {
        if (step.status !== "DONE") {
          await reportProduction({ stepId: step.id, quantity: step.qtyTarget });
        }
      }
      const op = await prisma.productionOrder.findFirst({ where: { id: opId } });
      expect(op!.status).toBe("DONE");
      const order = await prisma.salesOrder.findFirst({ where: { id: op!.orderId } });
      expect(order!.status).toBe("SHIPPED");
    });
  });

  it("inspeção de qualidade calcula resultado e grava defeitos", async () => {
    expect(resolveResult(10, 0)).toBe("PASS");
    expect(resolveResult(8, 2)).toBe("PARTIAL");
    expect(resolveResult(0, 5)).toBe("FAIL");

    await asTenant(tenantId, async () => {
      const insp = await createInspection({
        productionOrderId: opId,
        inspector: "qa1",
        sampleSize: 10,
        approvedQty: 8,
        rejectedQty: 2,
        defects: [
          { type: "Costura torta", quantity: 1, severity: "MEDIUM" },
          { type: "Mancha no couro", quantity: 1, severity: "LOW" },
        ],
      });
      expect(insp.result).toBe("PARTIAL");
      expect(insp.defects.length).toBe(2);
    });
  });
});
