import Link from "next/link";
import { withSession } from "@/lib/session";
import { listInspections } from "@/server/mes";
import { PageHeader, StatusChip, EmptyState } from "@/components/ui";

const RESULT_TONE: Record<string, "green" | "gold" | "red"> = {
  PASS: "green",
  PARTIAL: "gold",
  FAIL: "red",
};

export default async function QualityPage() {
  const inspections = await withSession(() => listInspections(), { permission: "quality:read" });

  return (
    <>
      <PageHeader title="Qualidade" subtitle="Inspeções e defeitos por ordem de produção." />
      <div className="p-4 sm:p-7">
        {inspections.length === 0 ? (
          <EmptyState>Nenhuma inspeção registrada. Abra uma OP em Produção para inspecionar.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">OP</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Etapa</th>
                  <th className="text-right px-5 py-3">Aprov.</th>
                  <th className="text-right px-5 py-3">Reprov.</th>
                  <th className="text-left px-5 py-3">Resultado</th>
                  <th className="text-left px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {inspections.map((ins) => (
                  <tr key={ins.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3">
                      <Link href={`/app/production/${ins.productionOrderId}`} className="text-sela hover:underline font-mono text-xs">
                        {ins.productionOrder.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{ins.productionOrder.order.customer.name}</td>
                    <td className="px-5 py-3 text-muted">{ins.step?.sector ?? "OP inteira"}</td>
                    <td className="px-5 py-3 text-right">{ins.approvedQty}</td>
                    <td className="px-5 py-3 text-right">{ins.rejectedQty}</td>
                    <td className="px-5 py-3">
                      <StatusChip label={ins.result} tone={RESULT_TONE[ins.result]} />
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {new Date(ins.createdAt).toLocaleDateString("pt-BR")}
                    </td>
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
