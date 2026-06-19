import Link from "next/link";
import { notFound } from "next/navigation";
import { withSession, getSession } from "@/lib/session";
import { getOrder } from "@/server/orders";
import { orderCosting, creditStatus } from "@/server/finance";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader, StatusChip, brl } from "@/components/ui";
import {
  issueInvoiceAction,
  generateCommissionAction,
  createShipmentAction,
} from "@/app/app/finance/actions";

export default async function OrderDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  const data = await withSession(
    async () => {
      const order = await getOrder(params.id);
      if (!order) return null;
      const [costing, credit, invoice, shipment] = await Promise.all([
        orderCosting(order.id),
        creditStatus(order.customerId),
        prisma.invoice.findFirst({ where: { salesOrderId: order.id } }),
        prisma.shipment.findFirst({ where: { salesOrderId: order.id } }),
      ]);
      return { order, costing, credit, invoice, shipment };
    },
    { permission: "order:read" },
  );
  if (!data?.order) notFound();
  const { order, costing, credit, invoice, shipment } = data;
  const canFinance = can(session, "finance:write");
  const canShip = can(session, "shipping:write");

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
          {credit.blocked && (
            <div className="card p-4 border-danger bg-dangerbg">
              <p className="text-danger text-sm font-medium">
                Cliente inadimplente: {credit.overdueCount} título(s) vencido(s) ({brl(credit.overdueAmount)}).
                Expedição bloqueada.
              </p>
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-cormorant text-xl mb-3">Custos (orçado × receita)</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted">Receita</dt>
                <dd>{brl(costing.revenue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Custo material (BOM)</dt>
                <dd>{brl(costing.materialCost)}</dd>
              </div>
              <div className="flex justify-between font-medium border-t border-line pt-1">
                <dt>Margem</dt>
                <dd className={costing.margin >= 0 ? "text-success" : "text-danger"}>
                  {brl(costing.margin)} ({(costing.marginPct * 100).toFixed(0)}%)
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-cormorant text-xl">Faturamento & expedição</h2>
            {invoice ? (
              <p className="text-sm text-success">NF emitida: <span className="font-mono">{invoice.number}</span></p>
            ) : (
              canFinance && (
                <form action={issueInvoiceAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="btn-gold w-full justify-center">Emitir NF (gera a receber)</button>
                </form>
              )
            )}
            {canFinance && (
              <form action={generateCommissionAction} className="flex items-end gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="rate" value="0.05" />
                <button className="btn-ghost w-full justify-center text-sm">Gerar comissão (5%)</button>
              </form>
            )}
            {shipment ? (
              <p className="text-sm">
                Expedição: <StatusChip label={shipment.status} tone="blue" />
              </p>
            ) : (
              canShip && (
                <form action={createShipmentAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="btn-dark w-full justify-center">Gerar expedição</button>
                </form>
              )
            )}
          </div>

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
