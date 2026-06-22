import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant } from "./helpers";
import { createInstantQuote } from "@/server/configurator";
import { getQuoteByToken } from "@/server/quotes";
import { priceFor, MODELS, SOLES, COLORS, LACES } from "@/lib/configurator-options";

describe("Configurador 3D → orçamento instantâneo", () => {
  let tenantId: string;
  let slug: string;

  beforeAll(async () => {
    tenantId = await makeTenant("cfg");
    const t = await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.findUnique({ where: { id: tenantId } }),
    );
    slug = t!.slug;
  });
  afterAll(async () => {
    await runWithTenant({ tenantId: "__t__", bypassTenant: true }, () =>
      prisma.tenant.delete({ where: { id: tenantId } }),
    );
  });

  it("calcula preço = base + sola + cor + cadarço, vezes quantidade", () => {
    const sel = { model: "trail", sole: "trator", color: "street", laces: "premium", quantity: 10 };
    const expectedUnit =
      MODELS.find((m) => m.id === "trail")!.price +
      SOLES.find((s) => s.id === "trator")!.price +
      COLORS.find((c) => c.id === "street")!.price +
      LACES.find((l) => l.id === "premium")!.price;
    const p = priceFor(sel);
    expect(p.unit).toBe(expectedUnit);
    expect(p.total).toBe(expectedUnit * 10);
  });

  it("gera cliente + orçamento ENVIADO e o portal mostra o valor", async () => {
    const res = await createInstantQuote(slug, {
      name: "Cliente Site",
      email: "site@marca.com.br",
      company: "Marca Site",
      selection: { model: "runner", sole: "eva", color: "beach", laces: "encerado", quantity: 20 },
    });
    expect(res.token).toBeTruthy();
    expect(res.number).toMatch(/^ORC-\d{4}-\d{4}$/);

    const unit = 289 + 25 + 0 + 10; // runner + eva + beach + encerado
    expect(res.total).toBe(unit * 20);

    const quote = await getQuoteByToken(res.token);
    expect(quote).not.toBeNull();
    expect(quote!.status).toBe("SENT");
    expect(quote!.tenantId).toBe(tenantId);
    expect(Number(quote!.items[0].lineTotal)).toBe(unit * 20);
  });
});
