"use server";

import { revalidatePath } from "next/cache";
import { withSession } from "@/lib/session";
import { reportProduction, createInspection } from "@/server/mes";

export async function reportProductionAction(formData: FormData) {
  const id = String(formData.get("opId"));
  await withSession(
    (session) =>
      reportProduction({
        stepId: String(formData.get("stepId")),
        quantity: Number(formData.get("quantity") || 0),
        operator: String(formData.get("operator") || "") || session.name || undefined,
        source: String(formData.get("source") || "admin"),
      }),
    { permission: "production:write" },
  );
  revalidatePath(`/app/production/${id}`);
  revalidatePath("/app/production");
}

export async function createInspectionAction(formData: FormData) {
  const id = String(formData.get("opId"));
  // defeitos no formato "tipo | quantidade | severidade" por linha
  const defectsRaw = String(formData.get("defects") || "");
  const defects = defectsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [type, qty, sev] = l.split("|").map((x) => x.trim());
      const severity = (["LOW", "MEDIUM", "HIGH"].includes((sev || "").toUpperCase())
        ? (sev || "LOW").toUpperCase()
        : "LOW") as "LOW" | "MEDIUM" | "HIGH";
      return { type, quantity: Number(qty) > 0 ? Number(qty) : 1, severity };
    })
    .filter((d) => d.type);

  await withSession(
    (session) =>
      createInspection({
        productionOrderId: id,
        stepId: String(formData.get("stepId") || "") || undefined,
        inspector: String(formData.get("inspector") || "") || session.name || undefined,
        sampleSize: Number(formData.get("sampleSize") || 0),
        approvedQty: Number(formData.get("approvedQty") || 0),
        rejectedQty: Number(formData.get("rejectedQty") || 0),
        notes: String(formData.get("notes") || "") || undefined,
        defects,
      }),
    { permission: "quality:write" },
  );
  revalidatePath(`/app/production/${id}`);
  revalidatePath("/app/quality");
}
