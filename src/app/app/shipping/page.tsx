import Link from "next/link";
import { withSession } from "@/lib/session";
import { listShipments } from "@/server/finance";
import { PageHeader, StatusChip, EmptyState } from "@/components/ui";
import { shipShipmentAction, deliverShipmentAction } from "@/app/app/finance/actions";

const TONE: Record<string, "gray" | "blue" | "green"> = {
  PENDING: "gray",
  SHIPPED: "blue",
  DELIVERED: "green",
};

export default async function ShippingPage() {
  const shipments = await withSession(() => listShipments(), { permission: "shipping:read" });

  return (
    <>
      <PageHeader title="Expedição" subtitle="Envios e rastreamento. Crie o envio no detalhe do pedido." />
      <div className="p-4 sm:p-7">
        {shipments.length === 0 ? (
          <EmptyState>Nenhum envio. Gere a expedição a partir de um pedido.</EmptyState>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <div key={s.id} className="card p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Link href={`/app/orders/${s.salesOrderId}`} className="font-mono text-xs text-sela hover:underline">
                    {s.salesOrder.number}
                  </Link>
                  <div className="font-medium">{s.salesOrder.customer.name}</div>
                  {s.trackingCode && (
                    <div className="text-xs text-muted">
                      {s.carrier} · {s.trackingCode}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip label={s.status} tone={TONE[s.status]} />
                  {s.status === "PENDING" && (
                    <form action={shipShipmentAction} className="flex items-end gap-1.5">
                      <input type="hidden" name="id" value={s.id} />
                      <input name="carrier" placeholder="Transportadora" className="input py-1.5 w-36" />
                      <input name="trackingCode" placeholder="Rastreio" className="input py-1.5 w-32" />
                      <button className="btn-gold px-3 py-1.5 text-xs">Expedir</button>
                    </form>
                  )}
                  {s.status === "SHIPPED" && (
                    <form action={deliverShipmentAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn-ghost px-3 py-1.5 text-xs">Marcar entregue</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
