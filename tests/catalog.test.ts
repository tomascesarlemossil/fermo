import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import {
  createProduct,
  createMaterial,
  addBomItem,
  explodeBom,
  createTechSheetVersion,
  getProduct,
} from "@/server/catalog";

/**
 * Fase 2 (PLM): BOM multinível com rollup de custo + ficha técnica versionada.
 */
describe("PLM — BOM multinível e ficha técnica", () => {
  let tenantId: string;

  beforeAll(async () => {
    tenantId = await makeTenant("plm");
  });

  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  it("explode a BOM através de subprodutos e soma o custo", async () => {
    await asTenant(tenantId, async () => {
      const m1 = await createMaterial({ code: "M1", name: "Material 1", unit: "un", costPerUnit: 10 });
      const m2 = await createMaterial({ code: "M2", name: "Material 2", unit: "un", costPerUnit: 5 });

      const sub = await createProduct({ sku: "SUB", name: "Submontagem", basePrice: 0 });
      const main = await createProduct({ sku: "MAIN", name: "Produto final", basePrice: 0 });

      // SUB consome 2x M1
      await addBomItem({ productId: sub.id, type: "MATERIAL", componentMaterialId: m1.id, quantity: 2, unit: "un" });
      // MAIN consome 3x M2 + 4x SUB
      await addBomItem({ productId: main.id, type: "MATERIAL", componentMaterialId: m2.id, quantity: 3, unit: "un" });
      await addBomItem({ productId: main.id, type: "PRODUCT", componentProductId: sub.id, quantity: 4, unit: "un" });

      const exp1 = await explodeBom(main.id, 1);
      const m1row = exp1.materials.find((x) => x.code === "M1")!;
      const m2row = exp1.materials.find((x) => x.code === "M2")!;
      expect(m2row.quantity).toBe(3); // 3 por unidade
      expect(m1row.quantity).toBe(8); // 2 * 4 (via SUB)
      expect(exp1.totalCost).toBe(3 * 5 + 8 * 10); // 95

      const exp10 = await explodeBom(main.id, 10);
      expect(exp10.totalCost).toBe(950);
      expect(exp10.materials.find((x) => x.code === "M1")!.quantity).toBe(80);
    });
  });

  it("versiona a ficha técnica incrementando a versão", async () => {
    await asTenant(tenantId, async () => {
      const p = await createProduct({ sku: "FT-1", name: "Produto FT", basePrice: 0 });

      const v1 = await createTechSheetVersion(p.id, { specs: { Forma: "A" }, steps: ["Corte"] });
      expect(v1.version).toBe(1);

      const v2 = await createTechSheetVersion(
        p.id,
        { specs: { Forma: "B" }, steps: ["Corte", "Montagem"] },
        { notes: "Ajuste de forma" },
      );
      expect(v2.version).toBe(2);

      const full = await getProduct(p.id);
      expect(full!.techSheets[0].currentVersion).toBe(2);
      expect(full!.techSheets[0].versions.length).toBe(2);
      // histórico imutável: versão 1 preservada
      expect(full!.techSheets[0].versions.map((v) => v.version).sort()).toEqual([1, 2]);
    });
  });
});
