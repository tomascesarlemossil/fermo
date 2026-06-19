import { withSession, getSession } from "@/lib/session";
import { listStock } from "@/server/supply";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/ui";
import { adjustStockAction } from "@/app/app/supply/actions";

export default async function StockPage() {
  const session = await getSession();
  const stock = await withSession(() => listStock(), { permission: "stock:read" });
  const writable = can(session, "stock:write");

  return (
    <>
      <PageHeader title="Estoque" subtitle="Saldo de materiais e produtos acabados." />
      <div className="p-4 sm:p-7">
        {stock.length === 0 ? (
          <EmptyState>Sem saldo de estoque. Receba uma compra ou ajuste manualmente.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Item</th>
                  <th className="text-left px-5 py-3">Tipo</th>
                  <th className="text-right px-5 py-3">Saldo</th>
                  <th className="text-right px-5 py-3">Reservado</th>
                  <th className="text-right px-5 py-3">Disponível</th>
                  {writable && <th className="px-5 py-3">Ajuste</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stock.map((s) => (
                  <tr key={s.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-muted">{s.code}</span> {s.name}
                    </td>
                    <td className="px-5 py-3 text-muted">{s.refType === "MATERIAL" ? "Material" : "Acabado"}</td>
                    <td className="px-5 py-3 text-right">{s.quantity} {s.unit}</td>
                    <td className="px-5 py-3 text-right text-muted">{s.reserved}</td>
                    <td className="px-5 py-3 text-right font-medium">{s.available}</td>
                    {writable && (
                      <td className="px-5 py-3">
                        <form action={adjustStockAction} className="flex gap-1.5">
                          <input type="hidden" name="refType" value={s.refType} />
                          <input type="hidden" name="refId" value={s.refId} />
                          <input name="delta" type="number" step="0.0001" className="input w-24 py-1.5" placeholder="±" />
                          <button className="btn-ghost px-2 py-1.5 text-xs">OK</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
