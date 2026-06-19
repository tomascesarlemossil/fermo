import Link from "next/link";
import { withSession } from "@/lib/session";
import { runMrp } from "@/server/supply";
import { PageHeader, EmptyState } from "@/components/ui";

export default async function MrpPage() {
  const lines = await withSession(() => runMrp(), { permission: "purchase:read" });
  const toBuy = lines.filter((l) => l.net > 0);

  return (
    <>
      <PageHeader
        title="MRP"
        subtitle="Necessidade de materiais a partir da BOM dos pedidos ativos."
        action={
          <Link href="/app/purchasing/new" className="btn-gold">
            Gerar compra
          </Link>
        }
      />
      <div className="p-4 sm:p-7">
        {lines.length === 0 ? (
          <EmptyState>
            Sem demanda explodível. Vincule produtos (com BOM) aos itens de pedidos ativos.
          </EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Material</th>
                  <th className="text-right px-5 py-3">Necessidade</th>
                  <th className="text-right px-5 py-3">Disponível</th>
                  <th className="text-right px-5 py-3">A comprar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((l) => (
                  <tr key={l.materialId} className={l.net > 0 ? "bg-dangerbg/30" : ""}>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-muted">{l.code}</span> {l.name}
                    </td>
                    <td className="px-5 py-3 text-right">{l.gross} {l.unit}</td>
                    <td className="px-5 py-3 text-right text-muted">{l.available} {l.unit}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      {l.net > 0 ? `${l.net} ${l.unit}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {toBuy.length > 0 && (
              <p className="px-5 py-3 text-xs text-muted border-t border-line">
                {toBuy.length} material(is) com necessidade de compra.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
