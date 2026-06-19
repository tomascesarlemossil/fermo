import Link from "next/link";
import { withSession } from "@/lib/session";
import { listCustomers } from "@/server/crm";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function CustomersPage() {
  const customers = await withSession(() => listCustomers(), { permission: "customer:read" });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Marcas atendidas."
        action={
          <Link href="/app/quotes/new" className="btn-gold">
            Novo orçamento
          </Link>
        }
      />
      <div className="p-4 sm:p-7">
        {customers.length === 0 ? (
          <EmptyState>Nenhum cliente. Converta um lead para começar.</EmptyState>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div key={c.id} className="card p-5">
                <h3 className="font-cormorant text-xl">{c.name}</h3>
                <p className="text-muted text-sm mt-1">{c.email || "—"}</p>
                <p className="text-muted text-sm">{c.phone || ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
