import { withSession, getSession } from "@/lib/session";
import { listMaterials } from "@/server/catalog";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, brl } from "@/components/ui";
import { createMaterialAction } from "@/app/app/catalog/actions";

export default async function MaterialsPage() {
  const session = await getSession();
  const materials = await withSession(() => listMaterials(), { permission: "material:read" });
  const writable = can(session, "material:write");

  return (
    <>
      <PageHeader title="Materiais" subtitle="Insumos usados nas fichas técnicas e na BOM." />
      <div className="p-4 sm:p-7 space-y-6">
        {writable && (
          <details className="card p-5">
            <summary className="cursor-pointer font-cormorant text-xl">+ Novo material</summary>
            <form action={createMaterialAction} className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="label">Código</label>
                <input name="code" required className="input" placeholder="COURO-LISO" />
              </div>
              <div>
                <label className="label">Nome</label>
                <input name="name" required className="input" placeholder="Couro liso" />
              </div>
              <div>
                <label className="label">Categoria</label>
                <input name="category" className="input" placeholder="couro" />
              </div>
              <div>
                <label className="label">Unidade</label>
                <input name="unit" className="input" defaultValue="un" placeholder="m2, par, kg…" />
              </div>
              <div>
                <label className="label">Custo / unidade</label>
                <input name="costPerUnit" type="number" step="0.0001" min="0" className="input" defaultValue={0} />
              </div>
              <div className="flex items-end">
                <button className="btn-gold">Criar material</button>
              </div>
            </form>
          </details>
        )}

        {materials.length === 0 ? (
          <EmptyState>Nenhum material cadastrado.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Código</th>
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">Categoria</th>
                  <th className="text-left px-5 py-3">Unid.</th>
                  <th className="text-right px-5 py-3">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3 font-mono text-xs">{m.code}</td>
                    <td className="px-5 py-3">{m.name}</td>
                    <td className="px-5 py-3 text-muted">{m.category || "—"}</td>
                    <td className="px-5 py-3 text-muted">{m.unit}</td>
                    <td className="px-5 py-3 text-right">{brl(Number(m.costPerUnit))}</td>
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
