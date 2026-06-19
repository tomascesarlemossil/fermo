"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withSession } from "@/lib/session";
import {
  createSupplier,
  createPurchaseOrder,
  sendPurchaseOrder,
  receivePurchaseOrder,
  applyStockMovement,
} from "@/server/supply";

export async function createSupplierAction(formData: FormData) {
  await withSession(
    () =>
      createSupplier({
        name: String(formData.get("name")),
        cnpj: String(formData.get("cnpj") || "") || undefined,
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || "") || undefined,
        kind: (String(formData.get("kind") || "MATERIAL") as "MATERIAL" | "FACCAO"),
        notes: String(formData.get("notes") || "") || undefined,
      }),
    { permission: "supplier:write" },
  );
  revalidatePath("/app/suppliers");
}

export async function createPurchaseOrderAction(formData: FormData) {
  const materialIds = formData.getAll("materialId").map(String);
  const descs = formData.getAll("desc").map(String);
  const qtys = formData.getAll("qty").map((v) => Number(v));
  const costs = formData.getAll("cost").map((v) => Number(v));
  const items = descs
    .map((description, i) => ({
      materialId: materialIds[i] || undefined,
      description,
      quantity: qtys[i] || 0,
      unitCost: costs[i] || 0,
    }))
    .filter((i) => i.description && i.quantity > 0);

  const po = await withSession(
    () =>
      createPurchaseOrder({
        supplierId: String(formData.get("supplierId")),
        notes: String(formData.get("notes") || "") || undefined,
        items,
      }),
    { permission: "purchase:write" },
  );
  revalidatePath("/app/purchasing");
  redirect(`/app/purchasing/${po.id}`);
}

export async function sendPurchaseOrderAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(() => sendPurchaseOrder(id), { permission: "purchase:write" });
  revalidatePath(`/app/purchasing/${id}`);
}

export async function receivePurchaseOrderAction(formData: FormData) {
  const id = String(formData.get("id"));
  await withSession(() => receivePurchaseOrder(id), { permission: "purchase:write" });
  revalidatePath(`/app/purchasing/${id}`);
  revalidatePath("/app/stock");
}

export async function adjustStockAction(formData: FormData) {
  const refType = String(formData.get("refType")) as "MATERIAL" | "PRODUCT";
  const refId = String(formData.get("refId"));
  await withSession(
    () =>
      applyStockMovement({
        refType,
        refId,
        type: "ADJUST",
        quantity: Number(formData.get("delta") || 0),
        note: "Ajuste manual",
      }),
    { permission: "stock:write" },
  );
  revalidatePath("/app/stock");
}
