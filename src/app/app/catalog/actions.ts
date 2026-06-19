"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withSession } from "@/lib/session";
import {
  createProduct,
  createMaterial,
  createVariant,
  addBomItem,
  removeBomItem,
  createTechSheetVersion,
} from "@/server/catalog";

export async function createProductAction(formData: FormData) {
  const product = await withSession(
    () =>
      createProduct({
        sku: String(formData.get("sku")),
        name: String(formData.get("name")),
        description: String(formData.get("description") || ""),
        basePrice: Number(formData.get("basePrice") || 0),
        sizeGridId: String(formData.get("sizeGridId") || "") || undefined,
      }),
    { permission: "product:write" },
  );
  revalidatePath("/app/catalog");
  redirect(`/app/catalog/${product.id}`);
}

export async function createMaterialAction(formData: FormData) {
  await withSession(
    () =>
      createMaterial({
        code: String(formData.get("code")),
        name: String(formData.get("name")),
        category: String(formData.get("category") || "") || undefined,
        unit: String(formData.get("unit") || "un"),
        costPerUnit: Number(formData.get("costPerUnit") || 0),
      }),
    { permission: "material:write" },
  );
  revalidatePath("/app/materials");
}

export async function createVariantAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  await withSession(
    () =>
      createVariant({
        productId,
        sku: String(formData.get("sku")),
        name: String(formData.get("name")),
        color: String(formData.get("color") || "") || undefined,
      }),
    { permission: "product:write" },
  );
  revalidatePath(`/app/catalog/${productId}`);
}

export async function addBomItemAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const type = String(formData.get("type")) as "MATERIAL" | "PRODUCT";
  await withSession(
    () =>
      addBomItem({
        productId,
        type,
        componentMaterialId:
          type === "MATERIAL" ? String(formData.get("componentMaterialId")) : undefined,
        componentProductId:
          type === "PRODUCT" ? String(formData.get("componentProductId")) : undefined,
        quantity: Number(formData.get("quantity") || 0),
        unit: String(formData.get("unit") || "un"),
        note: String(formData.get("note") || "") || undefined,
      }),
    { permission: "product:write" },
  );
  revalidatePath(`/app/catalog/${productId}`);
}

export async function removeBomItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const productId = String(formData.get("productId"));
  await withSession(() => removeBomItem(id), { permission: "product:write" });
  revalidatePath(`/app/catalog/${productId}`);
}

export async function createTechSheetVersionAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  // specs no formato "Chave: valor" por linha; steps por linha
  const specsRaw = String(formData.get("specs") || "");
  const stepsRaw = String(formData.get("steps") || "");
  const specs: Record<string, string> = {};
  for (const line of specsRaw.split("\n")) {
    const [k, ...rest] = line.split(":");
    if (k && rest.length) specs[k.trim()] = rest.join(":").trim();
  }
  const steps = stepsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await withSession(
    (session) =>
      createTechSheetVersion(
        productId,
        { specs, steps, observations: String(formData.get("observations") || "") || undefined },
        { notes: String(formData.get("notes") || "") || undefined, createdBy: session.name ?? undefined },
      ),
    { permission: "product:write" },
  );
  revalidatePath(`/app/catalog/${productId}`);
}
