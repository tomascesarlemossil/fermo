import { withSession } from "@/lib/session";
import { salesFunnel, productionThroughput, revenueByMonth, topCustomers } from "@/server/reports";
import { PageHeader, brl } from "@/components/ui";
import { SimpleBar, SimpleLine } from "@/components/Charts";

export default async function ReportsPage() {
  const data = await withSession(
    async () => ({
      funnel: await salesFunnel(),
      throughput: await productionThroughput(),
      revenue: await revenueByMonth(),
      top: await topCustomers(),
    }),
    { permission: "report:read" },
  );

  return (
    <>
      <PageHeader title="Relatórios & Análises" subtitle="Indicadores comerciais, produção e financeiro." />
      <div className="p-4 sm:p-7 grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-cormorant text-xl mb-3">Leads por status</h2>
          <SimpleBar data={data.funnel.leads} />
        </div>
        <div className="card p-5">
          <h2 className="font-cormorant text-xl mb-3">Orçamentos por status</h2>
          <SimpleBar data={data.funnel.quotes} color="#B26B2E" />
        </div>
        <div className="card p-5">
          <h2 className="font-cormorant text-xl mb-3">Produção por etapa</h2>
          <SimpleBar data={data.throughput} color="#3D6473" />
        </div>
        <div className="card p-5">
          <h2 className="font-cormorant text-xl mb-3">Fluxo de caixa (por mês)</h2>
          {data.revenue.length > 0 ? (
            <SimpleLine data={data.revenue} />
          ) : (
            <p className="text-muted text-sm">Sem lançamentos financeiros.</p>
          )}
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-cormorant text-xl mb-3">Maiores clientes</h2>
          {data.top.length === 0 ? (
            <p className="text-muted text-sm">Sem pedidos.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.top.map((c) => (
                <li key={c.name} className="flex justify-between py-2">
                  <span>{c.name}</span>
                  <span className="font-medium">{brl(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
