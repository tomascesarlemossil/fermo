import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import { computePrice, DEFAULT_PRICE_PARAMS, volumeDiscountFor } from "@/lib/studio/pricing-core";
import { priceConfiguration } from "@/server/studio/pricing";
import { generateQuoteFromProject, approveProject } from "@/server/studio/projects";

describe("Fermo Studio — preço, orçamento e pedido", () => {
  let tenantId: string;
  let slug: string;
  let modelId: string;

  beforeAll(async () => {
    tenantId = await makeTenant("studio");
    const t = await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.findUnique({ where: { id: tenantId } }),
    );
    slug = t!.slug;

    await asTenant(tenantId, async () => {
      const model = await prisma.shoeModel.create({
        data: { slug: "m1", name: "Modelo Teste", basePrice: 100, minQty: 12, leadTimeDays: 30, status: "PUBLISHED" } as any,
      });
      modelId = model.id;
      const profile = await prisma.priceProfile.create({ data: { name: "PP", active: true } as any });
      const ver = await prisma.priceProfileVersion.create({
        data: { profileId: profile.id, version: 1, active: true, params: DEFAULT_PRICE_PARAMS as any } as any,
      });
      await prisma.volumeDiscount.create({ data: { profileVersionId: ver.id, minQty: 12, maxQty: 29, discountPct: 0 } as any });
      await prisma.studioOption.create({
        data: { group: "SOLE", code: "eva", name: "EVA", price: 25, priceType: "FIXED_PAIR" } as any,
      });
    });
  });

  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  it("núcleo: breakdown determinístico", () => {
    const b = computePrice({
      basePrice: 100, perPairAdd: 0, personalizationPerPair: 0, colorsCount: 1,
      quantity: 12, sampleRequested: false, freight: 0, params: DEFAULT_PRICE_PARAMS, tiers: [],
    });
    expect(b.unit.netUnit).toBe(183.51);
    expect(b.productionSubtotal).toBe(2202.12);
    expect(b.oneOff).toBe(1800);
    expect(b.total).toBe(4002.12);
    expect(b.deposit).toBe(2001.06);
  });

  it("faixa de volume aplica desconto", () => {
    const tiers = [{ minQty: 100, maxQty: 199, discountPct: 0.1 }];
    expect(volumeDiscountFor(150, tiers)).toBe(0.1);
    expect(volumeDiscountFor(50, tiers)).toBe(0);
  });

  it("preço server-side soma opção selecionada", async () => {
    await asTenant(tenantId, async () => {
      const sem = await priceConfiguration(modelId, { quantity: 12 });
      const com = await priceConfiguration(modelId, { quantity: 12, sole: "eva" });
      expect(com.breakdown.unit.options).toBe(25);
      expect(com.breakdown.unit.netUnit).toBeGreaterThan(sem.breakdown.unit.netUnit);
      expect(com.snapshot.chosenOptions.length).toBe(1);
    });
  });

  it("gera orçamento ENVIADO com snapshot e aprova → pedido", async () => {
    const res = await generateQuoteFromProject(slug, {
      modelId,
      selection: { quantity: 12, sole: "eva" },
      contact: { name: "Cliente Studio", email: "studio@marca.com" },
    });
    expect(res.quoteId).toBeTruthy();
    expect(res.total).toBeGreaterThan(0);

    await asTenant(tenantId, async () => {
      const project = await prisma.studioProject.findFirst({ where: { publicToken: res.token } });
      expect(project!.status).toBe("QUOTE_GENERATED");
      expect(project!.priceSnapshot).toBeTruthy();
      const quote = await prisma.quote.findFirst({ where: { id: res.quoteId } });
      expect(quote!.status).toBe("SENT");
    });

    const ord = await approveProject(slug, res.token, "cliente");
    expect(ord.orderId).toBeTruthy();
    await asTenant(tenantId, async () => {
      const project = await prisma.studioProject.findFirst({ where: { publicToken: res.token } });
      expect(project!.status).toBe("CONVERTED_TO_ORDER");
    });
  });
});
