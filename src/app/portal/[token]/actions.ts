"use server";

import { revalidatePath } from "next/cache";
import { decideQuoteByToken } from "@/server/quotes";

export async function portalDecideAction(formData: FormData) {
  const token = String(formData.get("token"));
  const decision = String(formData.get("decision")) as "APPROVED" | "REJECTED";
  const decidedBy = String(formData.get("decidedBy") || "cliente");
  await decideQuoteByToken(token, decision, decidedBy);
  revalidatePath(`/portal/${token}`);
}
