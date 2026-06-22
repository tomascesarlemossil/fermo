import Link from "next/link";
import { withSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatusChip, EmptyState, brl } from "@/components/ui";

export default async function StudioModelsAdmin() {
  const models = await withSession(
    () => prisma.shoeModel.findMany({ orderBy: { createdAt: "asc" }, include: { category: true } }),
    { permission: "studio:read" },
  );

  return (
    <>
      <PageHeader
        title="Modelos do Studio"
        subtitle="Catálogo configurável. Upload de GLB e mapeamento de malhas: ver docs/fermo-studio/THREE_D_ASSETS.md."
        action={
          <Link href="/studio/modelos" target="_blank" className="btn-ghost">Ver no site</Link>
        }
      />
      <div className="p-4 sm:p-7">
        {models.length === 0 ? (
          <EmptyState>Nenhum modelo. Rode o seed para popular o catálogo demonstrativo.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Modelo</th>
                  <th className="text-left px-5 py-3">Categoria</th>
                  <th className="text-right px-5 py-3">Preço base</th>
                  <th className="text-right px-5 py-3">Mín.</th>
                  <th className="text-right px-5 py-3">Prazo</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">3D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3">
                      <Link href={`/studio/configurador/${m.slug}`} target="_blank" className="font-medium hover:text-sela">{m.name}</Link>
                      <div className="text-xs text-muted font-mono">{m.slug}</div>
                    </td>
                    <td className="px-5 py-3 text-muted">{m.category?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-right">{brl(Number(m.basePrice))}</td>
                    <td className="px-5 py-3 text-right">{m.minQty}</td>
                    <td className="px-5 py-3 text-right">{m.leadTimeDays}d</td>
                    <td className="px-5 py-3"><StatusChip label={m.status} tone={m.status === "PUBLISHED" ? "green" : "gray"} /></td>
                    <td className="px-5 py-3">{m.isDemo ? <StatusChip label="DEMO" tone="gold" /> : "real"}</td>
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
