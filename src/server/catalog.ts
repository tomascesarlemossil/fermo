import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { z } from "zod";

/**
 * PLM (Fase 2): catálogo de produtos + variantes, materiais, ficha técnica
 * versionada e BOM multinível (com explosão e rollup de custo).
 * Todas as funções assumem contexto de tenant (via withSession/runWithTenant).
 */

// ── Produtos ────────────────────────────────────────────────────

export const productSchema = z.object({
  sku: z.string().min(1, "Informe o SKU."),
  name: z.string().min(2, "Informe o nome."),
  description: z.string().optional(),
  basePrice: z.number().nonnegative().default(0),
  sizeGridId: z.string().optional(),
});

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      sizeGrid: true,
      _count: { select: { variants: true, bomItems: true } },
    },
  });
}

export async function getProduct(id: string) {
  return prisma.product.findFirst({
    where: { id },
    include: {
      sizeGrid: true,
      variants: { orderBy: { name: "asc" } },
      techSheets: { include: { versions: { orderBy: { version: "desc" } } } },
      bomItems: {
        orderBy: { createdAt: "asc" },
        include: { componentMaterial: true, componentProduct: true },
      },
    },
  });
}

export async function createProduct(input: z.infer<typeof productSchema>) {
  const data = productSchema.parse(input);
  return prisma.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      basePrice: data.basePrice,
      sizeGridId: data.sizeGridId || null,
    } as any,
  });
}

export async function updateProduct(id: string, input: Partial<z.infer<typeof productSchema>>) {
  return prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
      ...(input.sizeGridId !== undefined ? { sizeGridId: input.sizeGridId || null } : {}),
    },
  });
}

export async function listSizeGrids() {
  return prisma.sizeGrid.findMany({ orderBy: { name: "asc" } });
}

// ── Variantes ───────────────────────────────────────────────────

export const variantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  attributes: z.record(z.any()).optional(),
});

export async function createVariant(input: z.infer<typeof variantSchema>) {
  const data = variantSchema.parse(input);
  return prisma.productVariant.create({
    data: {
      productId: data.productId,
      sku: data.sku,
      name: data.name,
      color: data.color || null,
      attributes: data.attributes ?? undefined,
    } as any,
  });
}

// ── Materiais ───────────────────────────────────────────────────

export const materialSchema = z.object({
  code: z.string().min(1, "Informe o código."),
  name: z.string().min(2, "Informe o nome."),
  category: z.string().optional(),
  unit: z.string().default("un"),
  costPerUnit: z.number().nonnegative().default(0),
});

export async function listMaterials() {
  return prisma.material.findMany({ orderBy: { name: "asc" } });
}

export async function createMaterial(input: z.infer<typeof materialSchema>) {
  const data = materialSchema.parse(input);
  return prisma.material.create({
    data: {
      code: data.code,
      name: data.name,
      category: data.category || null,
      unit: data.unit,
      costPerUnit: data.costPerUnit,
    } as any,
  });
}

// ── Ficha técnica versionada ────────────────────────────────────

export const techSheetContentSchema = z.object({
  specs: z.record(z.string()).optional(), // ex: { "Forma": "AB-12", "Salto": "3cm" }
  steps: z.array(z.string()).optional(), // roteiro de produção
  observations: z.string().optional(),
});

/**
 * Cria uma nova VERSÃO da ficha técnica do produto (cria a ficha se não existir),
 * incrementando o número da versão. Histórico é imutável (cada versão é um snapshot).
 */
export async function createTechSheetVersion(
  productId: string,
  content: z.infer<typeof techSheetContentSchema>,
  opts?: { title?: string; notes?: string; createdBy?: string },
) {
  const parsed = techSheetContentSchema.parse(content);

  return prisma.$transaction(async (tx) => {
    let sheet = await tx.techSheet.findFirst({ where: { productId } });
    if (!sheet) {
      sheet = await tx.techSheet.create({ data: { productId, currentVersion: 0 } as any });
    }
    const nextVersion = sheet.currentVersion + 1;

    const version = await tx.techSheetVersion.create({
      data: {
        techSheetId: sheet.id,
        version: nextVersion,
        title: opts?.title || null,
        content: parsed,
        notes: opts?.notes || null,
        createdBy: opts?.createdBy || null,
      } as any,
    });

    await tx.techSheet.update({
      where: { id: sheet.id },
      data: { currentVersion: nextVersion },
    });

    return version;
  });
}

// ── BOM (lista de materiais) multinível ─────────────────────────

export const bomItemSchema = z
  .object({
    productId: z.string().min(1),
    type: z.enum(["MATERIAL", "PRODUCT"]),
    componentMaterialId: z.string().optional(),
    componentProductId: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().default("un"),
    note: z.string().optional(),
  })
  .refine(
    (v) =>
      v.type === "MATERIAL" ? !!v.componentMaterialId : !!v.componentProductId,
    { message: "Componente inválido para o tipo selecionado." },
  )
  .refine((v) => v.componentProductId !== v.productId, {
    message: "Um produto não pode ser componente de si mesmo.",
  });

export async function addBomItem(input: z.infer<typeof bomItemSchema>) {
  const data = bomItemSchema.parse(input);
  return prisma.bomItem.create({
    data: {
      productId: data.productId,
      type: data.type,
      componentMaterialId: data.type === "MATERIAL" ? data.componentMaterialId : null,
      componentProductId: data.type === "PRODUCT" ? data.componentProductId : null,
      quantity: data.quantity,
      unit: data.unit,
      note: data.note || null,
    } as any,
  });
}

export async function removeBomItem(id: string) {
  return prisma.bomItem.delete({ where: { id } });
}

export type ExplodedMaterial = {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
};

export type BomExplosion = {
  materials: ExplodedMaterial[];
  totalCost: number;
};

/**
 * Explode a BOM de `productId` para `quantity` unidades, somando o consumo de
 * cada material (inclusive através de subprodutos/montagens) e fazendo o rollup
 * de custo. Protegido contra ciclos por um conjunto de visitados.
 */
export async function explodeBom(
  productId: string,
  quantity = 1,
  _visited: Set<string> = new Set(),
): Promise<BomExplosion> {
  if (_visited.has(productId)) {
    return { materials: [], totalCost: 0 };
  }
  _visited.add(productId);

  const items = await prisma.bomItem.findMany({
    where: { productId },
    include: { componentMaterial: true, componentProduct: true },
  });

  const acc = new Map<string, ExplodedMaterial>();
  let totalCost = 0;

  const addMaterial = (m: ExplodedMaterial) => {
    const existing = acc.get(m.materialId);
    if (existing) {
      existing.quantity += m.quantity;
      existing.totalCost += m.totalCost;
    } else {
      acc.set(m.materialId, { ...m });
    }
    totalCost += m.totalCost;
  };

  for (const item of items) {
    const qty = Number(item.quantity) * quantity;
    if (item.type === "MATERIAL" && item.componentMaterial) {
      const cpu = Number(item.componentMaterial.costPerUnit);
      addMaterial({
        materialId: item.componentMaterial.id,
        code: item.componentMaterial.code,
        name: item.componentMaterial.name,
        unit: item.componentMaterial.unit,
        quantity: qty,
        costPerUnit: cpu,
        totalCost: qty * cpu,
      });
    } else if (item.type === "PRODUCT" && item.componentProductId) {
      const sub = await explodeBom(item.componentProductId, qty, new Set(_visited));
      for (const m of sub.materials) addMaterial(m);
    }
  }

  return { materials: Array.from(acc.values()), totalCost };
}

// ── Catálogo público (configurador no site) ─────────────────────

export async function getActiveCatalog() {
  const [products, materials] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.material.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true },
    }),
  ]);
  return { products, materials };
}

/**
 * Catálogo público para o configurador do site. Resolve o tenant pelo slug
 * (sem escopo) e lê o catálogo DENTRO do escopo desse tenant.
 */
export async function getPublicCatalog(slug: string) {
  const tenant = await runWithTenant(
    { tenantId: "__public__", bypassTenant: true, source: "public-site" },
    async () => prisma.tenant.findUnique({ where: { slug } }),
  );
  if (!tenant) return { products: [], materials: [] };
  return runWithTenant({ tenantId: tenant.id, source: "public-site" }, async () =>
    getActiveCatalog(),
  );
}
