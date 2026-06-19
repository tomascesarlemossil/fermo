import { withSession, getSession } from "@/lib/session";
import { listRules, TRIGGERS } from "@/server/automations";
import { can } from "@/lib/rbac";
import { PageHeader, StatusChip, EmptyState } from "@/components/ui";
import { createRuleAction, toggleRuleAction } from "./actions";

const TRIGGER_LABEL: Record<string, string> = {
  "lead.created": "Novo lead",
  "quote.approved": "Orçamento aprovado",
  "order.created": "Pedido criado",
};

export default async function AutomationsPage() {
  const session = await getSession();
  const rules = await withSession(() => listRules(), { permission: "automation:read" });
  const writable = can(session, "automation:write");

  return (
    <>
      <PageHeader title="Automações" subtitle="Regras configuráveis: ao acontecer um evento, dispara uma ação." />
      <div className="p-4 sm:p-7 space-y-6">
        {writable && (
          <details className="card p-5">
            <summary className="cursor-pointer font-cormorant text-xl">+ Nova automação</summary>
            <form action={createRuleAction} className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Nome</label>
                <input name="name" required className="input" placeholder="Avisar novo lead" />
              </div>
              <div>
                <label className="label">Gatilho</label>
                <select name="trigger" className="input">
                  {TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Título da notificação</label>
                <input name="title" required className="input" placeholder="Lead: {name}" />
              </div>
              <div>
                <label className="label">Texto (opcional)</label>
                <input name="body" className="input" placeholder="Empresa {company}" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-gold">Criar automação</button>
                <span className="text-xs text-muted ml-3">
                  Use {"{name}"}, {"{company}"}, {"{number}"} como variáveis.
                </span>
              </div>
            </form>
          </details>
        )}

        {rules.length === 0 ? (
          <EmptyState>Nenhuma automação configurada.</EmptyState>
        ) : (
          <div className="card divide-y divide-line">
            {rules.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    {TRIGGER_LABEL[r.trigger] ?? r.trigger} → notificar
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip label={r.active ? "Ativa" : "Inativa"} tone={r.active ? "green" : "gray"} />
                  {writable && (
                    <form action={toggleRuleAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="active" value={(!r.active).toString()} />
                      <button className="btn-ghost px-3 py-1.5 text-xs">
                        {r.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
