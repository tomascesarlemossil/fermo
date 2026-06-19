import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * MES (Fase 3): roteiro de produção por setor, apontamento (inclui via QR Code)
 * e qualidade (inspeções + defeitos). Funções assumem contexto de tenant.
 */

export const DEFAULT_SECTORS = ["Corte", "Pesponto", "Montagem", "Acabamento", "Expedição"] as const;

// Mapa setor → status macro da OP
const SECTOR_STATUS: Record<string, "CUTTING" | "STITCHING" | "ASSEMBLY" | "FINISHING"> = {
  Corte: "CUTTING",
  Pesponto: "STITCHING",
  Montagem: "ASSEMBLY",
  Acabamento: "FINISHING",
  Expedição: "FINISHING",
};

/**
 * Gera o roteiro (etapas) de uma OP, se ainda não existir. Idempotente.
 * Cada etapa tem como meta a quantidade total da OP.
 */
export async function generateRouteForOrder(productionOrderId: string, sectors: readonly string[] = DEFAULT_SECTORS) {
  const op = await prisma.productionOrder.findFirst({ where: { id: productionOrderId } });
  if (!op) throw new Error("Ordem de produção não encontrada.");

  const existing = await prisma.productionStep.count({ where: { productionOrderId } });
  if (existing > 0) return;

  for (let i = 0; i < sectors.length; i++) {
    await prisma.productionStep.create({
      data: {
        productionOrderId,
        sequence: i + 1,
        sector: sectors[i],
        status: "PENDING",
        qtyTarget: op.quantity,
        qtyDone: 0,
      } as any,
    });
  }
}

export async function getProductionOrderDetail(id: string) {
  return prisma.productionOrder.findFirst({
    where: { id },
    include: {
      order: { include: { customer: true } },
      steps: { orderBy: { sequence: "asc" } },
      events: { orderBy: { createdAt: "desc" }, take: 30, include: { step: true } },
      inspections: { orderBy: { createdAt: "desc" }, include: { defects: true, step: true } },
    },
  });
}

/** Garante que a OP tenha roteiro e retorna o detalhe completo. */
export async function ensureRouteAndGet(id: string) {
  await generateRouteForOrder(id);
  return getProductionOrderDetail(id);
}

/** Recalcula o status macro da OP (e do pedido) a partir das etapas. */
async function recomputeOrderStatus(productionOrderId: string) {
  const steps = await prisma.productionStep.findMany({
    where: { productionOrderId },
    orderBy: { sequence: "asc" },
  });
  if (steps.length === 0) return;

  const allDone = steps.every((s) => s.status === "DONE");
  const anyActive = steps.some((s) => s.status !== "PENDING");

  let status: "PLANNED" | "CUTTING" | "STITCHING" | "ASSEMBLY" | "FINISHING" | "DONE";
  if (allDone) {
    status = "DONE";
  } else if (!anyActive) {
    status = "PLANNED";
  } else {
    const firstOpen = steps.find((s) => s.status !== "DONE");
    status = firstOpen ? SECTOR_STATUS[firstOpen.sector] ?? "CUTTING" : "FINISHING";
  }

  const op = await prisma.productionOrder.update({
    where: { id: productionOrderId },
    data: { status },
  });

  // reflete no pedido: em produção quando iniciado; expedido quando concluído
  if (allDone) {
    await prisma.salesOrder.update({ where: { id: op.orderId }, data: { status: "SHIPPED" } }).catch(() => {});
  } else if (anyActive) {
    await prisma.salesOrder.update({ where: { id: op.orderId }, data: { status: "IN_PRODUCTION" } }).catch(() => {});
  }
}

export const reportSchema = z.object({
  stepId: z.string().min(1),
  quantity: z.number().int().positive(),
  operator: z.string().optional(),
  note: z.string().optional(),
  source: z.string().optional(),
});

/**
 * Apontamento de produção em uma etapa: soma a quantidade produzida, evolui o
 * status da etapa (PENDING→IN_PROGRESS→DONE) e recalcula o status da OP.
 */
export async function reportProduction(input: z.infer<typeof reportSchema>) {
  const data = reportSchema.parse(input);
  const step = await prisma.productionStep.findFirst({ where: { id: data.stepId } });
  if (!step) throw new Error("Etapa não encontrada.");

  const newQty = Math.min(step.qtyTarget, step.qtyDone + data.quantity);
  const reachedTarget = newQty >= step.qtyTarget;

  await prisma.productionStep.update({
    where: { id: step.id },
    data: {
      qtyDone: newQty,
      status: reachedTarget ? "DONE" : "IN_PROGRESS",
      startedAt: step.startedAt ?? new Date(),
      finishedAt: reachedTarget ? new Date() : null,
    },
  });

  await prisma.productionEvent.create({
    data: {
      productionOrderId: step.productionOrderId,
      stepId: step.id,
      type: reachedTarget ? "COMPLETE" : "PRODUCE",
      quantity: data.quantity,
      operator: data.operator || null,
      note: data.note || null,
      source: data.source || "admin",
    } as any,
  });

  await recomputeOrderStatus(step.productionOrderId);
  return { stepId: step.id, qtyDone: newQty, done: reachedTarget };
}

// ── Qualidade ───────────────────────────────────────────────────

export async function listInspections() {
  return prisma.qualityInspection.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      defects: true,
      step: true,
      productionOrder: { include: { order: { include: { customer: true } } } },
    },
  });
}

export const inspectionSchema = z.object({
  productionOrderId: z.string().min(1),
  stepId: z.string().optional(),
  inspector: z.string().optional(),
  sampleSize: z.number().int().nonnegative().default(0),
  approvedQty: z.number().int().nonnegative().default(0),
  rejectedQty: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  defects: z
    .array(
      z.object({
        type: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
      }),
    )
    .optional(),
});

export function resolveResult(approvedQty: number, rejectedQty: number): "PASS" | "PARTIAL" | "FAIL" {
  if (rejectedQty <= 0) return "PASS";
  if (approvedQty <= 0) return "FAIL";
  return "PARTIAL";
}

export async function createInspection(input: z.infer<typeof inspectionSchema>) {
  const data = inspectionSchema.parse(input);
  const result = resolveResult(data.approvedQty, data.rejectedQty);

  return prisma.$transaction(async (tx) => {
    const inspection = await tx.qualityInspection.create({
      data: {
        productionOrderId: data.productionOrderId,
        stepId: data.stepId || null,
        inspector: data.inspector || null,
        result,
        sampleSize: data.sampleSize,
        approvedQty: data.approvedQty,
        rejectedQty: data.rejectedQty,
        notes: data.notes || null,
      } as any,
    });

    for (const d of data.defects ?? []) {
      await tx.qualityDefect.create({
        data: {
          inspectionId: inspection.id,
          type: d.type,
          quantity: d.quantity,
          severity: d.severity,
        } as any,
      });
    }

    return tx.qualityInspection.findFirstOrThrow({
      where: { id: inspection.id },
      include: { defects: true },
    });
  });
}
