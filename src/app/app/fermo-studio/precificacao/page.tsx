import { withSession } from "@/lib/session";
import { getActivePriceProfile } from "@/server/studio/catalog";
import { PageHeader, EmptyState } from "@/components/ui";

const PARAM_LABEL: Record<string, string> = {
  wastePct: "Perdas", indirectPct: "Custos indiretos", marginPct: "Margem", taxPct: "Impostos",
  depositPct: "Sinal", validityDays: "Validade (dias)", development: "Desenvolvimento",
  modeling: "Modelagem", sampleCost: "Amostra", complexityPerColor: "Custo por cor",
  leadDevDays: "Prazo dev (dias)", leadSampleDays: "Prazo amostra (dias)", leadProductionDays: "Prazo produção (dias)",
};

function fmt(key: string, val: any) {
  if (typeof val === "number" && key.endsWith("Pct")) return `${(val * 100).toFixed(1)}%`;
  if (typeof val === "number" && ["development", "modeling", "sampleCost", "complexityPerColor"].includes(key))
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return String(val);
}

export default async function StudioPricingAdmin() {
  const active = await withSession(() => getActivePriceProfile(), { permission: "studio:read" });

  if (!active) {
    return (
      <>
        <PageHeader title="Precificação" subtitle="Tabela de preço do Studio." />
        <div className="p-4 sm:p-7"><EmptyState>Nenhum perfil de preço ativo. Rode o seed.</EmptyState></div>
      </>
    );
  }

  const params = active.version.params as Record<string, any>;

  return (
    <>
      <PageHeader
        title="Precificação"
        subtitle={`${active.profile.name} · versão ${active.version.version} (ativa). Versões preservam orçamentos já emitidos.`}
      />
      <div className="p-4 sm:p-7 grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-line font-cormorant text-xl">Parâmetros</div>
          <ul className="divide-y divide-line text-sm">
            {Object.entries(params).map(([k, v]) => (
              <li key={k} className="px-5 py-2.5 flex justify-between">
                <span className="text-muted">{PARAM_LABEL[k] ?? k}</span>
                <span className="font-medium">{fmt(k, v)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-line font-cormorant text-xl">Faixas de volume</div>
          <table className="w-full text-sm">
            <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
              <tr><th className="text-left px-5 py-3">Faixa (pares)</th><th className="text-right px-5 py-3">Desconto</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {active.version.tiers.map((t: any) => (
                <tr key={t.id}>
                  <td className="px-5 py-2.5">{t.minQty}{t.maxQty ? `–${t.maxQty}` : "+"}</td>
                  <td className="px-5 py-2.5 text-right">{(Number(t.discountPct) * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
