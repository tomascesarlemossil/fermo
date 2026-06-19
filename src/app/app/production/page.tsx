import { withSession } from "@/lib/session";
import { getSession } from "@/lib/session";
import { listProductionOrders, PRODUCTION_STATUSES } from "@/server/orders";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { setProductionStatusAction } from "@/app/app/actions";

const LABEL: Record<string, string> = {
  PLANNED: "Planejado",
  CUTTING: "Corte",
  STITCHING: "Pesponto",
  ASSEMBLY: "Montagem",
  FINISHING: "Acabamento",
  DONE: "Concluído",
};

export default async function ProductionPage() {
  const session = await getSession();
  const ops = await withSession(() => listProductionOrders(), { permission: "production:read" });
  const writable = can(session, "production:write");

  return (
    <>
      <PageHeader title="Produção" subtitle="Kanban por setor — ordens de produção." />
      <div className="p-4 sm:p-7 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {PRODUCTION_STATUSES.map((status) => {
            const cards = ops.filter((o) => o.status === status);
            return (
              <div key={status} className="w-64 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-cormorant text-lg">{LABEL[status]}</h2>
                  <span className="chip bg-osso text-muted">{cards.length}</span>
                </div>
                <div className="space-y-3">
                  {cards.map((op) => (
                    <div key={op.id} className="card p-4">
                      <div className="font-mono text-xs text-muted">{op.number}</div>
                      <div className="font-medium mt-1">{op.order.customer.name}</div>
                      <div className="text-sm text-muted">{op.quantity} pares</div>
                      {writable && (
                        <form action={setProductionStatusAction} className="mt-3 flex gap-1.5">
                          <input type="hidden" name="id" value={op.id} />
                          <select name="status" defaultValue={op.status} className="input text-xs py-1.5">
                            {PRODUCTION_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {LABEL[s]}
                              </option>
                            ))}
                          </select>
                          <button className="btn-ghost px-2 py-1.5 text-xs">OK</button>
                        </form>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="text-xs text-muted text-center py-6 border border-dashed border-line rounded-xl">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
