import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { z } from "zod";
import { createQuote, sendQuote, decideQuote } from "@/server/quotes";
import { priceConfiguration, type StudioSelection } from "./pricing";

/**
 * Projetos do Studio: salvar configuração, gerar orçamento (com snapshot imutável)
 * e converter em pedido na aprovação. Fluxo público resolve o tenant pelo slug.
 */

async function withTenantBySlug<T>(slug: string, fn: (tenantId: string) => Promise<T>): Promise<T> {
  const tenant = await runWithTenant(
    { tenantId: "__public__", bypassTenant: true, source: "studio" },
    async () => prisma.tenant.findUnique({ where: { slug } }),
  );
  if (!tenant) throw new Error(`Tenant '${slug}' não encontrado.`);
  return runWithTenant({ tenantId: tenant.id, source: "studio" }, () => fn(tenant.id)) as Promise<T>;
}

export const selectionSchema = z.object({
  material: z.string().optional(),
  color: z.string().optional(),
  sole: z.string().optional(),
  insole: z.string().optional(),
  lining: z.string().optional(),
  lace: z.string().optional(),
  eyelet: z.string().optional(),
  packaging: z.string().optional(),
  finishes: z.array(z.string()).optional(),
  customizations: z.array(z.string()).optional(),
  quantity: z.coerce.number().int().positive(),
  sampleRequested: z.boolean().optional(),
  grade: z.record(z.coerce.number()).optional(),
  brand: z
    .object({ name: z.string().optional(), placement: z.string().optional(), logoAssetId: z.string().optional() })
    .optional(),
});

async function logEvent(projectId: string | null, type: string, meta?: any) {
  try {
    await prisma.studioEvent.create({ data: { projectId, type, meta } as any });
  } catch {
    /* noop */
  }
}

export async function saveProject(
  slug: string,
  input: { token?: string; modelId: string; name?: string; ownerEmail?: string; selection: StudioSelection },
) {
  const selection = selectionSchema.parse(input.selection);
  return withTenantBySlug(slug, async () => {
    const existing = input.token
      ? await prisma.studioProject.findFirst({ where: { publicToken: input.token } })
      : null;

    if (existing) {
      const updated = await prisma.studioProject.update({
        where: { id: existing.id },
        data: {
          modelId: input.modelId,
          name: input.name ?? existing.name,
          ownerEmail: input.ownerEmail ?? existing.ownerEmail,
          selection: selection as any,
          quantity: selection.quantity,
          status: existing.status === "DRAFT" ? "SAVED" : existing.status,
        },
      });
      await logEvent(updated.id, "configuration_saved");
      return { token: updated.publicToken, id: updated.id };
    }

    const created = await prisma.studioProject.create({
      data: {
        modelId: input.modelId,
        name: input.name ?? "Meu projeto",
        ownerEmail: input.ownerEmail ?? null,
        selection: selection as any,
        quantity: selection.quantity,
        status: "SAVED",
      } as any,
    });
    await logEvent(created.id, "configuration_started");
    return { token: created.publicToken, id: created.id };
  });
}

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
});

/** Gera o orçamento a partir do projeto: preço no servidor + snapshot imutável. */
export async function generateQuoteFromProject(
  slug: string,
  input: { token?: string; modelId: string; name?: string; selection: StudioSelection; contact: z.infer<typeof contactSchema> },
) {
  const selection = selectionSchema.parse(input.selection);
  const contact = contactSchema.parse(input.contact);

  return withTenantBySlug(slug, async () => {
    // garante projeto salvo
    let project = input.token
      ? await prisma.studioProject.findFirst({ where: { publicToken: input.token } })
      : null;
    if (!project) {
      project = await prisma.studioProject.create({
        data: {
          modelId: input.modelId,
          name: input.name ?? "Meu projeto",
          ownerEmail: contact.email,
          selection: selection as any,
          quantity: selection.quantity,
          status: "SAVED",
        } as any,
      });
    }

    const priced = await priceConfiguration(input.modelId, selection as StudioSelection);
    const b = priced.breakdown;
    const model = await prisma.shoeModel.findFirstOrThrow({ where: { id: input.modelId } });

    // cliente (reusa por e-mail)
    const customer =
      (await prisma.customer.findFirst({ where: { email: contact.email } })) ??
      (await prisma.customer.create({
        data: { name: contact.company || contact.name, email: contact.email, phone: contact.phone || null } as any,
      }));

    // itens do orçamento: produção + desenvolvimento/modelagem + amostra
    const items = [
      {
        description: `${model.name} — ${selection.quantity} pares (configurado no Fermo Studio)`,
        quantity: selection.quantity,
        unitPrice: b.unit.netUnit,
      },
      { description: "Desenvolvimento e modelagem", quantity: 1, unitPrice: b.development + b.modeling },
    ];
    if (b.sample > 0) items.push({ description: "Amostra (protótipo)", quantity: 1, unitPrice: b.sample });

    const quote = await createQuote({
      customerId: customer.id,
      notes: `Fermo Studio · projeto ${project.publicToken}. Validade ${b.validityDays} dias. Prazo estimado ${b.leadTimeDays} dias.`,
      items,
    });
    await sendQuote(quote.id);

    const nextStatus = priced.needsReview ? "WAITING_TECHNICAL_REVIEW" : "QUOTE_GENERATED";
    await prisma.studioProject.update({
      where: { id: project.id },
      data: {
        customerId: customer.id,
        ownerEmail: contact.email,
        priceSnapshot: priced.snapshot as any,
        quoteId: quote.id,
        needsReview: priced.needsReview,
        status: nextStatus as any,
      },
    });
    if (priced.needsReview) {
      await prisma.technicalReview.create({
        data: { projectId: project.id, status: "PENDING", notes: "Combinação requer análise técnica." } as any,
      });
    }
    await logEvent(project.id, "quote_generated", { total: b.total });

    return { token: project.publicToken, quoteId: quote.id, total: b.total, needsReview: priced.needsReview };
  });
}

export async function getProjectByToken(slug: string, token: string) {
  return withTenantBySlug(slug, async () => {
    const project = await prisma.studioProject.findFirst({ where: { publicToken: token } });
    if (!project) return null;
    const model = await prisma.shoeModel.findFirst({ where: { id: project.modelId } });
    const quote = project.quoteId ? await prisma.quote.findFirst({ where: { id: project.quoteId } }) : null;
    return { project, model, quote };
  });
}

/** Aprovação do cliente → converte em pedido (reusa o motor de pedidos). */
export async function approveProject(slug: string, token: string, decidedBy?: string) {
  return withTenantBySlug(slug, async () => {
    const project = await prisma.studioProject.findFirst({ where: { publicToken: token } });
    if (!project?.quoteId) throw new Error("Projeto sem orçamento.");
    if (project.needsReview && project.status === "WAITING_TECHNICAL_REVIEW") {
      throw new Error("Projeto aguardando análise técnica.");
    }
    const order: any = await decideQuote(project.quoteId, "APPROVED", decidedBy ?? "cliente-studio");
    await prisma.studioProject.update({
      where: { id: project.id },
      data: { status: "CONVERTED_TO_ORDER", orderId: order?.id ?? null },
    });
    await logEvent(project.id, "order_created", { orderId: order?.id });
    return { orderId: order?.id, orderNumber: order?.number };
  });
}
