import Link from "next/link";
import { withSession } from "@/lib/session";
import { listInvoices } from "@/server/finance";
import { PageHeader, StatusChip, EmptyState, brl } from "@/components/ui";

export default async function InvoicesPage() {
  const invoices = await withSession(() => listInvoices(), { permission: "finance:read" });

  return (
    <>
      <PageHeader title="Faturamento" subtitle="Notas fiscais emitidas. Emita a NF no detalhe do pedido." />
      <div className="p-4 sm:p-7">
        {invoices.length === 0 ? (
          <EmptyState>Nenhuma NF emitida ainda.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">NF</th>
                  <th className="text-left px-5 py-3">Pedido</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Emissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3 font-mono text-xs">{inv.number}</td>
                    <td className="px-5 py-3">
                      <Link href={`/app/orders/${inv.salesOrderId}`} className="text-sela hover:underline font-mono text-xs">
                        {inv.salesOrder.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{inv.salesOrder.customer.name}</td>
                    <td className="px-5 py-3 text-right">{brl(Number(inv.total))}</td>
                    <td className="px-5 py-3">
                      <StatusChip label={inv.status} tone={inv.status === "ISSUED" ? "green" : "red"} />
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">{new Date(inv.issuedAt).toLocaleDateString("pt-BR")}</td>
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
