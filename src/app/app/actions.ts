"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withSession } from "@/lib/session";
import {
  updateLeadStatus,
  convertLeadToCustomer,
} from "@/server/crm";
import { createQuote, sendQuote, decideQuote, quoteInputSchema } from "@/server/quotes";
import { updateProductionStatus, type ProductionStatus } from "@/server/orders";

export async function setLeadStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as any;
  await withSession(() => updateLeadStatus(id, status), { permission: "lead:write" });
  revalidatePath("/app/crm/leads");
  revalidatePath(`/app/crm/leads/${id}`);
}

export async function convertLeadAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(() => convertLeadToCustomer(id), { permission: "customer:write" });
  revalidatePath("/app/crm/leads");
  revalidatePath(`/app/crm/leads/${id}`);
  revalidatePath("/app/customers");
}

export async function createQuoteAction(formData: FormData) {
  // Itens chegam como linhas paralelas: desc[], qty[], price[]
  const productIds = formData.getAll("productId").map(String);
  const descs = formData.getAll("desc").map(String);
  const qtys = formData.getAll("qty").map((v) => Number(v));
  const prices = formData.getAll("price").map((v) => Number(v));
  const items = descs
    .map((description, i) => ({
      productId: productIds[i] || undefined,
      description,
      quantity: qtys[i] || 0,
      unitPrice: prices[i] || 0,
    }))
    .filter((i) => i.description && i.quantity > 0);

  const input = quoteInputSchema.parse({
    customerId: String(formData.get("customerId")),
    discount: Number(formData.get("discount") || 0),
    notes: String(formData.get("notes") || ""),
    items,
  });

  const quote = await withSession(() => createQuote(input), { permission: "quote:write" });
  revalidatePath("/app/quotes");
  redirect(`/app/quotes/${quote.id}`);
}

export async function sendQuoteAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(() => sendQuote(id), { permission: "quote:send" });
  revalidatePath(`/app/quotes/${id}`);
  revalidatePath("/app/quotes");
}

export async function decideQuoteAction(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision")) as "APPROVED" | "REJECTED";
  await withSession(() => decideQuote(id, decision, "admin"), { permission: "quote:approve" });
  revalidatePath(`/app/quotes/${id}`);
  revalidatePath("/app/quotes");
  revalidatePath("/app/orders");
  revalidatePath("/app/production");
}

export async function setProductionStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ProductionStatus;
  await withSession(() => updateProductionStatus(id, status), { permission: "production:write" });
  revalidatePath("/app/production");
}
