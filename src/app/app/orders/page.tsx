import Link from "next/link";
import { withSession } from "@/lib/session";
import { listOrders } from "@/server/orders";
import { PageHeader, StatusChip, EmptyState, brl } from "@/components/ui";

const TONE: Record<string, "gray" | "blue" | "gold" | "green" | "red"> = {
  CONFIRMED: "blue",
  IN_PRODUCTION: "gold",
  SHIPPED: "green",
  CANCELLED: "red",
};

export default async function OrdersPage() {
  const orders = await withSession(() => listOrders(), { permission: "order:read" });

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Gerados a partir de orçamentos aprovados." />
      <div className="p-4 sm:p-7">
        {orders.length === 0 ? (
          <EmptyState>Nenhum pedido ainda. Aprove um orçamento para gerar.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Número</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">OPs</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3 font-mono text-xs">{o.number}</td>
                    <td className="px-5 py-3">{o.customer.name}</td>
                    <td className="px-5 py-3 text-right">{brl(Number(o.total))}</td>
                    <td className="px-5 py-3">
                      <StatusChip label={o.status} tone={TONE[o.status]} />
                    </td>
                    <td className="px-5 py-3 text-muted">{o.productionOrders.length}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/app/orders/${o.id}`} className="text-sela hover:underline">
                        Abrir
                      </Link>
                    </td>
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
