import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "./tenant-context";
import { isTenantModel, isAuditedModel } from "./models-meta";

/**
 * Prisma Client com duas Extensions:
 *  1) Multi-tenant — injeta `tenantId` (lido do AsyncLocalStorage) em todo
 *     create/find/update/delete dos modelos de negócio. tenantId NUNCA vem do
 *     front; é sempre resolvido pela sessão no servidor.
 *  2) Auditoria — registra before/after de escritas em AuditLog.
 *
 * Operações em modelos de negócio fora de um contexto de tenant lançam erro
 * (a menos que o contexto marque `bypassTenant`). Isso transforma vazamentos
 * de tenant em falhas explícitas em vez de leituras silenciosas.
 */

const WRITE_OPS = new Set(["create", "update", "delete", "upsert"]);

function lower(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function basePrisma() {
  return new PrismaClient({
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

function createPrisma() {
  const base = basePrisma();

  const client = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = getTenantContext();
          const tenantModel = isTenantModel(model);

          // ── 1) Multi-tenant: injeta tenantId ──────────────────────────
          if (tenantModel && !ctx?.bypassTenant) {
            if (!ctx?.tenantId) {
              throw new Error(
                `[multi-tenant] Operação '${operation}' em '${model}' sem contexto de tenant. ` +
                  `Envolva a chamada em runWithTenant({ tenantId }) ou marque bypassTenant.`,
              );
            }
            const tenantId = ctx.tenantId;
            const a: any = args ?? {};

            if (operation === "create") {
              a.data = { ...a.data, tenantId };
            } else if (operation === "createMany") {
              const rows = Array.isArray(a.data) ? a.data : [a.data];
              a.data = rows.map((r: any) => ({ ...r, tenantId }));
            } else if (operation === "upsert") {
              a.where = { ...a.where, tenantId };
              a.create = { ...a.create, tenantId };
            } else {
              // find*, update, updateMany, delete, deleteMany, count,
              // aggregate, groupBy — todos aceitam tenantId no where.
              a.where = { ...(a.where ?? {}), tenantId };
            }
            args = a;
          }

          // ── 2) Auditoria ──────────────────────────────────────────────
          const shouldAudit =
            isAuditedModel(model) && WRITE_OPS.has(operation) && !!ctx?.tenantId;

          if (!shouldAudit) {
            return query(args);
          }

          const delegate: any = (client as any)[lower(model!)];
          let before: any = null;

          if (operation === "update" || operation === "delete" || operation === "upsert") {
            try {
              before = await delegate.findFirst({ where: (args as any).where });
            } catch {
              before = null;
            }
          }

          const result = await query(args);

          try {
            const action =
              operation === "create"
                ? "CREATE"
                : operation === "delete"
                  ? "DELETE"
                  : operation === "upsert"
                    ? before
                      ? "UPDATE"
                      : "CREATE"
                    : "UPDATE";

            await base.auditLog.create({
              data: {
                tenantId: ctx!.tenantId!,
                userId: ctx?.userId ?? null,
                action,
                model: model!,
                recordId: (result as any)?.id ?? before?.id ?? null,
                before: before ? JSON.parse(JSON.stringify(before)) : undefined,
                after:
                  operation === "delete"
                    ? undefined
                    : result
                      ? JSON.parse(JSON.stringify(result))
                      : undefined,
                source: ctx?.source ?? "server",
              },
            });
          } catch {
            // auditoria nunca deve quebrar a operação de negócio
          }

          return result;
        },
      },
    },
  });

  return client;
}

type ExtendedPrisma = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrisma };

export const prisma: ExtendedPrisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
