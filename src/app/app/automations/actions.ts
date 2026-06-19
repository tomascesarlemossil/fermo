"use server";

import { revalidatePath } from "next/cache";
import { withSession } from "@/lib/session";
import { createRule, toggleRule } from "@/server/automations";

export async function createRuleAction(formData: FormData) {
  await withSession(
    () =>
      createRule({
        name: String(formData.get("name")),
        trigger: String(formData.get("trigger")) as any,
        action: "notify",
        title: String(formData.get("title")),
        body: String(formData.get("body") || "") || undefined,
      }),
    { permission: "automation:write" },
  );
  revalidatePath("/app/automations");
}

export async function toggleRuleAction(formData: FormData) {
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  await withSession(() => toggleRule(id, active), { permission: "automation:write" });
  revalidatePath("/app/automations");
}
