import Link from "next/link";
import { notFound } from "next/navigation";
import { withSession } from "@/lib/session";
import { getPurchaseOrder } from "@/server/supply";
import { PageHeader, StatusChip, brl } from "@/components/ui";
import { sendPurchaseOrderAction, receivePurchaseOrderAction } from "@/app/app/supply/actions";

const TONE: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  SENT: "blue",
  RECEIVED: "green",
  CANCELLED: "red",
};

export default async function PurchaseDetail({ params }: { params: { id: string } }) {
  const po = await withSession(() => getPurchaseOrder(params.id), { permission: "purchase:read" });
  if (!po) notFound();

  const faccaoPath = `/faccao/${po.publicToken}`;

  return (
    <>
      <PageHeader
        title={po.number}
        subtitle={`${po.supplier.name} · ${po.supplier.kind === "FACCAO" ? "Facção" : "Material"}`}
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={po.status} tone={TONE[po.status]} />
            <Link href="/app/purchasing" className="btn-ghost">Voltar</Link>
          </div>
        }
      />
      <div className="p-4 sm:p-7 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-x-auto">
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
                  <td className="px-5 py-3">{i.material?.name ?? i.description}</td>
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

        <div className="space-y-6">
          <div className="card p-6 space-y-3">
            <h2 className="font-cormorant text-xl">Ações</h2>
            {po.status === "DRAFT" && (
              <form action={sendPurchaseOrderAction}>
                <input type="hidden" name="id" value={po.id} />
                <button className="btn-gold w-full justify-center">Enviar ao fornecedor</button>
              </form>
            )}
            {(po.status === "SENT" || po.status === "DRAFT") && (
              <form action={receivePurchaseOrderAction}>
                <input type="hidden" name="id" value={po.id} />
                <button className="btn-dark w-full justify-center">Receber (entrada no estoque)</button>
              </form>
            )}
            {po.status === "RECEIVED" && <p className="text-sm text-success">Recebido — estoque atualizado.</p>}
          </div>

          {po.supplier.kind === "FACCAO" && (
            <div className="card p-6">
              <h2 className="font-cormorant text-xl mb-2">Portal da facção</h2>
              <code className="block bg-osso rounded-[10px] px-3 py-2 text-xs break-all">{faccaoPath}</code>
              <Link href={faccaoPath} target="_blank" className="btn-ghost mt-3 w-full justify-center">
                Abrir portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
