import Link from "next/link";
import { withSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, brl } from "@/components/ui";

export default async function StudioDashboard() {
  const data = await withSession(
    async () => {
      const [projects, byStatus, quotes, orders, models, events] = await Promise.all([
        prisma.studioProject.count(),
        prisma.studioProject.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.studioProject.count({ where: { status: { in: ["QUOTE_GENERATED", "WAITING_TECHNICAL_REVIEW", "APPROVED", "CONVERTED_TO_ORDER"] } } }),
        prisma.studioProject.count({ where: { status: "CONVERTED_TO_ORDER" } }),
        prisma.shoeModel.count(),
        prisma.studioEvent.groupBy({ by: ["type"], _count: { _all: true } }),
      ]);
      const orderRows = await prisma.studioProject.findMany({
        where: { status: "CONVERTED_TO_ORDER", orderId: { not: null } },
      });
      const orderIds = orderRows.map((o) => o.orderId!).filter(Boolean);
      const orderTotals = orderIds.length
        ? await prisma.salesOrder.aggregate({ where: { id: { in: orderIds } }, _sum: { total: true }, _avg: { total: true } })
        : { _sum: { total: 0 }, _avg: { total: 0 } };
      return { projects, byStatus, quotes, orders, models, events, orderTotals };
    },
    { permission: "studio:read" },
  );

  const conv = data.projects > 0 ? Math.round((data.orders / data.projects) * 100) : 0;
  const cards = [
    { label: "Projetos", value: data.projects, href: "/app/fermo-studio/projetos" },
    { label: "Orçamentos gerados", value: data.quotes, href: "/app/fermo-studio/projetos" },
    { label: "Pedidos (convertidos)", value: data.orders, href: "/app/orders" },
    { label: "Conversão", value: `${conv}%` },
    { label: "Ticket médio", value: brl(Number(data.orderTotals._avg.total ?? 0)) },
    { label: "Modelos", value: data.models, href: "/app/fermo-studio/modelos" },
  ];

  return (
    <>
      <PageHeader title="Fermo Studio" subtitle="Funil de configuração → orçamento → pedido." />
      <div className="p-4 sm:p-7 space-y-7">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const inner = (
              <>
                <div className="text-muted text-xs uppercase tracking-wide">{c.label}</div>
                <div className="font-cormorant text-3xl text-ink mt-2">{c.value}</div>
              </>
            );
            return c.href ? (
              <Link key={c.label} href={c.href} className="card p-5 hover:border-gold transition-colors">{inner}</Link>
            ) : (
              <div key={c.label} className="card p-5">{inner}</div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="px-5 py-4 border-b border-line font-cormorant text-xl">Projetos por status</div>
            <ul className="divide-y divide-line text-sm">
              {data.byStatus.length === 0 && <li className="px-5 py-3 text-muted">Sem projetos ainda.</li>}
              {data.byStatus.map((s) => (
                <li key={s.status} className="px-5 py-2.5 flex justify-between">
                  <span className="text-muted">{s.status}</span>
                  <span className="font-medium">{s._count._all}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="px-5 py-4 border-b border-line font-cormorant text-xl">Atalhos</div>
            <div className="p-5 grid gap-2 text-sm">
              <Link href="/app/fermo-studio/modelos" className="text-sela hover:underline">Gerenciar modelos</Link>
              <Link href="/app/fermo-studio/opcoes" className="text-sela hover:underline">Materiais, solados, cadarços e personalizações</Link>
              <Link href="/app/fermo-studio/precificacao" className="text-sela hover:underline">Tabela de preço e faixas de volume</Link>
              <Link href="/studio" target="_blank" className="text-sela hover:underline">Abrir Studio (site público)</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
