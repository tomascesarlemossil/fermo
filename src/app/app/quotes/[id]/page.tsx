import Link from "next/link";
import { notFound } from "next/navigation";
import { withSession } from "@/lib/session";
import { getSession } from "@/lib/session";
import { getQuote } from "@/server/quotes";
import { can } from "@/lib/rbac";
import { PageHeader, StatusChip, brl } from "@/components/ui";
import { sendQuoteAction, decideQuoteAction } from "@/app/app/actions";

const TONE: Record<string, "gray" | "blue" | "gold" | "green" | "red"> = {
  DRAFT: "gray",
  SENT: "blue",
  APPROVED: "green",
  REJECTED: "red",
  EXPIRED: "gray",
};

export default async function QuoteDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  const quote = await withSession(() => getQuote(params.id), { permission: "quote:read" });
  if (!quote) notFound();

  const latest = quote.versions[0];
  const portalPath = `/portal/${quote.publicToken}`;

  return (
    <>
      <PageHeader
        title={quote.number}
        subtitle={quote.customer.name}
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={quote.status} tone={TONE[quote.status]} />
            <Link href="/app/quotes" className="btn-ghost">
              Voltar
            </Link>
          </div>
        }
      />
      <div className="p-7 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
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

          {quote.salesOrder && (
            <div className="card p-6">
              <h2 className="font-cormorant text-xl mb-2">Pedido gerado</h2>
              <p className="text-sm">
                <Link href={`/app/orders/${quote.salesOrder.id}`} className="text-sela hover:underline font-mono">
                  {quote.salesOrder.number}
                </Link>{" "}
                · {quote.salesOrder.productionOrders.length} ordem(ns) de produção
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-cormorant text-xl mb-3">Portal do cliente</h2>
            <p className="text-sm text-muted mb-3">
              Link público para o cliente aprovar ou recusar:
            </p>
            <code className="block bg-osso rounded-[10px] px-3 py-2 text-xs break-all">{portalPath}</code>
            <Link href={portalPath} target="_blank" className="btn-ghost mt-3 w-full justify-center">
              Abrir portal
            </Link>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-cormorant text-xl">Ações</h2>
            {quote.status === "DRAFT" && can(session, "quote:send") && (
              <form action={sendQuoteAction}>
                <input type="hidden" name="id" value={quote.id} />
                <button className="btn-gold w-full justify-center">Enviar ao cliente</button>
              </form>
            )}
            {quote.status === "SENT" && can(session, "quote:approve") && (
              <div className="space-y-2">
                <form action={decideQuoteAction}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="decision" value="APPROVED" />
                  <button className="btn-gold w-full justify-center">Aprovar (gera pedido)</button>
                </form>
                <form action={decideQuoteAction}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="decision" value="REJECTED" />
                  <button className="btn-danger w-full justify-center">Recusar</button>
                </form>
              </div>
            )}
            {quote.status === "APPROVED" && (
              <p className="text-sm text-success">Aprovado — pedido e OP gerados.</p>
            )}
            {quote.status === "REJECTED" && <p className="text-sm text-danger">Recusado.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
