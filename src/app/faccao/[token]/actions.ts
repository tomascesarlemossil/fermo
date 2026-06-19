"use server";

import { revalidatePath } from "next/cache";
import { faccaoUpdateStatusByToken } from "@/server/supply";

export async function faccaoUpdateAction(formData: FormData) {
  const token = String(formData.get("token"));
  const status = String(formData.get("status")) as "SENT" | "RECEIVED";
  await faccaoUpdateStatusByToken(token, status);
  revalidatePath(`/faccao/${token}`);
}
