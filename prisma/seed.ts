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

  return t;
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
