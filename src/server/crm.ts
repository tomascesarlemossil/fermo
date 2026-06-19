import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { z } from "zod";

/**
 * CRM — captura de lead (site público), pipeline e conversão em cliente.
 * As funções aqui assumem que já estão dentro de um contexto de tenant
 * (via withSession ou runWithTenant), EXCETO captureLeadForTenant, que resolve
 * o tenant pelo slug e roda o insert escopado.
 */

export const leadInputSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  company: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
  config: z.any().optional(), // payload do configurador (ConfigRequest)
});

export type LeadInput = z.infer<typeof leadInputSchema>;

/**
 * Captura pública: resolve o tenant pelo slug (sem escopo), depois grava o lead
 * DENTRO do escopo desse tenant. tenantId nunca vem do front.
 */
export async function captureLeadForTenant(slug: string, input: LeadInput) {
  const data = leadInputSchema.parse(input);

  const tenant = await runWithTenant(
    { tenantId: "__public__", bypassTenant: true, source: "public-site" },
    async () => prisma.tenant.findUnique({ where: { slug } }),
  );
  if (!tenant) throw new Error(`Tenant '${slug}' não encontrado.`);

  return runWithTenant(
    { tenantId: tenant.id, source: "public-site" },
    async () => {
      const lead = await prisma.lead.create({
        data: {
          name: data.name,
          company: data.company || null,
          email: data.email || null,
          phone: data.phone || null,
          message: data.message || null,
          source: data.source || "site",
          status: "NEW",
        } as any,
      });

      if (data.config) {
        await prisma.configRequest.create({
          data: {
            leadId: lead.id,
            payload: data.config,
            summary: typeof data.config?.summary === "string" ? data.config.summary : null,
          } as any,
        });
      }

      await prisma.notification.create({
        data: {
          title: "Novo lead",
          body: `${data.name}${data.company ? ` — ${data.company}` : ""}`,
          link: `/app/crm/leads/${lead.id}`,
        } as any,
      });

      return lead;
    },
  );
}

export async function listLeads() {
  return prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { configRequest: true },
  });
}

export async function getLead(id: string) {
  return prisma.lead.findFirst({ where: { id }, include: { configRequest: true, customer: true } });
}

const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

export async function updateLeadStatus(id: string, status: (typeof leadStatuses)[number]) {
  return prisma.lead.update({ where: { id }, data: { status } });
}

/** Converte um lead em Customer (idempotente: reusa o customer já vinculado). */
export async function convertLeadToCustomer(leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new Error("Lead não encontrado.");
  if (lead.customerId) {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED" } });
    return prisma.customer.findFirst({ where: { id: lead.customerId } });
  }

  const customer = await prisma.customer.create({
    data: {
      name: lead.company || lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.message,
    } as any,
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { customerId: customer.id, status: "CONVERTED" },
  });

  await prisma.opportunity.create({
    data: {
      title: `Oportunidade — ${customer.name}`,
      leadId: lead.id,
      stage: "QUALIFICATION",
    } as any,
  });

  return customer;
}

export async function listCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}

export async function listOpportunities() {
  return prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: true },
  });
}
