import Link from "next/link";
import { withSession } from "@/lib/session";
import { detectAnomalies, suggestQuotePrice } from "@/server/intelligence";
import { listProducts } from "@/server/catalog";
import { PageHeader, StatusChip, brl } from "@/components/ui";

const TONE: Record<string, "gray" | "gold" | "red" | "green"> = {
  info: "green",
  warn: "gold",
  critical: "red",
};

export default async function InsightsPage() {
  const { insights, suggestions } = await withSession(
    async () => {
      const products = await listProducts();
      const suggestions = await Promise.all(
        products.slice(0, 12).map((p) => suggestQuotePrice(p.id).catch(() => null)),
      );
      return { insights: await detectAnomalies(), suggestions: suggestions.filter(Boolean) };
    },
    { permission: "report:read" },
  );

  return (
    <>
      <PageHeader
        title="Assistente (IA)"
        subtitle="Estimativas e detecção de anomalias — heurísticas locais."
      />
      <div className="p-4 sm:p-7 grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-cormorant text-xl">Anomalias & alertas</h2>
          </div>
          <ul className="divide-y divide-line">
            {insights.map((i, idx) => (
              <li key={idx} className="px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <StatusChip label={i.category} tone={TONE[i.severity]} />
                  <p className="text-sm mt-1.5">{i.message}</p>
                </div>
                {i.link && (
                  <Link href={i.link} className="text-sela hover:underline text-xs whitespace-nowrap">
                    abrir
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-cormorant text-xl">Estimativa de preço (BOM × markup)</h2>
          </div>
          {suggestions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">
              Cadastre produtos com BOM para gerar estimativas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Produto</th>
                    <th className="text-right px-5 py-3">Custo</th>
                    <th className="text-right px-5 py-3">Sugerido</th>
                    <th className="text-right px-5 py-3">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {suggestions.map((s) => (
                    <tr key={s!.productId}>
                      <td className="px-5 py-3">{s!.name}</td>
                      <td className="px-5 py-3 text-right text-muted">{brl(s!.materialCost)}</td>
                      <td className="px-5 py-3 text-right font-medium">{brl(s!.suggestedUnitPrice)}</td>
                      <td className="px-5 py-3 text-right">{(s!.marginPct * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
