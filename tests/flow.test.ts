import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";
import { makeTenant, asTenant } from "./helpers";
import { captureLeadForTenant, convertLeadToCustomer, updateLeadStatus } from "@/server/crm";
import { createQuote, sendQuote, decideQuoteByToken, getQuote } from "@/server/quotes";

/**
 * Gate da Fase 1 — caminho feliz ponta a ponta com banco real:
 * site (lead) → CRM → orçamento → portal (aprova) → pedido → ordem de produção.
 */
describe("fluxo comercial ponta a ponta", () => {
  let tenantId: string;
  let slug: string;

  beforeAll(async () => {
    tenantId = await makeTenant("flow");
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

  it("lead do site → cliente → orçamento → aprovação gera pedido e OP", async () => {
    // 1) Lead capturado pelo site (resolve tenant pelo slug)
    const lead = await captureLeadForTenant(slug, {
      name: "João Marca",
      company: "Marca do João",
      email: "joao@marca.com.br",
      message: "300 pares",
      source: "site",
    });
    expect(lead.tenantId).toBe(tenantId);

    await asTenant(tenantId, async () => {
      // 2) CRM: qualifica e converte em cliente
      await updateLeadStatus(lead.id, "QUALIFIED");
      const customer = await convertLeadToCustomer(lead.id);
      expect(customer).not.toBeNull();

      // 3) Orçamento com cálculo básico
      const quote = await createQuote({
        customerId: customer!.id,
        discount: 100,
        notes: "Primeira proposta",
        items: [
          { description: "Mocassim couro", quantity: 200, unitPrice: 150 },
          { description: "Scarpin", quantity: 100, unitPrice: 180 },
        ],
      });
      expect(quote.number).toMatch(/^ORC-\d{4}-\d{4}$/);

      // 4) Envio ao cliente
      const sent = await sendQuote(quote.id);
      expect(sent.status).toBe("SENT");

      // total esperado: 200*150 + 100*180 - 100 = 30000 + 18000 - 100 = 47900
      const full = await getQuote(quote.id);
      const latest = full!.versions[0];
      expect(Number(latest.total)).toBe(47900);
      expect(full!.publicToken).toBeTruthy();

      // 5) Portal: cliente aprova pelo token → gera pedido + OP
      const order = await decideQuoteByToken(full!.publicToken, "APPROVED", "joao@marca.com.br");
      expect(order).not.toBeNull();
      expect(order!.number).toMatch(/^PED-\d{4}-\d{4}$/);

      const afterApproval = await getQuote(quote.id);
      expect(afterApproval!.status).toBe("APPROVED");
      expect(afterApproval!.salesOrder).not.toBeNull();
      expect(afterApproval!.salesOrder!.productionOrders.length).toBe(1);
      const op = afterApproval!.salesOrder!.productionOrders[0];
      expect(op.number).toMatch(/^OP-\d{4}-\d{4}$/);
      expect(op.quantity).toBe(300); // 200 + 100
      expect(Number(afterApproval!.salesOrder!.total)).toBe(48000); // soma das linhas (sem desconto no pedido)
    });
  });

  it("não pode aprovar orçamento que não foi enviado", async () => {
    await asTenant(tenantId, async () => {
      const customer = await prisma.customer.create({ data: { name: "Outro" } as any });
      const quote = await createQuote({
        customerId: customer.id,
        items: [{ description: "Bota", quantity: 10, unitPrice: 300 }],
      });
      const full = await getQuote(quote.id);
      await expect(decideQuoteByToken(full!.publicToken, "APPROVED")).rejects.toThrow();
    });
  });
});
