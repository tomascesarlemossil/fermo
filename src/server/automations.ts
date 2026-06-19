import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * Automações configuráveis (Fase 6). Motor mínimo: regras com gatilho + ação.
 * Ação suportada na v1: "notify" (cria uma Notification). Disparada nos eventos
 * de negócio (ex.: lead.created, quote.approved).
 */

export const TRIGGERS = ["lead.created", "quote.approved", "order.created"] as const;
export const ACTIONS = ["notify"] as const;

export const ruleSchema = z.object({
  name: z.string().min(2),
  trigger: z.enum(TRIGGERS),
  action: z.enum(ACTIONS).default("notify"),
  title: z.string().min(1),
  body: z.string().optional(),
});

export async function listRules() {
  return prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createRule(input: z.infer<typeof ruleSchema>) {
  const data = ruleSchema.parse(input);
  return prisma.automationRule.create({
    data: {
      name: data.name,
      trigger: data.trigger,
      action: data.action,
      params: { title: data.title, body: data.body ?? "" },
      active: true,
    } as any,
  });
}

export async function toggleRule(id: string, active: boolean) {
  return prisma.automationRule.update({ where: { id }, data: { active } });
}

function interpolate(template: string, ctx: Record<string, unknown>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(ctx[k] ?? ""));
}

/**
 * Executa as automações ativas para um gatilho. Nunca lança — falhas não devem
 * quebrar a operação de negócio que disparou o evento.
 */
export async function runAutomations(trigger: string, ctx: Record<string, unknown> = {}) {
  try {
    const rules = await prisma.automationRule.findMany({ where: { trigger, active: true } });
    for (const rule of rules) {
      if (rule.action === "notify") {
        const params = (rule.params as { title?: string; body?: string }) ?? {};
        await prisma.notification.create({
          data: {
            title: interpolate(params.title ?? rule.name, ctx),
            body: interpolate(params.body ?? "", ctx),
            link: (ctx.link as string) ?? null,
          } as any,
        });
      }
    }
  } catch {
    // silencioso por design
  }
}
