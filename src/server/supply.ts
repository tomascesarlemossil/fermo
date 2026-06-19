import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { z } from "zod";
import { nextNumber } from "./numbering";
import { explodeBom } from "./catalog";

/**
 * Suprimentos (Fase 4): fornecedores, estoque (razão de movimentos + saldo),
 * compras, MRP (a partir da BOM) e portal da facção.
 */

// ── Fornecedores ────────────────────────────────────────────────

export const supplierSchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  kind: z.enum(["MATERIAL", "FACCAO"]).default("MATERIAL"),
  notes: z.string().optional(),
});

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createSupplier(input: z.infer<typeof supplierSchema>) {
  const data = supplierSchema.parse(input);
  return prisma.supplier.create({
    data: {
      name: data.name,
      cnpj: data.cnpj || null,
      email: data.email || null,
      phone: data.phone || null,
      kind: data.kind,
      notes: data.notes || null,
    } as any,
  });
}

// ── Estoque ─────────────────────────────────────────────────────

type RefType = "MATERIAL" | "PRODUCT";
type MovType = "IN" | "OUT" | "RESERVE" | "RELEASE" | "ADJUST";

/**
 * Aplica um movimento de estoque e atualiza o saldo (quantity/reserved).
 * IN/OUT/ADJUST afetam `quantity`; RESERVE/RELEASE afetam `reserved`.
 */
export async function applyStockMovement(opts: {
  refType: RefType;
  refId: string;
  type: MovType;
  quantity: number;
  note?: string;
  refDoc?: string;
}) {
  const { refType, refId, type, quantity } = opts;

  return prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        refType,
        refId,
        type,
        quantity,
        note: opts.note || null,
        refDoc: opts.refDoc || null,
      } as any,
    });

    const current = await tx.stockBalance.findFirst({ where: { refType, refId } });
    const qty = Number(current?.quantity ?? 0);
    const reserved = Number(current?.reserved ?? 0);

    let nextQty = qty;
    let nextReserved = reserved;
    if (type === "IN") nextQty = qty + quantity;
    else if (type === "OUT") nextQty = qty - quantity;
    else if (type === "ADJUST") nextQty = qty + quantity; // delta (pode ser negativo)
    else if (type === "RESERVE") nextReserved = reserved + quantity;
    else if (type === "RELEASE") nextReserved = Math.max(0, reserved - quantity);

    if (current) {
      return tx.stockBalance.update({
        where: { id: current.id },
        data: { quantity: nextQty, reserved: nextReserved },
      });
    }
    return tx.stockBalance.create({
      data: { refType, refId, quantity: nextQty, reserved: nextReserved } as any,
    });
  });
}

export async function listStock() {
  const [balances, materials, products] = await Promise.all([
    prisma.stockBalance.findMany(),
    prisma.material.findMany(),
    prisma.product.findMany(),
  ]);
  const matMap = new Map(materials.map((m) => [m.id, m]));
  const prodMap = new Map(products.map((p) => [p.id, p]));

  return balances.map((b) => {
    const meta =
      b.refType === "MATERIAL" ? matMap.get(b.refId) : prodMap.get(b.refId);
    return {
      id: b.id,
      refType: b.refType,
      refId: b.refId,
      name: (meta as any)?.name ?? "—",
      code: (meta as any)?.code ?? (meta as any)?.sku ?? "",
      unit: (meta as any)?.unit ?? "un",
      quantity: Number(b.quantity),
      reserved: Number(b.reserved),
      available: Number(b.quantity) - Number(b.reserved),
    };
  });
}

export async function availableStock(refType: RefType, refId: string) {
  const b = await prisma.stockBalance.findFirst({ where: { refType, refId } });
  if (!b) return 0;
  return Number(b.quantity) - Number(b.reserved);
}

// ── Compras ─────────────────────────────────────────────────────

export const purchaseItemSchema = z.object({
  materialId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

export const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export async function listPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true },
  });
}

export async function getPurchaseOrder(id: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id },
    include: { supplier: true, items: { include: { material: true } } },
  });
}

export async function createPurchaseOrder(input: z.infer<typeof purchaseSchema>) {
  const data = purchaseSchema.parse(input);
  const number = await nextNumber("purchase");
  const total = data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        number,
        supplierId: data.supplierId,
        status: "DRAFT",
        total,
        notes: data.notes || null,
      } as any,
    });
    for (const i of data.items) {
      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          materialId: i.materialId || null,
          description: i.description,
          quantity: i.quantity,
          unitCost: i.unitCost,
          lineTotal: i.quantity * i.unitCost,
        } as any,
      });
    }
    return tx.purchaseOrder.findFirstOrThrow({ where: { id: po.id }, include: { items: true } });
  });
}

export async function sendPurchaseOrder(id: string) {
  return prisma.purchaseOrder.update({ where: { id }, data: { status: "SENT" } });
}

/** Recebe a PO: entra no estoque cada item com material e marca como recebida. */
export async function receivePurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id }, include: { items: true } });
  if (!po) throw new Error("Pedido de compra não encontrado.");
  if (po.status === "RECEIVED") return po;

  for (const item of po.items) {
    if (item.materialId) {
      await applyStockMovement({
        refType: "MATERIAL",
        refId: item.materialId,
        type: "IN",
        quantity: Number(item.quantity),
        refDoc: po.number,
        note: "Recebimento de compra",
      });
    }
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "RECEIVED", receivedAt: new Date() },
  });
}

// ── MRP ─────────────────────────────────────────────────────────

export type MrpLine = {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  gross: number;
  available: number;
  net: number;
};

/**
 * MRP simples: demanda = itens de pedidos ativos (CONFIRMED/IN_PRODUCTION) que
 * referenciam um produto. Explode a BOM de cada item × quantidade, agrega a
 * necessidade bruta por material, subtrai o estoque disponível e sugere a
 * compra do líquido positivo.
 */
export async function runMrp(): Promise<MrpLine[]> {
  const orders = await prisma.salesOrder.findMany({
    where: { status: { in: ["CONFIRMED", "IN_PRODUCTION"] } },
    include: { items: true },
  });

  const gross = new Map<string, { code: string; name: string; unit: string; qty: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      if (!item.productId) continue;
      const exp = await explodeBom(item.productId, item.quantity);
      for (const m of exp.materials) {
        const cur = gross.get(m.materialId);
        if (cur) cur.qty += m.quantity;
        else gross.set(m.materialId, { code: m.code, name: m.name, unit: m.unit, qty: m.quantity });
      }
    }
  }

  const lines: MrpLine[] = [];
  for (const [materialId, g] of gross) {
    const available = await availableStock("MATERIAL", materialId);
    lines.push({
      materialId,
      code: g.code,
      name: g.name,
      unit: g.unit,
      gross: g.qty,
      available,
      net: Math.max(0, g.qty - available),
    });
  }
  return lines.sort((a, b) => b.net - a.net);
}

// ── Portal da facção ────────────────────────────────────────────

export async function getPurchaseOrderByToken(token: string) {
  return runWithTenant(
    { tenantId: "__faccao__", bypassTenant: true, source: "faccao-portal" },
    async () =>
      prisma.purchaseOrder.findUnique({
        where: { publicToken: token },
        include: { supplier: true, items: true, tenant: { select: { name: true } } },
      }),
  );
}

export async function faccaoUpdateStatusByToken(token: string, status: "SENT" | "RECEIVED") {
  const po = await runWithTenant(
    { tenantId: "__faccao__", bypassTenant: true, source: "faccao-portal" },
    async () => prisma.purchaseOrder.findUnique({ where: { publicToken: token } }),
  );
  if (!po) throw new Error("Pedido não encontrado.");
  return runWithTenant({ tenantId: po.tenantId, source: "faccao-portal" }, async () => {
    if (status === "RECEIVED") return receivePurchaseOrder(po.id);
    return prisma.purchaseOrder.update({ where: { id: po.id }, data: { status } });
  });
}
