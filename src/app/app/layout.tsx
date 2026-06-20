import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { can, type PermissionKey } from "@/lib/rbac";
import { AdminShell, type NavItem } from "@/components/AdminShell";

const ALL_NAV: (NavItem & { perm?: PermissionKey })[] = [
  { href: "/app", label: "Painel", icon: "dashboard", group: "Geral" },

  { href: "/app/crm/leads", label: "Leads", icon: "leads", perm: "lead:read", group: "Comercial" },
  { href: "/app/customers", label: "Clientes", icon: "customers", perm: "customer:read", group: "Comercial" },
  { href: "/app/quotes", label: "Orçamentos", icon: "quotes", perm: "quote:read", group: "Comercial" },
  { href: "/app/orders", label: "Pedidos", icon: "orders", perm: "order:read", group: "Comercial" },

  { href: "/app/catalog", label: "Catálogo", icon: "catalog", perm: "product:read", group: "Produção" },
  { href: "/app/materials", label: "Materiais", icon: "materials", perm: "material:read", group: "Produção" },
  { href: "/app/production", label: "Produção", icon: "production", perm: "production:read", group: "Produção" },
  { href: "/app/quality", label: "Qualidade", icon: "quality", perm: "quality:read", group: "Produção" },

  { href: "/app/stock", label: "Estoque", icon: "stock", perm: "stock:read", group: "Suprimentos" },
  { href: "/app/purchasing", label: "Compras", icon: "purchasing", perm: "purchase:read", group: "Suprimentos" },
  { href: "/app/mrp", label: "MRP", icon: "mrp", perm: "purchase:read", group: "Suprimentos" },
  { href: "/app/suppliers", label: "Fornecedores", icon: "suppliers", perm: "supplier:read", group: "Suprimentos" },

  { href: "/app/finance", label: "Financeiro", icon: "finance", perm: "finance:read", group: "Financeiro" },
  { href: "/app/invoices", label: "Faturamento", icon: "invoices", perm: "finance:read", group: "Financeiro" },
  { href: "/app/shipping", label: "Expedição", icon: "shipping", perm: "shipping:read", group: "Financeiro" },

  { href: "/app/reports", label: "Relatórios", icon: "reports", perm: "report:read", group: "Gestão" },
  { href: "/app/insights", label: "Assistente IA", icon: "insights", perm: "report:read", group: "Gestão" },
  { href: "/app/automations", label: "Automações", icon: "automations", perm: "automation:read", group: "Gestão" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const items: NavItem[] = ALL_NAV.filter((n) => !n.perm || can(session, n.perm)).map(
    ({ href, label, icon, group }) => ({ href, label, icon, group }),
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
