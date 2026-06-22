"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateQuoteFromProject, approveProject, saveProject } from "@/server/studio/projects";

function slug() {
  return process.env.DEFAULT_TENANT_SLUG || "fermo";
}

function parseSelection(fd: FormData) {
  const csv = (v: FormDataEntryValue | null) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
  let grade: Record<string, number> | undefined;
  const graveRaw = String(fd.get("grade") || "");
  if (graveRaw) {
    try {
      grade = JSON.parse(graveRaw);
    } catch {
      grade = undefined;
    }
  }
  return {
    material: String(fd.get("material") || "") || undefined,
    color: String(fd.get("color") || "") || undefined,
    sole: String(fd.get("sole") || "") || undefined,
    insole: String(fd.get("insole") || "") || undefined,
    lining: String(fd.get("lining") || "") || undefined,
    lace: String(fd.get("lace") || "") || undefined,
    eyelet: String(fd.get("eyelet") || "") || undefined,
    packaging: String(fd.get("packaging") || "") || undefined,
    finishes: csv(fd.get("finishes")),
    customizations: csv(fd.get("customizations")),
    quantity: Number(fd.get("quantity") || 1),
    sampleRequested: String(fd.get("sampleRequested") || "") === "1",
    grade,
  };
}

export async function generateStudioQuoteAction(formData: FormData) {
  const { token } = await generateQuoteFromProject(slug(), {
    token: String(formData.get("token") || "") || undefined,
    modelId: String(formData.get("modelId")),
    selection: parseSelection(formData) as any,
    contact: {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      company: String(formData.get("company") || "") || undefined,
      phone: String(formData.get("phone") || "") || undefined,
    },
  });
  redirect(`/studio/orcamento/${token}`);
}

export async function saveStudioProjectAction(formData: FormData) {
  const { token } = await saveProject(slug(), {
    token: String(formData.get("token") || "") || undefined,
    modelId: String(formData.get("modelId")),
    name: String(formData.get("name") || "") || undefined,
    selection: parseSelection(formData) as any,
  });
  redirect(`/studio/projeto/${token}`);
}

export async function approveStudioAction(formData: FormData) {
  const token = String(formData.get("token"));
  await approveProject(slug(), token, String(formData.get("decidedBy") || "") || undefined);
  revalidatePath(`/studio/orcamento/${token}`);
}
