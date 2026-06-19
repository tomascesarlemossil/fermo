"use server";

import { revalidatePath } from "next/cache";
import { withSession } from "@/lib/session";
import {
  createEntry,
  markEntryPaid,
  issueInvoiceForOrder,
  generateCommission,
  createShipment,
  shipShipment,
  deliverShipment,
} from "@/server/finance";

export async function createEntryAction(formData: FormData) {
  await withSession(
    () =>
      createEntry({
        type: String(formData.get("type")) as "RECEIVABLE" | "PAYABLE",
        kind: (String(formData.get("kind") || "OTHER") as any),
        description: String(formData.get("description")),
        amount: Number(formData.get("amount") || 0),
        dueDate: new Date(String(formData.get("dueDate"))),
      }),
    { permission: "finance:write" },
  );
  revalidatePath("/app/finance");
}

export async function markPaidAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(() => markEntryPaid(id), { permission: "finance:write" });
  revalidatePath("/app/finance");
}

export async function issueInvoiceAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await withSession(() => issueInvoiceForOrder(orderId), { permission: "finance:write" });
  revalidatePath(`/app/orders/${orderId}`);
  revalidatePath("/app/invoices");
  revalidatePath("/app/finance");
}

export async function generateCommissionAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  const rate = Number(formData.get("rate") || 0.05);
  await withSession(() => generateCommission(orderId, rate), { permission: "finance:write" });
  revalidatePath(`/app/orders/${orderId}`);
  revalidatePath("/app/finance");
}

export async function createShipmentAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  await withSession(() => createShipment(orderId), { permission: "shipping:write" });
  revalidatePath(`/app/orders/${orderId}`);
  revalidatePath("/app/shipping");
}

export async function shipShipmentAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(
    () =>
      shipShipment(id, {
        carrier: String(formData.get("carrier") || "") || undefined,
        trackingCode: String(formData.get("trackingCode") || "") || undefined,
      }),
    { permission: "shipping:write" },
  );
  revalidatePath("/app/shipping");
}

export async function deliverShipmentAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(() => deliverShipment(id), { permission: "shipping:write" });
  revalidatePath("/app/shipping");
}
