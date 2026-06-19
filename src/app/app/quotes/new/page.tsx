import Link from "next/link";
import { withSession } from "@/lib/session";
import { listCustomers } from "@/server/crm";
import { listProducts } from "@/server/catalog";
import { PageHeader, EmptyState } from "@/components/ui";
import { QuoteForm } from "./QuoteForm";

export default async function NewQuotePage() {
  const { customers, products } = await withSession(
    async () => ({ customers: await listCustomers(), products: await listProducts() }),
    { permission: "quote:write" },
  );

  return (
    <>
      <PageHeader
        title="Novo orçamento"
        subtitle="Cálculo básico e versão inicial."
        action={
          <Link href="/app/quotes" className="btn-ghost">
            Cancelar
          </Link>
        }
      />
      <div className="p-4 sm:p-7">
        {customers.length === 0 ? (
          <EmptyState>
            Você precisa de um cliente. Converta um lead em{" "}
            <Link href="/app/crm/leads" className="text-sela underline">
              Leads
            </Link>
            .
          </EmptyState>
        ) : (
          <QuoteForm
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            products={products.map((p) => ({ id: p.id, name: p.name, basePrice: Number(p.basePrice) }))}
          />
        )}
      </div>
    </>
  );
}
