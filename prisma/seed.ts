import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLES } from "../src/lib/rbac";

/**
 * Seed: catálogo global de RBAC + dois tenants (o segundo habilita o teste de
 * isolamento) com usuários e dados de demonstração.
 *
 * Usa um PrismaClient "cru" (sem as extensions multi-tenant) de propósito:
 * o seed precisa escrever em múltiplos tenants e definir tenantId explicitamente.
 */
const prisma = new PrismaClient();

async function seedRbac() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  for (const [key, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: def.name, description: def.description },
      create: { key, name: def.name, description: def.description },
    });
    for (const permKey of def.permissions) {
      const perm = await prisma.permission.findUnique({ where: { key: permKey } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
}

async function roleId(key: string) {
  const r = await prisma.role.findUnique({ where: { key } });
  if (!r) throw new Error(`Role '${key}' não encontrado (rode seedRbac primeiro).`);
  return r.id;
}

async function createUser(opts: {
  tenantId: string;
  email: string;
  username?: string;
  name: string;
  password: string;
  roleKey: string;
  customerId?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { tenantId_email: { tenantId: opts.tenantId, email: opts.email } },
    update: {
      name: opts.name,
      username: opts.username ?? null,
      passwordHash,
      roleId: await roleId(opts.roleKey),
    },
    create: {
      tenantId: opts.tenantId,
      email: opts.email,
      username: opts.username ?? null,
      name: opts.name,
      passwordHash,
      roleId: await roleId(opts.roleKey),
      customerId: opts.customerId,
    },
  });
}

async function seedTenantFermo() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "fermo" },
    update: { name: "Fermo Calçados" },
    create: { slug: "fermo", name: "Fermo Calçados" },
  });
  const t = tenant.id;

  await prisma.company.upsert({
    where: { id: `${t}-company` },
    update: {},
    create: {
      id: `${t}-company`,
      tenantId: t,
      name: "Fermo · Private Label Shoes",
      email: "contato@fermocalcados.com.br",
      phone: "+55 16 99999-0000",
    },
  });

  await createUser({ tenantId: t, email: "diego@fermo.com.br", username: "diego", name: "Diego", password: "2026", roleKey: "admin" });
  await createUser({ tenantId: t, email: "comercial@fermo.com.br", name: "Comercial", password: "fermo123", roleKey: "comercial" });
  await createUser({ tenantId: t, email: "producao@fermo.com.br", name: "Produção", password: "fermo123", roleKey: "producao" });

  const grid = await prisma.sizeGrid.upsert({
    where: { id: `${t}-grid-fem` },
    update: {},
    create: { id: `${t}-grid-fem`, tenantId: t, name: "Feminino 33–40", sizes: [33, 34, 35, 36, 37, 38, 39, 40] },
  });

  const mocassim = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: t, sku: "MOC-001" } },
    update: {},
    create: { tenantId: t, sku: "MOC-001", name: "Mocassim em couro", basePrice: 189.9, sizeGridId: grid.id },
  });
  await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: t, sku: "SCR-001" } },
    update: {},
    create: { tenantId: t, sku: "SCR-001", name: "Scarpin clássico", basePrice: 219.9, sizeGridId: grid.id },
  });

  // ── PLM (Fase 2): materiais, variante, BOM e ficha técnica ──
  const materials = [
    { code: "COURO-LISO", name: "Couro liso", category: "couro", unit: "m2", costPerUnit: 38.5 },
    { code: "FORRO-BEGE", name: "Forro bege", category: "forro", unit: "m2", costPerUnit: 12.0 },
    { code: "SOLADO-BORR", name: "Solado borracha", category: "solado", unit: "par", costPerUnit: 22.0 },
    { code: "PALMILHA", name: "Palmilha montagem", category: "aviamento", unit: "par", costPerUnit: 6.5 },
    { code: "COLA-PU", name: "Cola PU", category: "aviamento", unit: "kg", costPerUnit: 45.0 },
  ];
  const matIds: Record<string, string> = {};
  for (const m of materials) {
    const row = await prisma.material.upsert({
      where: { tenantId_code: { tenantId: t, code: m.code } },
      update: { name: m.name, category: m.category, unit: m.unit, costPerUnit: m.costPerUnit },
      create: { tenantId: t, ...m },
    });
    matIds[m.code] = row.id;
  }

  await prisma.productVariant.upsert({
    where: { tenantId_sku: { tenantId: t, sku: "MOC-001-PRETO" } },
    update: {},
    create: {
      tenantId: t,
      productId: mocassim.id,
      sku: "MOC-001-PRETO",
      name: "Preto / Couro liso",
      color: "Preto",
      attributes: { couro: "liso", cor: "preto", solado: "borracha" },
    },
  });

  // BOM do mocassim (por par)
  const bom = [
    { code: "COURO-LISO", quantity: 0.18, unit: "m2" },
    { code: "FORRO-BEGE", quantity: 0.15, unit: "m2" },
    { code: "SOLADO-BORR", quantity: 1, unit: "par" },
    { code: "PALMILHA", quantity: 1, unit: "par" },
    { code: "COLA-PU", quantity: 0.05, unit: "kg" },
  ];
  const existingBom = await prisma.bomItem.count({ where: { productId: mocassim.id } });
  if (existingBom === 0) {
    for (const b of bom) {
      await prisma.bomItem.create({
        data: {
          tenantId: t,
          productId: mocassim.id,
          type: "MATERIAL",
          componentMaterialId: matIds[b.code],
          quantity: b.quantity,
          unit: b.unit,
        },
      });
    }
  }

  // Ficha técnica (versão 1)
  const sheet = await prisma.techSheet.upsert({
    where: { tenantId_productId: { tenantId: t, productId: mocassim.id } },
    update: {},
    create: { tenantId: t, productId: mocassim.id, currentVersion: 0 },
  });
  if (sheet.currentVersion === 0) {
    await prisma.techSheetVersion.create({
      data: {
        tenantId: t,
        techSheetId: sheet.id,
        version: 1,
        title: "Ficha técnica inicial",
        content: {
          specs: { Forma: "AB-12", Salto: "2cm", Costura: "Manual" },
          steps: ["Corte", "Pesponto", "Montagem", "Acabamento"],
          observations: "Couro selecionado; conferir tonalidade do lote.",
        },
      },
    });
    await prisma.techSheet.update({ where: { id: sheet.id }, data: { currentVersion: 1 } });
  }

  // ── Suprimentos (Fase 4): fornecedores + estoque inicial ──
  await prisma.supplier.upsert({
    where: { id: `${t}-sup-couro` },
    update: {},
    create: { id: `${t}-sup-couro`, tenantId: t, name: "Curtume Franca", kind: "MATERIAL", email: "vendas@curtumefranca.com.br" },
  });
  await prisma.supplier.upsert({
    where: { id: `${t}-sup-faccao` },
    update: {},
    create: { id: `${t}-sup-faccao`, tenantId: t, name: "Facção Bom Pesponto", kind: "FACCAO", email: "contato@bompesponto.com.br" },
  });

  // estoque inicial de couro liso
  const couro = matIds["COURO-LISO"];
  if (couro) {
    const bal = await prisma.stockBalance.findFirst({ where: { tenantId: t, refType: "MATERIAL", refId: couro } });
    if (!bal) {
      await prisma.stockBalance.create({
        data: { tenantId: t, refType: "MATERIAL", refId: couro, quantity: 20, reserved: 0 },
      });
      await prisma.stockMovement.create({
        data: { tenantId: t, refType: "MATERIAL", refId: couro, type: "IN", quantity: 20, note: "Estoque inicial (seed)" },
      });
    }
  }

  const customer = await prisma.customer.upsert({
    where: { id: `${t}-cust-demo` },
    update: {},
    create: {
      id: `${t}-cust-demo`,
      tenantId: t,
      name: "Marca Demo Ltda",
      email: "compras@marcademo.com.br",
      phone: "+55 11 98888-0000",
    },
  });

  await createUser({
    tenantId: t,
    email: "cliente@marcademo.com.br",
    name: "Cliente Demo",
    password: "fermo123",
    roleKey: "cliente",
    customerId: customer.id,
  });

  // Automação de exemplo (Fase 6)
  const ruleExists = await prisma.automationRule.findFirst({ where: { tenantId: t, trigger: "lead.created" } });
  if (!ruleExists) {
    await prisma.automationRule.create({
      data: {
        tenantId: t,
        name: "Avisar novo lead",
        trigger: "lead.created",
        action: "notify",
        params: { title: "Novo lead: {name}", body: "Empresa {company}" },
        active: true,
      },
    });
  }

  // Lead de exemplo (vindo do site)
  await prisma.lead.upsert({
    where: { id: `${t}-lead-demo` },
    update: {},
    create: {
      id: `${t}-lead-demo`,
      tenantId: t,
      name: "Ana Souza",
      company: "Atelier Aurora",
      email: "ana@aurora.com.br",
      phone: "+55 16 90000-0000",
      message: "Gostaria de orçar 200 pares de mocassim.",
      source: "site",
      status: "NEW",
    },
  });

  await seedStudio(t);
  return t;
}

/** Fermo Studio — catálogo demonstrativo + tabela de preço versionada. */
async function seedStudio(t: string) {
  const cats = [
    { slug: "tenis", name: "Tênis & Sneakers", audience: "unissex", order: 1 },
    { slug: "casual", name: "Casual & Sapatênis", audience: "masculino", order: 2 },
    { slug: "social", name: "Social & Clássicos", audience: "masculino", order: 3 },
    { slug: "botas", name: "Botas", audience: "unissex", order: 4 },
    { slug: "sandalias", name: "Sandálias & Mules", audience: "unissex", order: 5 },
  ];
  const catId: Record<string, string> = {};
  for (const c of cats) {
    const row = await prisma.shoeCategory.upsert({
      where: { tenantId_slug: { tenantId: t, slug: c.slug } },
      update: { name: c.name, audience: c.audience, order: c.order },
      create: { tenantId: t, ...c },
    });
    catId[c.slug] = row.id;
  }

  const editableMeshes = {
    editableMeshes: [
      { key: "upper_main", label: "Cabedal principal", meshNames: ["Upper_Main"], colorEnabled: true, logoEnabled: false },
      { key: "side_panel", label: "Painel lateral", meshNames: ["Side_Left", "Side_Right"], colorEnabled: true, logoEnabled: true },
      { key: "tongue", label: "Lingueta", meshNames: ["Tongue"], colorEnabled: true, logoEnabled: true },
      { key: "laces", label: "Cadarço", meshNames: ["Laces"], colorEnabled: true, logoEnabled: false },
      { key: "sole", label: "Solado", meshNames: ["Outsole", "Midsole"], colorEnabled: true, logoEnabled: false },
    ],
    note: "DEMO — substituir pelos nomes reais das malhas do GLB do modelo.",
  };

  const models = [
    { slug: "tenis-casual-masculino", name: "Tênis Casual Masculino", cat: "tenis", basePrice: 169, minQty: 12, lead: 30, badge: "mais escolhido" },
    { slug: "tenis-casual-feminino", name: "Tênis Casual Feminino", cat: "tenis", basePrice: 165, minQty: 12, lead: 30, badge: null },
    { slug: "sneaker-esportivo", name: "Sneaker Esportivo", cat: "tenis", basePrice: 189, minQty: 24, lead: 35, badge: "lançamento" },
    { slug: "sapatenis", name: "Sapatênis", cat: "casual", basePrice: 175, minQty: 12, lead: 30, badge: null },
    { slug: "mocassim", name: "Mocassim", cat: "casual", basePrice: 199, minQty: 12, lead: 32, badge: "premium" },
    { slug: "oxford", name: "Oxford", cat: "social", basePrice: 229, minQty: 12, lead: 35, badge: "premium" },
    { slug: "chelsea-boot", name: "Chelsea Boot", cat: "botas", basePrice: 259, minQty: 12, lead: 40, badge: null },
    { slug: "sandalia-masculina", name: "Sandália Masculina", cat: "sandalias", basePrice: 139, minQty: 12, lead: 25, badge: "produção rápida" },
  ];
  for (const m of models) {
    await prisma.shoeModel.upsert({
      where: { tenantId_slug: { tenantId: t, slug: m.slug } },
      update: { name: m.name, basePrice: m.basePrice, minQty: m.minQty, leadTimeDays: m.lead, badge: m.badge ?? null, categoryId: catId[m.cat] },
      create: {
        tenantId: t,
        slug: m.slug,
        name: m.name,
        categoryId: catId[m.cat],
        description: `Modelo ${m.name} para private label. Personalize materiais, cores, solado e marca.`,
        basePrice: m.basePrice,
        minQty: m.minQty,
        leadTimeDays: m.lead,
        badge: m.badge ?? null,
        status: "PUBLISHED",
        modelUrl: "/models/shoe.glb",
        thumbnailUrl: "/img/snk.jpg",
        editableMeshes: editableMeshes as any,
        isDemo: true,
        seoTitle: `${m.name} private label | Fermo Studio`,
        seoDescription: `Crie seu ${m.name} com sua marca. Configure em 3D e receba orçamento na hora.`,
      },
    });
  }

  type O = { group: string; code: string; name: string; price: number; priceType?: string; colorHex?: string; variant?: string; minQty?: number; lead?: number; order?: number };
  const options: O[] = [
    // Materiais
    { group: "MATERIAL", code: "couro-floater", name: "Couro Floater Premium", price: 12.4, colorHex: "#5b3a21", lead: 3, order: 1 },
    { group: "MATERIAL", code: "couro-liso", name: "Couro Liso", price: 0, colorHex: "#2a2118", order: 2 },
    { group: "MATERIAL", code: "camurca", name: "Camurça", price: 8, colorHex: "#9a7b53", lead: 2, order: 3 },
    { group: "MATERIAL", code: "sintetico", name: "Sintético Eco", price: -10, colorHex: "#3b3b3b", order: 4 },
    // Cores (variantes do GLB demo)
    { group: "COLOR", code: "preto", name: "Preto Midnight", price: 0, colorHex: "#161616", variant: "midnight", order: 1 },
    { group: "COLOR", code: "areia", name: "Areia / Caramelo", price: 0, colorHex: "#c9a06a", variant: "beach", order: 2 },
    { group: "COLOR", code: "bicolor", name: "Bicolor Street", price: 15, colorHex: "#6b4f2a", variant: "street", order: 3 },
    // Solados
    { group: "SOLE", code: "borracha", name: "Borracha clássica", price: 0, order: 1 },
    { group: "SOLE", code: "eva", name: "EVA ultraleve", price: 25, lead: 2, order: 2 },
    { group: "SOLE", code: "tratorada", name: "Tratorada", price: 45, lead: 3, order: 3 },
    { group: "SOLE", code: "couro-sola", name: "Solado de couro", price: 35, lead: 4, order: 4 },
    // Forros
    { group: "LINING", code: "sintetico", name: "Forro sintético", price: 0, order: 1 },
    { group: "LINING", code: "tecido", name: "Forro têxtil", price: 8, order: 2 },
    { group: "LINING", code: "couro", name: "Forro de couro", price: 15, lead: 2, order: 3 },
    // Palmilhas
    { group: "INSOLE", code: "padrao", name: "Palmilha padrão", price: 0, order: 1 },
    { group: "INSOLE", code: "memory", name: "Palmilha memory foam", price: 12, order: 2 },
    { group: "INSOLE", code: "couro", name: "Palmilha de couro", price: 18, order: 3 },
    // Cadarços
    { group: "LACE", code: "padrao", name: "Cadarço padrão", price: 0, order: 1 },
    { group: "LACE", code: "encerado", name: "Cadarço encerado", price: 10, order: 2 },
    { group: "LACE", code: "premium", name: "Cadarço premium colorido", price: 18, order: 3 },
    // Ilhós
    { group: "EYELET", code: "metal", name: "Ilhós metálico", price: 0, order: 1 },
    { group: "EYELET", code: "latao", name: "Ilhós latão envelhecido", price: 6, order: 2 },
    // Embalagem
    { group: "PACKAGING", code: "caixa-padrao", name: "Caixa padrão", price: 0, order: 1 },
    { group: "PACKAGING", code: "premium", name: "Caixa premium", price: 9, order: 2 },
    { group: "PACKAGING", code: "kraft", name: "Caixa kraft sustentável", price: 4, order: 3 },
    // Acabamentos
    { group: "FINISH", code: "costura-contraste", name: "Costura em contraste", price: 4, order: 1 },
    { group: "FINISH", code: "verniz", name: "Acabamento envernizado", price: 6, order: 2 },
    // Personalizações
    { group: "CUSTOMIZATION", code: "logo-lateral", name: "Logo na lateral", price: 5, order: 1 },
    { group: "CUSTOMIZATION", code: "logo-palmilha", name: "Logo na palmilha", price: 3, order: 2 },
    { group: "CUSTOMIZATION", code: "gravacao", name: "Gravação a laser", price: 8, order: 3 },
    { group: "CUSTOMIZATION", code: "bordado", name: "Bordado (mín. 30 pares)", price: 12, minQty: 30, order: 4 },
    { group: "CUSTOMIZATION", code: "embalagem-personalizada", name: "Embalagem personalizada (dev)", price: 250, priceType: "FIXED_DEV", order: 5 },
  ];
  for (const o of options) {
    await prisma.studioOption.upsert({
      where: { tenantId_group_code: { tenantId: t, group: o.group as any, code: o.code } },
      update: { name: o.name, price: o.price, priceType: (o.priceType as any) ?? "FIXED_PAIR", colorHex: o.colorHex ?? null, variant: o.variant ?? null, leadTimeDays: o.lead ?? 0, minQty: o.minQty ?? 0, order: o.order ?? 0 },
      create: {
        tenantId: t,
        group: o.group as any,
        code: o.code,
        name: o.name,
        price: o.price,
        priceType: (o.priceType as any) ?? "FIXED_PAIR",
        colorHex: o.colorHex ?? null,
        variant: o.variant ?? null,
        leadTimeDays: o.lead ?? 0,
        minQty: o.minQty ?? 0,
        order: o.order ?? 0,
        isDemo: true,
      },
    });
  }

  // Tabela de preço (perfil + versão + faixas)
  const profile = await prisma.priceProfile.upsert({
    where: { id: `${t}-pp` },
    update: { name: "Tabela DEMO 2026" },
    create: { id: `${t}-pp`, tenantId: t, name: "Tabela DEMO 2026", active: true },
  });
  const ver = await prisma.priceProfileVersion.upsert({
    where: { profileId_version: { profileId: profile.id, version: 1 } },
    update: {},
    create: {
      id: `${t}-ppv1`,
      tenantId: t,
      profileId: profile.id,
      version: 1,
      active: true,
      params: {
        wastePct: 0.08, indirectPct: 0.05, marginPct: 0.45, taxPct: 0.12, depositPct: 0.5,
        validityDays: 15, development: 1200, modeling: 600, sampleCost: 350,
        complexityPerColor: 3.5, leadDevDays: 10, leadSampleDays: 12, leadProductionDays: 30,
      },
    },
  });
  const tierCount = await prisma.volumeDiscount.count({ where: { profileVersionId: ver.id } });
  if (tierCount === 0) {
    const tiers = [
      { minQty: 12, maxQty: 29, discountPct: 0 },
      { minQty: 30, maxQty: 49, discountPct: 0.03 },
      { minQty: 50, maxQty: 99, discountPct: 0.06 },
      { minQty: 100, maxQty: 199, discountPct: 0.1 },
      { minQty: 200, maxQty: 499, discountPct: 0.14 },
      { minQty: 500, maxQty: 999, discountPct: 0.18 },
      { minQty: 1000, maxQty: null, discountPct: 0.22 },
    ];
    for (const tr of tiers) {
      await prisma.volumeDiscount.create({ data: { tenantId: t, profileVersionId: ver.id, ...tr } });
    }
  }
}

async function seedTenantAtelie() {
  // Segundo tenant — usado pelo teste de isolamento multi-tenant.
  const tenant = await prisma.tenant.upsert({
    where: { slug: "atelie" },
    update: { name: "Ateliê Parceiro" },
    create: { slug: "atelie", name: "Ateliê Parceiro" },
  });
  const t = tenant.id;

  await createUser({ tenantId: t, email: "admin@atelie.com.br", name: "Admin Ateliê", password: "atelie123", roleKey: "admin" });

  await prisma.customer.upsert({
    where: { id: `${t}-cust-secret` },
    update: {},
    create: { id: `${t}-cust-secret`, tenantId: t, name: "Cliente Confidencial do Ateliê" },
  });

  return t;
}

async function main() {
  console.log("→ RBAC (permissões + papéis)…");
  await seedRbac();
  console.log("→ Tenant Fermo…");
  await seedTenantFermo();
  console.log("→ Tenant Ateliê (isolamento)…");
  await seedTenantAtelie();
  console.log("✓ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
