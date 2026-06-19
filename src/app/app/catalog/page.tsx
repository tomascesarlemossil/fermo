import Link from "next/link";
import { withSession, getSession } from "@/lib/session";
import { listProducts, listSizeGrids } from "@/server/catalog";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, brl } from "@/components/ui";
import { createProductAction } from "./actions";

export default async function CatalogPage() {
  const session = await getSession();
  const [products, grids] = await withSession(
    async () => Promise.all([listProducts(), listSizeGrids()]),
    { permission: "product:read" },
  );
  const writable = can(session, "product:write");

  return (
    <>
      <PageHeader title="Catálogo" subtitle="Produtos, variantes, ficha técnica e BOM." />
      <div className="p-4 sm:p-7 space-y-6">
        {writable && (
          <details className="card p-5">
            <summary className="cursor-pointer font-cormorant text-xl">+ Novo produto</summary>
            <form action={createProductAction} className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">SKU</label>
                <input name="sku" required className="input" placeholder="MOC-002" />
              </div>
              <div>
                <label className="label">Nome</label>
                <input name="name" required className="input" placeholder="Mocassim premium" />
              </div>
              <div>
                <label className="label">Preço base</label>
                <input name="basePrice" type="number" step="0.01" min="0" className="input" defaultValue={0} />
              </div>
              <div>
                <label className="label">Grade</label>
                <select name="sizeGridId" className="input">
                  <option value="">—</option>
                  {grids.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Descrição</label>
                <textarea name="description" rows={2} className="input" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-gold">Criar produto</button>
              </div>
            </form>
          </details>
        )}

        {products.length === 0 ? (
          <EmptyState>Nenhum produto no catálogo.</EmptyState>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Link key={p.id} href={`/app/catalog/${p.id}`} className="card p-5 hover:border-gold transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted">{p.sku}</span>
                  {!p.active && <span className="chip bg-osso text-muted">inativo</span>}
                </div>
                <h3 className="font-cormorant text-xl mt-1">{p.name}</h3>
                <p className="text-muted text-sm mt-1">{brl(Number(p.basePrice))}</p>
                <div className="flex gap-3 mt-3 text-xs text-muted">
                  <span>{p._count.variants} variante(s)</span>
                  <span>{p._count.bomItems} item(ns) BOM</span>
                  {p.sizeGrid && <span>{p.sizeGrid.name}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
