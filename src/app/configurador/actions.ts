"use server";

import { redirect } from "next/navigation";
import { createInstantQuote } from "@/server/configurator";

export async function createInstantQuoteAction(formData: FormData) {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const { token } = await createInstantQuote(slug, {
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    company: String(formData.get("company") || "") || undefined,
    phone: String(formData.get("phone") || "") || undefined,
    selection: {
      model: String(formData.get("model") || "runner"),
      sole: String(formData.get("sole") || "borracha"),
      color: String(formData.get("color") || "midnight"),
      laces: String(formData.get("laces") || "padrao"),
      quantity: Number(formData.get("quantity") || 1),
    },
  });
  redirect(`/portal/${token}`);
}
