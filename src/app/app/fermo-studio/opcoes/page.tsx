import { withSession } from "@/lib/session";
import { listOptionsByGroup } from "@/server/studio/catalog";
import { PageHeader, brl } from "@/components/ui";

const GROUP_LABEL: Record<string, string> = {
  MATERIAL: "Materiais", COLOR: "Cores", SOLE: "Solados", LINING: "Forros", INSOLE: "Palmilhas",
  LACE: "Cadarços", EYELET: "Ilhós", PACKAGING: "Embalagem", FINISH: "Acabamentos", CUSTOMIZATION: "Personalizações",
};

function priceText(o: any) {
  if (o.priceType === "PERCENT") return `${(Number(o.price) * 100).toFixed(0)}%`;
  if (o.priceType === "FIXED_DEV") return `${brl(Number(o.price))} (dev)`;
  return brl(Number(o.price));
}

export default async function StudioOptionsAdmin() {
  const byGroup = await withSession(() => listOptionsByGroup(), { permission: "studio:read" });

  return (
    <>
      <PageHeader title="Opções do Studio" subtitle="Materiais, componentes e personalizações com preço." />
      <div className="p-4 sm:p-7 grid lg:grid-cols-2 gap-6">
        {Object.entries(byGroup).map(([group, list]) => (
          <div key={group} className="card">
            <div className="px-5 py-4 border-b border-line font-cormorant text-xl">{GROUP_LABEL[group] ?? group}</div>
            <ul className="divide-y divide-line text-sm">
              {(list as any[]).map((o) => (
                <li key={o.id} className="px-5 py-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {o.colorHex && <span className="w-4 h-4 rounded-full border border-line" style={{ background: o.colorHex }} />}
                    {o.name}
                    {o.minQty ? <span className="text-xs text-muted">· mín. {o.minQty}</span> : null}
                  </span>
                  <span className="text-muted">{priceText(o)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
