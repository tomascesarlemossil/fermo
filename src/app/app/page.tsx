import Link from "next/link";
import { withSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, brl } from "@/components/ui";

async function loadStats() {
  return withSession(async () => {
    const [leads, quotes, openQuotes, orders, production, recentLeads, revenue] = await Promise.all([
      prisma.lead.count(),
      prisma.quote.count(),
      prisma.quote.count({ where: { status: "SENT" } }),
      prisma.salesOrder.count(),
      prisma.productionOrder.count({ where: { status: { not: "DONE" } } }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.salesOrder.aggregate({ _sum: { total: true } }),
    ]);
    return { leads, quotes, openQuotes, orders, production, recentLeads, revenue: revenue._sum.total ?? 0 };
  });
}

export default async function Painel() {
  const s = await loadStats();
  const cards = [
    { label: "Leads", value: s.leads, href: "/app/crm/leads" },
    { label: "Orçamentos", value: s.quotes, href: "/app/quotes" },
    { label: "Aguardando cliente", value: s.openQuotes, href: "/app/quotes" },
    { label: "Pedidos", value: s.orders, href: "/app/orders" },
    { label: "OPs em aberto", value: s.production, href: "/app/production" },
    { label: "Receita confirmada", value: brl(Number(s.revenue)), href: "/app/orders" },
  ];

  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral da operação comercial." />
      <div className="p-7 space-y-7">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="card p-5 hover:border-gold transition-colors">
              <div className="text-muted text-xs uppercase tracking-wide">{c.label}</div>
              <div className="font-cormorant text-3xl text-ink mt-2">{c.value}</div>
            </Link>
          ))}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-line font-cormorant text-xl">Leads recentes</div>
          {s.recentLeads.length === 0 ? (
            <p className="p-5 text-muted text-sm">Nenhum lead ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.recentLeads.map((l) => (
                <li key={l.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/app/crm/leads/${l.id}`} className="font-medium hover:text-sela">
                      {l.name}
                    </Link>
                    <span className="text-muted text-sm">{l.company ? ` · ${l.company}` : ""}</span>
                  </div>
                  <span className="text-xs text-muted">{l.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
