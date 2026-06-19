import Link from "next/link";
import { withSession } from "@/lib/session";
import { listPurchaseOrders } from "@/server/supply";
import { PageHeader, StatusChip, EmptyState, brl } from "@/components/ui";

const TONE: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  SENT: "blue",
  RECEIVED: "green",
  CANCELLED: "red",
};

export default async function PurchasingPage() {
  const pos = await withSession(() => listPurchaseOrders(), { permission: "purchase:read" });

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle="Pedidos de compra e recebimento."
        action={
          <Link href="/app/purchasing/new" className="btn-gold">
            Novo pedido
          </Link>
        }
      />
      <div className="p-4 sm:p-7">
        {pos.length === 0 ? (
          <EmptyState>Nenhum pedido de compra ainda.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Número</th>
                  <th className="text-left px-5 py-3">Fornecedor</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3 font-mono text-xs">{po.number}</td>
                    <td className="px-5 py-3">{po.supplier.name}</td>
                    <td className="px-5 py-3 text-right">{brl(Number(po.total))}</td>
                    <td className="px-5 py-3">
                      <StatusChip label={po.status} tone={TONE[po.status]} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/app/purchasing/${po.id}`} className="text-sela hover:underline">
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
