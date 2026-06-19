import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { can, type PermissionKey } from "@/lib/rbac";
import { AdminShell, type NavItem } from "@/components/AdminShell";

const ALL_NAV: (NavItem & { perm?: PermissionKey })[] = [
  { href: "/app", label: "Painel", icon: "dashboard" },
  { href: "/app/crm/leads", label: "Leads", icon: "leads", perm: "lead:read" },
  { href: "/app/customers", label: "Clientes", icon: "customers", perm: "customer:read" },
  { href: "/app/catalog", label: "Catálogo", icon: "catalog", perm: "product:read" },
  { href: "/app/materials", label: "Materiais", icon: "materials", perm: "material:read" },
  { href: "/app/quotes", label: "Orçamentos", icon: "quotes", perm: "quote:read" },
  { href: "/app/orders", label: "Pedidos", icon: "orders", perm: "order:read" },
  { href: "/app/production", label: "Produção", icon: "production", perm: "production:read" },
  { href: "/app/quality", label: "Qualidade", icon: "quality", perm: "quality:read" },
  { href: "/app/stock", label: "Estoque", icon: "stock", perm: "stock:read" },
  { href: "/app/purchasing", label: "Compras", icon: "purchasing", perm: "purchase:read" },
  { href: "/app/mrp", label: "MRP", icon: "mrp", perm: "purchase:read" },
  { href: "/app/suppliers", label: "Fornecedores", icon: "suppliers", perm: "supplier:read" },
  { href: "/app/finance", label: "Financeiro", icon: "finance", perm: "finance:read" },
  { href: "/app/invoices", label: "Faturamento", icon: "invoices", perm: "finance:read" },
  { href: "/app/shipping", label: "Expedição", icon: "shipping", perm: "shipping:read" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const items: NavItem[] = ALL_NAV.filter((n) => !n.perm || can(session, n.perm)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AdminShell items={items} user={{ name: session.name, roleKey: session.roleKey }} logout={logout}>
      {children}
    </AdminShell>
  );
}
