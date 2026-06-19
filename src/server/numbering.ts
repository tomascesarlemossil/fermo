import { prisma } from "@/lib/prisma";

/**
 * Numeração sequencial por tenant/ano. Ex.: ORC-2026-0001.
 * v1: deriva da contagem dentro de uma transação. Suficiente para o volume
 * atual; pode virar tabela de sequência se houver concorrência alta.
 */
type Doc = "quote" | "order" | "production" | "purchase" | "invoice";

const PREFIX: Record<Doc, string> = {
  quote: "ORC",
  order: "PED",
  production: "OP",
  purchase: "PC",
  invoice: "NF",
};

export async function nextNumber(doc: Doc, year = new Date().getFullYear()): Promise<string> {
  const prefix = PREFIX[doc];
  const like = `${prefix}-${year}-`;

  const count = await (async () => {
    switch (doc) {
      case "quote":
        return prisma.quote.count({ where: { number: { startsWith: like } } });
      case "order":
        return prisma.salesOrder.count({ where: { number: { startsWith: like } } });
      case "production":
        return prisma.productionOrder.count({ where: { number: { startsWith: like } } });
      case "purchase":
        return prisma.purchaseOrder.count({ where: { number: { startsWith: like } } });
      case "invoice":
        return prisma.invoice.count({ where: { number: { startsWith: like } } });
    }
  })();

  const seq = String(count + 1).padStart(4, "0");
  return `${like}${seq}`;
}
