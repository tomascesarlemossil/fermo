import { prisma } from "@/lib/prisma";
import { explodeBom } from "./catalog";
import { isOverdue } from "./finance";

/**
 * Inteligência (Fase 6) — heurísticas locais (sem dependência de IA externa):
 * estimativa de preço a partir da BOM e detecção de anomalias operacionais.
 */

const DEFAULT_MARKUP = 2.5; // multiplicador sobre o custo de material
const MIN_MARGIN_PCT = 0.2; // alerta de margem baixa

/**
 * Sugere preço unitário para um produto a partir do custo de material (BOM):
 * preço = custo × markup. Considera também o basePrice como piso.
 */
export async function suggestQuotePrice(productId: string, markup = DEFAULT_MARKUP) {
  const product = await prisma.product.findFirst({ where: { id: productId } });
  if (!product) throw new Error("Produto não encontrado.");
  const exp = await explodeBom(productId, 1);
  const materialCost = exp.totalCost;
  const suggested = Math.max(Number(product.basePrice), Number((materialCost * markup).toFixed(2)));
  const margin = suggested > 0 ? (suggested - materialCost) / suggested : 0;
  return {
    productId,
    name: product.name,
    materialCost,
    markup,
    suggestedUnitPrice: suggested,
    marginPct: margin,
  };
}

export type Insight = {
  severity: "info" | "warn" | "critical";
  category: string;
  message: string;
  link?: string;
};

/**
 * Varre o estado operacional e retorna insights/anomalias:
 * - pedidos com margem abaixo do mínimo
 * - títulos a receber vencidos
 * - ordens de produção paradas (sem apontamento e não concluídas)
 */
export async function detectAnomalies(): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Margem baixa por pedido (usando BOM dos itens com produto)
  const orders = await prisma.salesOrder.findMany({
    where: { status: { in: ["CONFIRMED", "IN_PRODUCTION"] } },
    include: { items: true, customer: true },
  });
  for (const order of orders) {
    let materialCost = 0;
    for (const item of order.items) {
      if (!item.productId) continue;
      const exp = await explodeBom(item.productId, item.quantity);
      materialCost += exp.totalCost;
    }
    const revenue = Number(order.total);
    if (revenue > 0 && materialCost > 0) {
      const margin = (revenue - materialCost) / revenue;
      if (margin < MIN_MARGIN_PCT) {
        insights.push({
          severity: margin < 0 ? "critical" : "warn",
          category: "Margem",
          message: `Pedido ${order.number} (${order.customer.name}) com margem de ${(margin * 100).toFixed(0)}%.`,
          link: `/app/orders/${order.id}`,
        });
      }
    }
  }

  // Recebíveis vencidos
  const receivables = await prisma.financialEntry.findMany({
    where: { type: "RECEIVABLE", status: "OPEN" },
  });
  const overdue = receivables.filter((e) => isOverdue(e));
  if (overdue.length > 0) {
    const total = overdue.reduce((s, e) => s + Number(e.amount), 0);
    insights.push({
      severity: "critical",
      category: "Financeiro",
      message: `${overdue.length} título(s) a receber vencido(s), somando ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      link: "/app/finance",
    });
  }

  // OPs paradas (sem apontamento e não concluídas)
  const ops = await prisma.productionOrder.findMany({
    where: { status: { notIn: ["DONE"] } },
    include: { _count: { select: { events: true } } },
  });
  const stalled = ops.filter((o) => o._count.events === 0 && o.status !== "PLANNED");
  for (const o of stalled) {
    insights.push({
      severity: "warn",
      category: "Produção",
      message: `OP ${o.number} em ${o.status} sem apontamentos.`,
      link: `/app/production/${o.id}`,
    });
  }

  if (insights.length === 0) {
    insights.push({ severity: "info", category: "Tudo certo", message: "Nenhuma anomalia detectada." });
  }
  return insights;
}
