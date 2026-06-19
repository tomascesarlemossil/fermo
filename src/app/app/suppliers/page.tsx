import { withSession, getSession } from "@/lib/session";
import { listSuppliers } from "@/server/supply";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, StatusChip } from "@/components/ui";
import { createSupplierAction } from "@/app/app/supply/actions";

export default async function SuppliersPage() {
  const session = await getSession();
  const suppliers = await withSession(() => listSuppliers(), { permission: "supplier:read" });
  const writable = can(session, "supplier:write");

  return (
    <>
      <PageHeader title="Fornecedores" subtitle="Materiais e facções (produção terceirizada)." />
      <div className="p-4 sm:p-7 space-y-6">
        {writable && (
          <details className="card p-5">
            <summary className="cursor-pointer font-cormorant text-xl">+ Novo fornecedor</summary>
            <form action={createSupplierAction} className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="label">Nome</label>
                <input name="name" required className="input" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select name="kind" className="input">
                  <option value="MATERIAL">Material</option>
                  <option value="FACCAO">Facção</option>
                </select>
              </div>
              <div>
                <label className="label">CNPJ</label>
                <input name="cnpj" className="input" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input name="email" type="email" className="input" />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input name="phone" className="input" />
              </div>
              <div className="flex items-end">
                <button className="btn-gold">Criar</button>
              </div>
            </form>
          </details>
        )}

        {suppliers.length === 0 ? (
          <EmptyState>Nenhum fornecedor cadastrado.</EmptyState>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-cormorant text-xl">{s.name}</h3>
                  <StatusChip label={s.kind === "FACCAO" ? "Facção" : "Material"} tone={s.kind === "FACCAO" ? "blue" : "gray"} />
                </div>
                <p className="text-muted text-sm mt-1">{s.email || "—"}</p>
                <p className="text-muted text-sm">{s.phone || ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
