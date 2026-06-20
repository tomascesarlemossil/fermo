import { notFound } from "next/navigation";
import { getPurchaseOrderByToken } from "@/server/supply";
import { brl } from "@/components/ui";
import { faccaoUpdateAction } from "./actions";

export default async function FaccaoPortal({ params }: { params: { token: string } }) {
  const po = await getPurchaseOrderByToken(params.token);
  if (!po) notFound();

  const done = po.status === "RECEIVED";

  return (
    <main className="min-h-screen bg-osso">
      <header className="bg-espresso text-osso">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.png" alt="Fermo" width={36} height={36} className="rounded-full" />
          <span className="font-cinzel tracking-widest">{po.tenant?.name ?? "FERMO"}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-12">
        <p className="font-cinzel tracking-[0.2em] text-sela text-xs mb-2">PORTAL DA FACÇÃO</p>
        <h1 className="font-cormorant text-4xl text-ink">Pedido {po.number}</h1>
        <p className="text-muted mt-1">Para {po.supplier.name}</p>

        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Item</th>
                <th className="text-right px-5 py-3">Qtd</th>
                <th className="text-right px-5 py-3">Custo un.</th>
                <th className="text-right px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {po.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3">{i.description}</td>
                  <td className="px-5 py-3 text-right">{Number(i.quantity)}</td>
                  <td className="px-5 py-3 text-right">{brl(Number(i.unitCost))}</td>
                  <td className="px-5 py-3 text-right">{brl(Number(i.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-line flex justify-between font-cormorant text-2xl">
            <span>Total</span>
            <span>{brl(Number(po.total))}</span>
          </div>
        </div>

        <div className="mt-8">
          {done ? (
            <div className="card p-6 text-center text-success font-cormorant text-2xl">
              Pedido concluído. Obrigado!
            </div>
          ) : (
            <div className="card p-6">
              <p className="text-muted text-sm mb-4">Atualize o andamento deste pedido:</p>
              <form action={faccaoUpdateAction} className="flex gap-3">
                <input type="hidden" name="token" value={params.token} />
                <button name="status" value="SENT" className="btn-ghost flex-1 justify-center">
                  Confirmar recebimento do pedido
                </button>
                <button name="status" value="RECEIVED" className="btn-gold flex-1 justify-center">
                  Marcar como produzido/entregue
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
