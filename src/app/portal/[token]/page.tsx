import { notFound } from "next/navigation";
import { getQuoteByToken } from "@/server/quotes";
import { brl } from "@/components/ui";
import { portalDecideAction } from "./actions";

export default async function PortalPage({ params }: { params: { token: string } }) {
  const quote = await getQuoteByToken(params.token);
  if (!quote) notFound();

  const latest = quote.versions[0];
  const decided = quote.status === "APPROVED" || quote.status === "REJECTED";

  return (
    <main className="min-h-screen bg-osso">
      <header className="bg-espresso text-osso">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.png" alt="Fermo" width={36} height={36} className="rounded-full" />
          <span className="font-cinzel tracking-widest">{quote.tenant?.name ?? "FERMO"}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-12">
        <p className="font-cinzel tracking-[0.2em] text-sela text-xs mb-2">PROPOSTA COMERCIAL</p>
        <h1 className="font-cormorant text-4xl text-ink">Orçamento {quote.number}</h1>
        <p className="text-muted mt-1">Para {quote.customer.name}</p>

        <div className="card mt-8 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Item</th>
                <th className="text-right px-5 py-3">Qtd</th>
                <th className="text-right px-5 py-3">Unit.</th>
                <th className="text-right px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quote.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3">{i.description}</td>
                  <td className="px-5 py-3 text-right">{i.quantity}</td>
                  <td className="px-5 py-3 text-right">{brl(Number(i.unitPrice))}</td>
                  <td className="px-5 py-3 text-right">{brl(Number(i.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {latest && (
            <div className="px-5 py-4 border-t border-line text-sm space-y-1">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{brl(Number(latest.subtotal))}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Desconto</span>
                <span>− {brl(Number(latest.discount))}</span>
              </div>
              <div className="flex justify-between font-cormorant text-2xl pt-1">
                <span>Total</span>
                <span>{brl(Number(latest.total))}</span>
              </div>
            </div>
          )}
        </div>

        {latest?.notes && (
          <p className="text-muted text-sm mt-4">
            <strong className="text-ink">Observações:</strong> {latest.notes}
          </p>
        )}

        <div className="mt-8">
          {decided ? (
            <div className="card p-6 text-center">
              {quote.status === "APPROVED" ? (
                <p className="text-success font-cormorant text-2xl">Proposta aprovada. Obrigado!</p>
              ) : (
                <p className="text-danger font-cormorant text-2xl">Proposta recusada.</p>
              )}
            </div>
          ) : quote.status === "SENT" ? (
            <div className="card p-6">
              <p className="text-muted text-sm mb-4">
                Revise a proposta e registre sua decisão. A aprovação inicia a produção.
              </p>
              <form action={portalDecideAction} className="grid gap-3">
                <input type="hidden" name="token" value={params.token} />
                <input name="decidedBy" className="input" placeholder="Seu nome (opcional)" />
                <div className="flex gap-3">
                  <button name="decision" value="APPROVED" className="btn-gold flex-1 justify-center">
                    Aprovar proposta
                  </button>
                  <button name="decision" value="REJECTED" className="btn-danger flex-1 justify-center">
                    Recusar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card p-6 text-center text-muted">
              Esta proposta ainda não está disponível para decisão.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
