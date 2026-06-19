import Link from "next/link";
import { notFound } from "next/navigation";
import { withSession } from "@/lib/session";
import { getOrder } from "@/server/orders";
import { PageHeader, StatusChip, brl } from "@/components/ui";

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const order = await withSession(() => getOrder(params.id), { permission: "order:read" });
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={order.number}
        subtitle={order.customer.name}
        action={
          <Link href="/app/orders" className="btn-ghost">
            Voltar
          </Link>
        }
      />
      <div className="p-4 sm:p-7 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-x-auto">
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
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3">{i.description}</td>
                  <td className="px-5 py-3 text-right">{i.quantity}</td>
                  <td className="px-5 py-3 text-right">{brl(Number(i.unitPrice))}</td>
                  <td className="px-5 py-3 text-right">{brl(Number(i.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-line flex justify-between font-cormorant text-2xl">
            <span>Total</span>
            <span>{brl(Number(order.total))}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-cormorant text-xl mb-3">Ordens de produção</h2>
            <ul className="space-y-2 text-sm">
              {order.productionOrders.map((op) => (
                <li key={op.id} className="flex items-center justify-between">
                  <span className="font-mono text-xs">{op.number}</span>
                  <StatusChip label={op.status} tone="gold" />
                </li>
              ))}
            </ul>
            <Link href="/app/production" className="btn-ghost mt-4 w-full justify-center">
              Ver no chão de fábrica
            </Link>
          </div>
          {order.quote && (
            <div className="card p-6">
              <h2 className="font-cormorant text-xl mb-2">Origem</h2>
              <Link href={`/app/quotes/${order.quote.id}`} className="text-sela hover:underline font-mono text-sm">
                {order.quote.number}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
