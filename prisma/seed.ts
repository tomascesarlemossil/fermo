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
  name: string;
  password: string;
  roleKey: string;
  customerId?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { tenantId_email: { tenantId: opts.tenantId, email: opts.email } },
    update: { name: opts.name, passwordHash, roleId: await roleId(opts.roleKey) },
    create: {
      tenantId: opts.tenantId,
      email: opts.email,
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

  await createUser({ tenantId: t, email: "diego@fermo.com.br", name: "Diego", password: "diegoadmin", roleKey: "admin" });
  await createUser({ tenantId: t, email: "comercial@fermo.com.br", name: "Comercial", password: "fermo123", roleKey: "comercial" });
  await createUser({ tenantId: t, email: "producao@fermo.com.br", name: "Produção", password: "fermo123", roleKey: "producao" });

  const grid = await prisma.sizeGrid.upsert({
    where: { id: `${t}-grid-fem` },
    update: {},
    create: { id: `${t}-grid-fem`, tenantId: t, name: "Feminino 33–40", sizes: [33, 34, 35, 36, 37, 38, 39, 40] },
  });

  await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: t, sku: "MOC-001" } },
    update: {},
    create: { tenantId: t, sku: "MOC-001", name: "Mocassim em couro", basePrice: 189.9, sizeGridId: grid.id },
  });
  await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: t, sku: "SCR-001" } },
    update: {},
    create: { tenantId: t, sku: "SCR-001", name: "Scarpin clássico", basePrice: 219.9, sizeGridId: grid.id },
  });

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
