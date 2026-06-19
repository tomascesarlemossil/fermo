import Link from "next/link";
import { withSession } from "@/lib/session";
import { listLeads } from "@/server/crm";
import { PageHeader, StatusChip, EmptyState } from "@/components/ui";

const TONE: Record<string, "gray" | "blue" | "gold" | "green" | "red"> = {
  NEW: "blue",
  CONTACTED: "gold",
  QUALIFIED: "gold",
  CONVERTED: "green",
  LOST: "red",
};
const LABEL: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  QUALIFIED: "Qualificado",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

export default async function LeadsPage() {
  const leads = await withSession(() => listLeads(), { permission: "lead:read" });

  return (
    <>
      <PageHeader title="Leads" subtitle="Captura do site e configurador." />
      <div className="p-4 sm:p-7">
        {leads.length === 0 ? (
          <EmptyState>Nenhum lead capturado ainda.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">Marca</th>
                  <th className="text-left px-5 py-3">Origem</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-osso/40">
                    <td className="px-5 py-3 font-medium">{l.name}</td>
                    <td className="px-5 py-3 text-muted">{l.company || "—"}</td>
                    <td className="px-5 py-3 text-muted">
                      {l.source}
                      {l.configRequest ? " · configurador" : ""}
                    </td>
                    <td className="px-5 py-3">
                      <StatusChip label={LABEL[l.status]} tone={TONE[l.status]} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/app/crm/leads/${l.id}`} className="text-sela hover:underline">
                        Abrir
                      </Link>
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
