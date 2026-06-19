import Link from "next/link";
import { notFound } from "next/navigation";
import { withSession } from "@/lib/session";
import { getLead } from "@/server/crm";
import { PageHeader, StatusChip } from "@/components/ui";
import { setLeadStatusAction, convertLeadAction } from "@/app/app/actions";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

export default async function LeadDetail({ params }: { params: { id: string } }) {
  const lead = await withSession(() => getLead(params.id), { permission: "lead:read" });
  if (!lead) notFound();

  const config = lead.configRequest?.payload as Record<string, unknown> | undefined;

  return (
    <>
      <PageHeader
        title={lead.name}
        subtitle={lead.company || "Lead"}
        action={
          <Link href="/app/crm/leads" className="btn-ghost">
            Voltar
          </Link>
        }
      />
      <div className="p-7 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-cormorant text-xl mb-4">Contato</h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="label">E-mail</dt>
                <dd>{lead.email || "—"}</dd>
              </div>
              <div>
                <dt className="label">Telefone</dt>
                <dd>{lead.phone || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="label">Mensagem</dt>
                <dd className="text-muted">{lead.message || "—"}</dd>
              </div>
            </dl>
          </div>

          {config && (
            <div className="card p-6">
              <h2 className="font-cormorant text-xl mb-4">Configuração (configurador)</h2>
              <p className="text-sm text-muted">{String(config.summary ?? JSON.stringify(config))}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-cormorant text-xl mb-3">Status</h2>
            <div className="mb-4">
              <StatusChip label={lead.status} tone="gold" />
            </div>
            <form action={setLeadStatusAction} className="flex gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <select name="status" defaultValue={lead.status} className="input">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button className="btn-ghost">Salvar</button>
            </form>
          </div>

          <div className="card p-6">
            <h2 className="font-cormorant text-xl mb-3">Converter</h2>
            {lead.customerId ? (
              <p className="text-sm text-muted">
                Já convertido.{" "}
                <Link href="/app/quotes/new" className="text-sela hover:underline">
                  Criar orçamento
                </Link>
              </p>
            ) : (
              <form action={convertLeadAction}>
                <input type="hidden" name="id" value={lead.id} />
                <p className="text-sm text-muted mb-3">
                  Cria um cliente e uma oportunidade a partir deste lead.
                </p>
                <button className="btn-gold w-full justify-center">Converter em cliente</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
