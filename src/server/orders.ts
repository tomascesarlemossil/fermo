import { prisma } from "@/lib/prisma";

export async function listOrders() {
  return prisma.salesOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: true, productionOrders: true },
  });
}

export async function getOrder(id: string) {
  return prisma.salesOrder.findFirst({
    where: { id },
    include: { customer: true, items: true, productionOrders: true, quote: true },
  });
}

const PRODUCTION_STATUSES = [
  "PLANNED",
  "CUTTING",
  "STITCHING",
  "ASSEMBLY",
  "FINISHING",
  "DONE",
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export async function listProductionOrders() {
  return prisma.productionOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { order: { include: { customer: true } } },
  });
}

export async function updateProductionStatus(id: string, status: ProductionStatus) {
  return prisma.productionOrder.update({ where: { id }, data: { status } });
}

export { PRODUCTION_STATUSES };
