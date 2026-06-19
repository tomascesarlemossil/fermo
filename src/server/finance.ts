import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { nextNumber } from "./numbering";
import { explodeBom } from "./catalog";

/**
 * Financeiro & Logística (Fase 5): contas a pagar/receber, fluxo de caixa,
 * comissões, faturamento, custos (orçado×receita) e expedição. Inclui regra de
 * bloqueio por inadimplência.
 */

const DAY = 24 * 60 * 60 * 1000;

// ── Lançamentos (AP/AR) ─────────────────────────────────────────

export const entrySchema = z.object({
  type: z.enum(["RECEIVABLE", "PAYABLE"]),
  kind: z.enum(["SALE", "PURCHASE", "COMMISSION", "OTHER"]).default("OTHER"),
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  salesOrderId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
});

export async function createEntry(input: z.infer<typeof entrySchema>) {
  const data = entrySchema.parse(input);
  return prisma.financialEntry.create({
    data: {
      type: data.type,
      kind: data.kind,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      customerId: data.customerId || null,
      supplierId: data.supplierId || null,
      salesOrderId: data.salesOrderId || null,
      purchaseOrderId: data.purchaseOrderId || null,
    } as any,
  });
}

export async function markEntryPaid(id: string) {
  return prisma.financialEntry.update({
    where: { id },
    data: { status: "PAID", paidDate: new Date() },
  });
}

/** Marca como vencido (derivado): OPEN com dueDate no passado. */
export function isOverdue(e: { status: string; dueDate: Date | string }) {
  return e.status === "OPEN" && new Date(e.dueDate).getTime() < Date.now();
}

export async function listEntries() {
  const entries = await prisma.financialEntry.findMany({ orderBy: { dueDate: "asc" } });
  return entries.map((e) => ({ ...e, overdue: isOverdue(e) }));
}

// ── Faturamento ─────────────────────────────────────────────────

/** Emite NF para o pedido e gera a conta a receber correspondente (30 dias). */
export async function issueInvoiceForOrder(orderId: string, opts?: { dueDays?: number }) {
  const order = await prisma.salesOrder.findFirst({ where: { id: orderId } });
  if (!order) throw new Error("Pedido não encontrado.");

  const existing = await prisma.invoice.findFirst({ where: { salesOrderId: orderId } });
  if (existing) return existing;

  const number = await nextNumber("invoice");
  const total = Number(order.total);
  const dueDate = new Date(Date.now() + (opts?.dueDays ?? 30) * DAY);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: { number, salesOrderId: orderId, status: "ISSUED", total } as any,
    });
    await tx.financialEntry.create({
      data: {
        type: "RECEIVABLE",
        kind: "SALE",
        description: `NF ${number} — pedido ${order.number}`,
        amount: total,
        dueDate,
        customerId: order.customerId,
        salesOrderId: order.id,
      } as any,
    });
    return invoice;
  });
}

export async function listInvoices() {
  return prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" },
    include: { salesOrder: { include: { customer: true } } },
  });
}

/** Gera comissão (conta a pagar) sobre o total do pedido. */
export async function generateCommission(orderId: string, rate: number) {
  const order = await prisma.salesOrder.findFirst({ where: { id: orderId } });
  if (!order) throw new Error("Pedido não encontrado.");
  const amount = Number((Number(order.total) * rate).toFixed(2));
  return prisma.financialEntry.create({
    data: {
      type: "PAYABLE",
      kind: "COMMISSION",
      description: `Comissão ${(rate * 100).toFixed(1)}% — pedido ${order.number}`,
      amount,
      dueDate: new Date(Date.now() + 30 * DAY),
      salesOrderId: order.id,
    } as any,
  });
}

// ── Fluxo de caixa ──────────────────────────────────────────────

export type CashFlowBucket = {
  month: string; // YYYY-MM
  receivable: number;
  payable: number;
  net: number;
};

export async function cashFlow(): Promise<CashFlowBucket[]> {
  const entries = await prisma.financialEntry.findMany({
    where: { status: { not: "CANCELLED" } },
  });
  const map = new Map<string, CashFlowBucket>();
  for (const e of entries) {
    const d = new Date(e.dueDate);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = map.get(month) ?? { month, receivable: 0, payable: 0, net: 0 };
    if (e.type === "RECEIVABLE") b.receivable += Number(e.amount);
    else b.payable += Number(e.amount);
    b.net = b.receivable - b.payable;
    map.set(month, b);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

// ── Custos: orçado (BOM) × receita ──────────────────────────────

export async function orderCosting(orderId: string) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Pedido não encontrado.");

  let materialCost = 0;
  for (const item of order.items) {
    if (!item.productId) continue;
    const exp = await explodeBom(item.productId, item.quantity);
    materialCost += exp.totalCost;
  }
  const revenue = Number(order.total);
  const margin = revenue - materialCost;
  const marginPct = revenue > 0 ? margin / revenue : 0;
  return { revenue, materialCost, margin, marginPct };
}

// ── Regra de bloqueio (inadimplência) ───────────────────────────

export async function creditStatus(customerId: string) {
  const receivables = await prisma.financialEntry.findMany({
    where: { customerId, type: "RECEIVABLE", status: "OPEN" },
  });
  const overdue = receivables.filter((e) => isOverdue(e));
  const overdueAmount = overdue.reduce((s, e) => s + Number(e.amount), 0);
  return { blocked: overdue.length > 0, overdueAmount, overdueCount: overdue.length };
}

// ── Logística / expedição ───────────────────────────────────────

export async function listShipments() {
  return prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: { salesOrder: { include: { customer: true } } },
  });
}

export async function createShipment(orderId: string) {
  const order = await prisma.salesOrder.findFirst({ where: { id: orderId } });
  if (!order) throw new Error("Pedido não encontrado.");

  // Regra de bloqueio: cliente inadimplente não expede.
  const credit = await creditStatus(order.customerId);
  if (credit.blocked) {
    throw new Error(
      `Expedição bloqueada: cliente com ${credit.overdueCount} título(s) vencido(s).`,
    );
  }

  const existing = await prisma.shipment.findFirst({ where: { salesOrderId: orderId } });
  if (existing) return existing;
  return prisma.shipment.create({ data: { salesOrderId: orderId, status: "PENDING" } as any });
}

export async function shipShipment(id: string, opts: { carrier?: string; trackingCode?: string }) {
  const shipment = await prisma.shipment.update({
    where: { id },
    data: {
      status: "SHIPPED",
      carrier: opts.carrier || null,
      trackingCode: opts.trackingCode || null,
      shippedAt: new Date(),
    },
  });
  await prisma.salesOrder.update({ where: { id: shipment.salesOrderId }, data: { status: "SHIPPED" } }).catch(() => {});
  return shipment;
}

export async function deliverShipment(id: string) {
  return prisma.shipment.update({
    where: { id },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
}
