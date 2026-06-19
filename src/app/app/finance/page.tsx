import { withSession } from "@/lib/session";
import { listEntries, cashFlow } from "@/server/finance";
import { PageHeader, StatusChip, EmptyState, brl } from "@/components/ui";
import { createEntryAction, markPaidAction } from "./actions";

export default async function FinancePage() {
  const { entries, flow } = await withSession(
    async () => ({ entries: await listEntries(), flow: await cashFlow() }),
    { permission: "finance:read" },
  );

  const receivableOpen = entries
    .filter((e) => e.type === "RECEIVABLE" && e.status === "OPEN")
    .reduce((s, e) => s + Number(e.amount), 0);
  const payableOpen = entries
    .filter((e) => e.type === "PAYABLE" && e.status === "OPEN")
    .reduce((s, e) => s + Number(e.amount), 0);
  const overdue = entries.filter((e) => e.overdue).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Contas a pagar/receber e fluxo de caixa." />
      <div className="p-4 sm:p-7 space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-muted text-xs uppercase tracking-wide">A receber (aberto)</div>
            <div className="font-cormorant text-3xl text-success mt-1">{brl(receivableOpen)}</div>
          </div>
          <div className="card p-5">
            <div className="text-muted text-xs uppercase tracking-wide">A pagar (aberto)</div>
            <div className="font-cormorant text-3xl text-danger mt-1">{brl(payableOpen)}</div>
          </div>
          <div className="card p-5">
            <div className="text-muted text-xs uppercase tracking-wide">Vencido</div>
            <div className="font-cormorant text-3xl text-danger mt-1">{brl(overdue)}</div>
          </div>
        </div>

        {/* Fluxo de caixa por mês */}
        {flow.length > 0 && (
          <div className="card p-5">
            <h2 className="font-cormorant text-xl mb-3">Fluxo de caixa (por vencimento)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-2">Mês</th>
                    <th className="text-right py-2">Entradas</th>
                    <th className="text-right py-2">Saídas</th>
                    <th className="text-right py-2">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {flow.map((b) => (
                    <tr key={b.month}>
                      <td className="py-2">{b.month}</td>
                      <td className="py-2 text-right text-success">{brl(b.receivable)}</td>
                      <td className="py-2 text-right text-danger">{brl(b.payable)}</td>
                      <td className={`py-2 text-right ${b.net >= 0 ? "text-ink" : "text-danger"}`}>{brl(b.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Novo lançamento */}
        <details className="card p-5">
          <summary className="cursor-pointer font-cormorant text-xl">+ Novo lançamento</summary>
          <form action={createEntryAction} className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select name="type" className="input">
                <option value="RECEIVABLE">A receber</option>
                <option value="PAYABLE">A pagar</option>
              </select>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select name="kind" className="input">
                <option value="OTHER">Outros</option>
                <option value="SALE">Venda</option>
                <option value="PURCHASE">Compra</option>
                <option value="COMMISSION">Comissão</option>
              </select>
            </div>
            <div>
              <label className="label">Valor</label>
              <input name="amount" type="number" step="0.01" min="0" className="input" required />
            </div>
            <div>
              <label className="label">Vencimento</label>
              <input name="dueDate" type="date" className="input" required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Descrição</label>
              <input name="description" className="input" required />
            </div>
            <div className="flex items-end">
              <button className="btn-gold">Lançar</button>
            </div>
          </form>
        </details>

        {entries.length === 0 ? (
          <EmptyState>Nenhum lançamento financeiro.</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-osso text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Descrição</th>
                  <th className="text-left px-5 py-3">Tipo</th>
                  <th className="text-right px-5 py-3">Valor</th>
                  <th className="text-left px-5 py-3">Vencimento</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.id} className={e.overdue ? "bg-dangerbg/30" : ""}>
                    <td className="px-5 py-3">{e.description}</td>
                    <td className="px-5 py-3 text-muted">{e.type === "RECEIVABLE" ? "Receber" : "Pagar"}</td>
                    <td className="px-5 py-3 text-right">{brl(Number(e.amount))}</td>
                    <td className="px-5 py-3 text-muted">{new Date(e.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-5 py-3">
                      <StatusChip
                        label={e.status === "PAID" ? "Pago" : e.overdue ? "Vencido" : "Aberto"}
                        tone={e.status === "PAID" ? "green" : e.overdue ? "red" : "gray"}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {e.status === "OPEN" && (
                        <form action={markPaidAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="text-sela hover:underline text-xs">Baixar</button>
                        </form>
                      )}
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
