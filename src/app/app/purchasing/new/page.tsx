import Link from "next/link";
import { withSession } from "@/lib/session";
import { listSuppliers } from "@/server/supply";
import { listMaterials } from "@/server/catalog";
import { PageHeader, EmptyState } from "@/components/ui";
import { PurchaseForm } from "./PurchaseForm";

export default async function NewPurchasePage() {
  const { suppliers, materials } = await withSession(
    async () => ({ suppliers: await listSuppliers(), materials: await listMaterials() }),
    { permission: "purchase:write" },
  );

  return (
    <>
      <PageHeader
        title="Novo pedido de compra"
        action={
          <Link href="/app/purchasing" className="btn-ghost">
            Cancelar
          </Link>
        }
      />
      <div className="p-4 sm:p-7">
        {suppliers.length === 0 ? (
          <EmptyState>
            Cadastre um fornecedor primeiro em{" "}
            <Link href="/app/suppliers" className="text-sela underline">
              Fornecedores
            </Link>
            .
          </EmptyState>
        ) : (
          <PurchaseForm
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            materials={materials.map((m) => ({ id: m.id, name: m.name, unit: m.unit, costPerUnit: Number(m.costPerUnit) }))}
          />
        )}
      </div>
    </>
  );
}
