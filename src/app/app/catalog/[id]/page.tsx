import Link from "next/link";
import { notFound } from "next/navigation";
import { withSession, getSession } from "@/lib/session";
import { getProduct, listMaterials, listProducts, explodeBom } from "@/server/catalog";
import { can } from "@/lib/rbac";
import { PageHeader, brl } from "@/components/ui";
import {
  createVariantAction,
  addBomItemAction,
  removeBomItemAction,
  createTechSheetVersionAction,
} from "../actions";

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  const data = await withSession(
    async () => {
      const product = await getProduct(params.id);
      if (!product) return null;
      const [materials, products, explosion] = await Promise.all([
        listMaterials(),
        listProducts(),
        explodeBom(params.id, 1),
      ]);
      return { product, materials, products, explosion };
    },
    { permission: "product:read" },
  );
  if (!data?.product) notFound();

  const { product, materials, products, explosion } = data;
  const writable = can(session, "product:write");
  const techSheet = product.techSheets[0];
  const currentVersion = techSheet?.versions.find((v) => v.version === techSheet.currentVersion);
  const otherProducts = products.filter((p) => p.id !== product.id);

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={`SKU ${product.sku} · ${brl(Number(product.basePrice))}`}
        action={
          <Link href="/app/catalog" className="btn-ghost">
            Voltar
          </Link>
        }
      />
      <div className="p-4 sm:p-7 grid lg:grid-cols-3 gap-6">
        {/* Coluna principal: BOM + Ficha técnica */}
        <div className="lg:col-span-2 space-y-6">
          {/* BOM */}
          <div className="card">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-cormorant text-xl">Lista de materiais (BOM)</h2>
              <span className="text-sm text-muted">
                Custo / par: <strong className="text-ink">{brl(explosion.totalCost)}</strong>
              </span>
            </div>
            {product.bomItems.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Sem itens de BOM.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-5 py-3">Componente</th>
                      <th className="text-left px-5 py-3">Tipo</th>
                      <th className="text-right px-5 py-3">Qtd</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {product.bomItems.map((b) => (
                      <tr key={b.id}>
                        <td className="px-5 py-3">
                          {b.type === "MATERIAL"
                            ? b.componentMaterial?.name
                            : `↳ ${b.componentProduct?.name} (submontagem)`}
                        </td>
                        <td className="px-5 py-3 text-muted">{b.type === "MATERIAL" ? "Material" : "Produto"}</td>
                        <td className="px-5 py-3 text-right">
                          {Number(b.quantity)} {b.unit}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {writable && (
                            <form action={removeBomItemAction}>
                              <input type="hidden" name="id" value={b.id} />
                              <input type="hidden" name="productId" value={product.id} />
                              <button className="text-danger hover:underline text-xs">remover</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Explosão de materiais (rollup multinível) */}
            {explosion.materials.length > 0 && (
              <div className="px-5 py-4 border-t border-line">
                <h3 className="label">Necessidade de materiais (explodida)</h3>
                <ul className="text-sm space-y-1 mt-2">
                  {explosion.materials.map((m) => (
                    <li key={m.materialId} className="flex justify-between text-muted">
                      <span>
                        {m.name} — {m.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} {m.unit}
                      </span>
                      <span>{brl(m.totalCost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {writable && (materials.length > 0 || otherProducts.length > 0) && (
              <details className="px-5 py-4 border-t border-line">
                <summary className="cursor-pointer text-sm text-sela">+ Adicionar item à BOM</summary>
                <form action={addBomItemAction} className="mt-3 grid sm:grid-cols-2 gap-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <div className="sm:col-span-2">
                    <label className="label">Tipo</label>
                    <select name="type" className="input" defaultValue="MATERIAL">
                      <option value="MATERIAL">Material</option>
                      <option value="PRODUCT">Produto (submontagem)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Material</label>
                    <select name="componentMaterialId" className="input">
                      <option value="">—</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Ou produto</label>
                    <select name="componentProductId" className="input">
                      <option value="">—</option>
                      {otherProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quantidade</label>
                    <input name="quantity" type="number" step="0.0001" min="0" className="input" defaultValue={1} />
                  </div>
                  <div>
                    <label className="label">Unidade</label>
                    <input name="unit" className="input" defaultValue="un" />
                  </div>
                  <div className="sm:col-span-2">
                    <button className="btn-gold">Adicionar</button>
                    <span className="text-xs text-muted ml-3">
                      Preencha apenas o campo correspondente ao tipo escolhido.
                    </span>
                  </div>
                </form>
              </details>
            )}
          </div>

          {/* Ficha técnica */}
          <div className="card">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-cormorant text-xl">Ficha técnica</h2>
              {techSheet && (
                <span className="chip bg-gold/15 text-sela">v{techSheet.currentVersion}</span>
              )}
            </div>
            <div className="px-5 py-4">
              {currentVersion ? (
                <div className="space-y-3 text-sm">
                  {currentVersion.title && <p className="font-medium">{currentVersion.title}</p>}
                  {(() => {
                    const content = currentVersion.content as {
                      specs?: Record<string, string>;
                      steps?: string[];
                      observations?: string;
                    };
                    return (
                      <>
                        {content.specs && Object.keys(content.specs).length > 0 && (
                          <dl className="grid sm:grid-cols-2 gap-2">
                            {Object.entries(content.specs).map(([k, v]) => (
                              <div key={k} className="flex justify-between border-b border-line/60 py-1">
                                <dt className="text-muted">{k}</dt>
                                <dd>{v}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {content.steps && content.steps.length > 0 && (
                          <div>
                            <span className="label">Roteiro</span>
                            <ol className="list-decimal list-inside text-muted">
                              {content.steps.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {content.observations && (
                          <p className="text-muted">{content.observations}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted">Nenhuma versão de ficha técnica ainda.</p>
              )}

              {techSheet && techSheet.versions.length > 1 && (
                <p className="text-xs text-muted mt-3">
                  Histórico: {techSheet.versions.map((v) => `v${v.version}`).join(", ")}
                </p>
              )}
            </div>

            {writable && (
              <details className="px-5 py-4 border-t border-line">
                <summary className="cursor-pointer text-sm text-sela">+ Nova versão da ficha</summary>
                <form action={createTechSheetVersionAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <div>
                    <label className="label">Título</label>
                    <input name="title" className="input" placeholder="Revisão de forma" />
                  </div>
                  <div>
                    <label className="label">Especificações (uma por linha: Chave: valor)</label>
                    <textarea name="specs" rows={3} className="input" placeholder={"Forma: AB-12\nSalto: 3cm"} />
                  </div>
                  <div>
                    <label className="label">Roteiro (uma etapa por linha)</label>
                    <textarea name="steps" rows={3} className="input" placeholder={"Corte\nPesponto\nMontagem"} />
                  </div>
                  <div>
                    <label className="label">Observações</label>
                    <textarea name="observations" rows={2} className="input" />
                  </div>
                  <div>
                    <button className="btn-gold">Salvar nova versão</button>
                  </div>
                </form>
              </details>
            )}
          </div>
        </div>

        {/* Coluna lateral: variantes */}
        <div className="space-y-6">
          <div className="card">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-cormorant text-xl">Variantes</h2>
            </div>
            <ul className="divide-y divide-line">
              {product.variants.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted">Sem variantes.</li>
              )}
              {product.variants.map((v) => (
                <li key={v.id} className="px-5 py-3">
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-muted font-mono">{v.sku}</div>
                </li>
              ))}
            </ul>
            {writable && (
              <details className="px-5 py-4 border-t border-line">
                <summary className="cursor-pointer text-sm text-sela">+ Nova variante</summary>
                <form action={createVariantAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <div>
                    <label className="label">SKU</label>
                    <input name="sku" required className="input" placeholder={`${product.sku}-PRETO`} />
                  </div>
                  <div>
                    <label className="label">Nome</label>
                    <input name="name" required className="input" placeholder="Preto / Couro liso" />
                  </div>
                  <div>
                    <label className="label">Cor</label>
                    <input name="color" className="input" placeholder="Preto" />
                  </div>
                  <button className="btn-gold">Adicionar variante</button>
                </form>
              </details>
            )}
          </div>

          {product.sizeGrid && (
            <div className="card p-5">
              <h2 className="font-cormorant text-xl mb-2">Grade</h2>
              <p className="text-sm text-muted">{product.sizeGrid.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.sizeGrid.sizes.map((s) => (
                  <span key={s} className="chip bg-osso text-muted">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
