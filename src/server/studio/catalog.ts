import { prisma } from "@/lib/prisma";
import { runWithTenant } from "@/lib/tenant-context";

/** Catálogo do Fermo Studio: categorias, modelos, opções e perfil de preço. */

export async function listCategories() {
  return prisma.shoeCategory.findMany({ where: { active: true }, orderBy: { order: "asc" } });
}

export async function listModels() {
  return prisma.shoeModel.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    include: { category: true },
  });
}

export async function getModelBySlug(slug: string) {
  return prisma.shoeModel.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true, assets: true },
  });
}

export async function getModelById(id: string) {
  return prisma.shoeModel.findFirst({ where: { id }, include: { category: true, assets: true } });
}

export async function listOptions() {
  return prisma.studioOption.findMany({ where: { active: true }, orderBy: [{ group: "asc" }, { order: "asc" }] });
}

export async function listOptionsByGroup() {
  const all = await listOptions();
  const map: Record<string, typeof all> = {};
  for (const o of all) (map[o.group] ??= []).push(o);
  return map;
}

/** Perfil de preço ativo + versão ativa + faixas de volume. */
export async function getActivePriceProfile() {
  const profile = await prisma.priceProfile.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  if (!profile) return null;
  const version = await prisma.priceProfileVersion.findFirst({
    where: { profileId: profile.id, active: true },
    orderBy: { version: "desc" },
    include: { tiers: { orderBy: { minQty: "asc" } } },
  });
  return version ? { profile, version } : null;
}

/** Versão pública (resolve tenant pelo slug) — usada pelas páginas /studio. */
export async function publicStudioData(slug: string) {
  const tenant = await runWithTenant(
    { tenantId: "__public__", bypassTenant: true, source: "studio" },
    async () => prisma.tenant.findUnique({ where: { slug } }),
  );
  if (!tenant) return null;
  return runWithTenant({ tenantId: tenant.id, source: "studio" }, async () => ({
    tenantId: tenant.id,
    categories: await listCategories(),
    models: await listModels(),
  }));
}

export async function publicModel(slug: string, modelSlug: string) {
  const tenant = await runWithTenant(
    { tenantId: "__public__", bypassTenant: true, source: "studio" },
    async () => prisma.tenant.findUnique({ where: { slug } }),
  );
  if (!tenant) return null;
  return runWithTenant({ tenantId: tenant.id, source: "studio" }, async () => {
    const model = await getModelBySlug(modelSlug);
    if (!model) return null;
    const optionsByGroup = await listOptionsByGroup();
    const active = await getActivePriceProfile();
    return { tenantId: tenant.id, model, optionsByGroup, priceProfile: active };
  });
}
