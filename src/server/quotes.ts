import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { z } from "zod";
import { nextNumber } from "./numbering";

/**
 * Orçamento (Quote) com versões + aprovação no portal do cliente, que gera
 * Pedido (SalesOrder) e Ordem de Produção (ProductionOrder).
 *
 * Cálculo básico v1: subtotal = Σ(qtd × preço), total = subtotal − desconto.
 */

export const quoteItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

export const quoteInputSchema = z.object({
  customerId: z.string().min(1),
  opportunityId: z.string().optional(),
  discount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "Inclua ao menos um item."),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;

function compute(items: { quantity: number; unitPrice: number }[], discount: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total };
}

export async function createQuote(input: QuoteInput) {
  const data = quoteInputSchema.parse(input);
  const { subtotal, total } = compute(
    data.items as { quantity: number; unitPrice: number }[],
    data.discount,
  );
  const number = await nextNumber("quote");

  // Cria filhos (QuoteItem) individualmente: são modelos com tenantId e a
  // extension só injeta tenantId em escritas de topo, não em nested writes.
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        number,
        customerId: data.customerId,
        opportunityId: data.opportunityId || null,
        status: "DRAFT",
        currentVersion: 1,
      } as any,
    });

    for (const i of data.items) {
      await tx.quoteItem.create({
        data: {
          quoteId: quote.id,
          productId: i.productId || null,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.quantity * i.unitPrice,
        } as any,
      });
    }

    await tx.quoteVersion.create({
      data: {
        quoteId: quote.id,
        version: 1,
        status: "DRAFT",
        subtotal,
        discount: data.discount,
        total,
        notes: data.notes || null,
        snapshot: {
          items: data.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.quantity * i.unitPrice,
          })),
          discount: data.discount,
          subtotal,
          total,
        },
      } as any,
    });

    return tx.quote.findFirstOrThrow({ where: { id: quote.id }, include: { items: true } });
  });
}

export async function sendQuote(quoteId: string) {
  const quote = await prisma.quote.findFirst({ where: { id: quoteId } });
  if (!quote) throw new Error("Orçamento não encontrado.");
  if (quote.status !== "DRAFT" && quote.status !== "SENT") {
    throw new Error(`Orçamento não pode ser enviado no status ${quote.status}.`);
  }
  await prisma.quoteVersion.updateMany({
    where: { quoteId, version: quote.currentVersion },
    data: { status: "SENT" },
  });
  return prisma.quote.update({ where: { id: quoteId }, data: { status: "SENT" } });
}

/**
 * Aprovação: muda o status, registra a decisão na versão corrente e GERA o
 * pedido + ordem de produção. Idempotente quanto ao pedido (não duplica).
 */
async function generateOrderFromQuote(quoteId: string, decidedBy?: string) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId },
    include: { items: true, salesOrder: true },
  });
  if (!quote) throw new Error("Orçamento não encontrado.");
  if (quote.salesOrder) return quote.salesOrder;

  const total = quote.items.reduce((s, i) => s + Number(i.lineTotal), 0);
  const orderNumber = await nextNumber("order");
  const opNumber = await nextNumber("production");
  const totalQty = quote.items.reduce((s, i) => s + i.quantity, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        number: orderNumber,
        customerId: quote.customerId,
        quoteId: quote.id,
        status: "CONFIRMED",
        total,
      } as any,
    });

    for (const i of quote.items) {
      await tx.salesOrderItem.create({
        data: {
          orderId: created.id,
          productId: i.productId,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        } as any,
      });
    }

    await tx.productionOrder.create({
      data: {
        orderId: created.id,
        number: opNumber,
        status: "PLANNED",
        quantity: totalQty,
        notes: `Gerada do pedido ${orderNumber} / orçamento ${quote.number}.`,
      } as any,
    });

    return tx.salesOrder.findFirstOrThrow({
      where: { id: created.id },
      include: { items: true, productionOrders: true },
    });
  });

  await prisma.notification.create({
    data: {
      title: "Orçamento aprovado",
      body: `Pedido ${orderNumber} e OP ${opNumber} gerados.`,
      link: `/app/orders/${order.id}`,
    } as any,
  });

  return order;
}

export async function decideQuote(
  quoteId: string,
  decision: "APPROVED" | "REJECTED",
  decidedBy?: string,
) {
  const quote = await prisma.quote.findFirst({ where: { id: quoteId } });
  if (!quote) throw new Error("Orçamento não encontrado.");
  if (quote.status !== "SENT") {
    throw new Error("Apenas orçamentos enviados podem ser aprovados/recusados.");
  }

  await prisma.quoteVersion.updateMany({
    where: { quoteId, version: quote.currentVersion },
    data: { status: decision, decidedAt: new Date(), decidedBy: decidedBy || null },
  });
  await prisma.quote.update({ where: { id: quoteId }, data: { status: decision } });

  if (decision === "APPROVED") {
    return generateOrderFromQuote(quoteId, decidedBy);
  }
  return null;
}

/**
 * Decisão a partir do portal público (sem sessão): o token resolve o tenant.
 * tenantId continua sendo resolvido no servidor, nunca enviado pelo front.
 */
export async function decideQuoteByToken(
  token: string,
  decision: "APPROVED" | "REJECTED",
  decidedBy?: string,
) {
  const quote = await runWithTenant(
    { tenantId: "__portal__", bypassTenant: true, source: "portal" },
    async () => prisma.quote.findUnique({ where: { publicToken: token } }),
  );
  if (!quote) throw new Error("Orçamento não encontrado.");

  return runWithTenant(
    { tenantId: quote.tenantId, source: "portal" },
    async () => decideQuote(quote.id, decision, decidedBy ?? "portal-cliente"),
  );
}

export async function getQuoteByToken(token: string) {
  return runWithTenant(
    { tenantId: "__portal__", bypassTenant: true, source: "portal" },
    async () =>
      prisma.quote.findUnique({
        where: { publicToken: token },
        include: {
          items: true,
          customer: true,
          versions: { orderBy: { version: "desc" }, take: 1 },
          tenant: { select: { name: true } },
        },
      }),
  );
}

export async function listQuotes() {
  return prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: true },
  });
}

export async function getQuote(id: string) {
  return prisma.quote.findFirst({
    where: { id },
    include: {
      customer: true,
      items: true,
      versions: { orderBy: { version: "desc" } },
      salesOrder: { include: { productionOrders: true } },
    },
  });
}
