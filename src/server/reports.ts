import { prisma } from "@/lib/prisma";
import { cashFlow } from "./finance";

/**
 * Relatórios (Fase 6): agregações para os dashboards/gráficos.
 */
export async function salesFunnel() {
  const [leads, opportunities, quotes] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.opportunity.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.quote.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    leads: leads.map((l) => ({ key: l.status, value: l._count._all })),
    opportunities: opportunities.map((o) => ({ key: o.stage, value: o._count._all })),
    quotes: quotes.map((q) => ({ key: q.status, value: q._count._all })),
  };
}

export async function productionThroughput() {
  const ops = await prisma.productionOrder.groupBy({ by: ["status"], _count: { _all: true } });
  return ops.map((o) => ({ key: o.status, value: o._count._all }));
}

export async function revenueByMonth() {
  return cashFlow();
}

export async function topCustomers(limit = 5) {
  const orders = await prisma.salesOrder.findMany({ include: { customer: true } });
  const map = new Map<string, { name: string; total: number }>();
  for (const o of orders) {
    const cur = map.get(o.customerId) ?? { name: o.customer.name, total: 0 };
    cur.total += Number(o.total);
    map.set(o.customerId, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
