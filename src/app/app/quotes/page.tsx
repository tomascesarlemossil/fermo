import Link from "next/link";
import { withSession } from "@/lib/session";
import { listQuotes } from "@/server/quotes";
import { PageHeader, StatusChip, EmptyState, brl } from "@/components/ui";

const TONE: Record<string, "gray" | "blue" | "gold" | "green" | "red"> = {
  DRAFT: "gray",
  SENT: "blue",
  APPROVED: "green",
  REJECTED: "red",
  EXPIRED: "gray",
};

export default async function QuotesPage() {
  const quotes = await withSession(() => listQuotes(), { permission: "quote:read" });

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas comerciais e aprovação no portal."
        action={
          <Link href="/app/quotes/new" className="btn-gold">
            Novo orçamento
          </Link>
        }
      />
      <div className="p-4 sm:p-7">
        {quotes.length === 0 ? (
          <EmptyState>Nenhum orçamento ainda.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Número</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotes.map((q) => {
                  const total = q.items.reduce((s, i) => s + Number(i.lineTotal), 0);
                  return (
                    <tr key={q.id} className="hover:bg-osso/40">
                      <td className="px-5 py-3 font-mono text-xs">{q.number}</td>
                      <td className="px-5 py-3">{q.customer.name}</td>
                      <td className="px-5 py-3 text-right">{brl(total)}</td>
                      <td className="px-5 py-3">
                        <StatusChip label={q.status} tone={TONE[q.status]} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/app/quotes/${q.id}`} className="text-sela hover:underline">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
