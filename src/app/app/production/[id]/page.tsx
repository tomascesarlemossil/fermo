import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { withSession, getSession } from "@/lib/session";
import { ensureRouteAndGet } from "@/server/mes";
import { can } from "@/lib/rbac";
import { PageHeader, StatusChip } from "@/components/ui";
import { reportProductionAction, createInspectionAction } from "./actions";

const STEP_TONE: Record<string, "gray" | "gold" | "green"> = {
  PENDING: "gray",
  IN_PROGRESS: "gold",
  DONE: "green",
};
const RESULT_TONE: Record<string, "green" | "gold" | "red"> = {
  PASS: "green",
  PARTIAL: "gold",
  FAIL: "red",
};

export default async function ProductionOrderDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  const op = await withSession(() => ensureRouteAndGet(params.id), { permission: "production:read" });
  if (!op) notFound();

  const canReport = can(session, "production:write");
  const canQuality = can(session, "quality:read");
  const canQualityWrite = can(session, "quality:write");

  // QR Code apontando para esta página (chão de fábrica)
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const url = `${proto}://${host}/app/production/${op.id}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 160 });

  return (
    <>
      <PageHeader
        title={op.number}
        subtitle={`${op.order.customer.name} · ${op.quantity} pares`}
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={op.status} tone="gold" />
            <Link href="/app/production" className="btn-ghost">
              Voltar
            </Link>
          </div>
        }
      />
      <div className="p-4 sm:p-7 grid lg:grid-cols-3 gap-6">
        {/* Roteiro + apontamento */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-cormorant text-xl">Roteiro de produção</h2>
            </div>
            <ul className="divide-y divide-line">
              {op.steps.map((s) => {
                const pct = s.qtyTarget ? Math.round((s.qtyDone / s.qtyTarget) * 100) : 0;
                return (
                  <li key={s.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-medium">
                          {s.sequence}. {s.sector}
                        </span>
                        <div className="text-xs text-muted">
                          {s.qtyDone}/{s.qtyTarget} pares
                        </div>
                      </div>
                      <StatusChip
                        label={s.status === "IN_PROGRESS" ? "Em produção" : s.status === "DONE" ? "Concluído" : "Pendente"}
                        tone={STEP_TONE[s.status]}
                      />
                    </div>
                    <div className="h-1.5 bg-osso rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                    {canReport && s.status !== "DONE" && (
                      <form action={reportProductionAction} className="mt-3 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="opId" value={op.id} />
                        <input type="hidden" name="stepId" value={s.id} />
                        <input type="hidden" name="source" value="admin" />
                        <div>
                          <label className="label">Apontar pares</label>
                          <input
                            name="quantity"
                            type="number"
                            min={1}
                            max={s.qtyTarget - s.qtyDone}
                            defaultValue={s.qtyTarget - s.qtyDone}
                            className="input w-32"
                          />
                        </div>
                        <input name="operator" className="input w-40" placeholder="Operador (opcional)" />
                        <button className="btn-gold">Apontar</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Eventos (apontamentos) */}
          <div className="card">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-cormorant text-xl">Apontamentos recentes</h2>
            </div>
            {op.events.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Nenhum apontamento ainda.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {op.events.map((e) => (
                  <li key={e.id} className="px-5 py-2.5 flex items-center justify-between">
                    <span>
                      <span className="text-muted">{e.step?.sector ?? "—"}</span> · +{e.quantity} pares
                      {e.operator ? ` · ${e.operator}` : ""}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(e.createdAt).toLocaleString("pt-BR")}
                      {e.source === "qr" ? " · QR" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Qualidade */}
          {canQuality && (
            <div className="card">
              <div className="px-5 py-4 border-b border-line">
                <h2 className="font-cormorant text-xl">Qualidade</h2>
              </div>
              {op.inspections.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">Nenhuma inspeção registrada.</p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {op.inspections.map((ins) => (
                    <li key={ins.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <span>
                          {ins.step?.sector ? `${ins.step.sector} · ` : ""}
                          Aprovados {ins.approvedQty} / Reprovados {ins.rejectedQty}
                        </span>
                        <StatusChip label={ins.result} tone={RESULT_TONE[ins.result]} />
                      </div>
                      {ins.defects.length > 0 && (
                        <ul className="text-xs text-muted mt-1 list-disc list-inside">
                          {ins.defects.map((d) => (
                            <li key={d.id}>
                              {d.type} ({d.quantity}) — {d.severity}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canQualityWrite && (
                <details className="px-5 py-4 border-t border-line">
                  <summary className="cursor-pointer text-sm text-sela">+ Nova inspeção</summary>
                  <form action={createInspectionAction} className="mt-3 grid sm:grid-cols-2 gap-3">
                    <input type="hidden" name="opId" value={op.id} />
                    <div>
                      <label className="label">Etapa (opcional)</label>
                      <select name="stepId" className="input">
                        <option value="">— OP inteira —</option>
                        {op.steps.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.sector}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Amostra</label>
                      <input name="sampleSize" type="number" min={0} className="input" defaultValue={0} />
                    </div>
                    <div>
                      <label className="label">Aprovados</label>
                      <input name="approvedQty" type="number" min={0} className="input" defaultValue={0} />
                    </div>
                    <div>
                      <label className="label">Reprovados</label>
                      <input name="rejectedQty" type="number" min={0} className="input" defaultValue={0} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Defeitos (um por linha: tipo | qtd | LOW/MEDIUM/HIGH)</label>
                      <textarea
                        name="defects"
                        rows={2}
                        className="input"
                        placeholder={"Costura torta | 1 | MEDIUM"}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Observações</label>
                      <input name="notes" className="input" />
                    </div>
                    <div className="sm:col-span-2">
                      <button className="btn-gold">Registrar inspeção</button>
                    </div>
                  </form>
                </details>
              )}
            </div>
          )}
        </div>

        {/* QR Code + info */}
        <div className="space-y-6">
          <div className="card p-5 text-center">
            <h2 className="font-cormorant text-xl mb-3">QR do chão de fábrica</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR ${op.number}`} className="mx-auto rounded-lg border border-line" />
            <p className="text-xs text-muted mt-3 break-all">{url}</p>
            <p className="text-xs text-muted mt-1">Escaneie para abrir o apontamento desta OP.</p>
          </div>

          <div className="card p-5 text-sm">
            <h2 className="font-cormorant text-xl mb-2">Pedido</h2>
            <Link href={`/app/orders/${op.orderId}`} className="text-sela hover:underline font-mono">
              {op.order.number}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
