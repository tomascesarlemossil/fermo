import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { z } from "zod";
import { createQuote, sendQuote } from "./quotes";
import { priceFor, describe, type ConfigSelection } from "@/lib/configurator-options";

/**
 * Configurador 3D → orçamento instantâneo. A partir da seleção (modelo, sola,
 * cor, cadarço, quantidade) e dos dados de contato, cria cliente + lead +
 * orçamento JÁ ENVIADO e devolve o token do portal para aprovação imediata.
 * O preço é calculado no servidor (fonte de verdade), não confiando no front.
 */

export const instantQuoteSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  company: z.string().optional(),
  phone: z.string().optional(),
  selection: z.object({
    model: z.string(),
    sole: z.string(),
    color: z.string(),
    laces: z.string(),
    quantity: z.coerce.number().int().positive(),
  }),
});

export type InstantQuoteInput = z.infer<typeof instantQuoteSchema>;

export async function createInstantQuote(slug: string, input: InstantQuoteInput) {
  const data = instantQuoteSchema.parse(input);
  const sel = data.selection as ConfigSelection;
  const pricing = priceFor(sel);

  const tenant = await runWithTenant(
    { tenantId: "__public__", bypassTenant: true, source: "configurador-3d" },
    async () => prisma.tenant.findUnique({ where: { slug } }),
  );
  if (!tenant) throw new Error(`Tenant '${slug}' não encontrado.`);

  return runWithTenant({ tenantId: tenant.id, source: "configurador-3d" }, async () => {
    // cliente: reaproveita por e-mail se já existir
    const existing = await prisma.customer.findFirst({ where: { email: data.email } });
    const customer =
      existing ??
      (await prisma.customer.create({
        data: {
          name: data.company || data.name,
          email: data.email,
          phone: data.phone || null,
        } as any,
      }));

    // lead (rastreabilidade do canal) + configrequest
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        company: data.company || null,
        email: data.email,
        phone: data.phone || null,
        message: describe(sel),
        source: "configurador-3d",
        status: "QUALIFIED",
        customerId: customer.id,
      } as any,
    });
    await prisma.configRequest.create({
      data: { leadId: lead.id, payload: sel as any, summary: describe(sel) } as any,
    });

    // orçamento já enviado, pronto para aprovação no portal
    const quote = await createQuote({
      customerId: customer.id,
      notes: `Pedido configurado no site (configurador 3D). ${describe(sel)}`,
      items: [
        {
          description: describe(sel),
          quantity: pricing.quantity,
          unitPrice: pricing.unit,
        },
      ],
    });
    await sendQuote(quote.id);

    const full = await prisma.quote.findFirstOrThrow({ where: { id: quote.id } });
    return { token: full.publicToken, number: full.number, total: pricing.total };
  });
}
