"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Tags,
  FileText,
  ClipboardList,
  Factory,
  Boxes,
  Layers,
  ShieldCheck,
  Warehouse,
  ShoppingCart,
  Calculator,
  Truck,
  Wallet,
  Receipt,
  Send,
  BarChart3,
  Sparkles,
  Zap,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: string; group?: string };

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  leads: Users,
  customers: Tags,
  catalog: Boxes,
  materials: Layers,
  quotes: FileText,
  orders: ClipboardList,
  production: Factory,
  quality: ShieldCheck,
  stock: Warehouse,
  purchasing: ShoppingCart,
  mrp: Calculator,
  suppliers: Truck,
  finance: Wallet,
  invoices: Receipt,
  shipping: Send,
  reports: BarChart3,
  insights: Sparkles,
  automations: Zap,
};

function groupOrder(items: NavItem[]): string[] {
  const seen: string[] = [];
  for (const it of items) {
    const g = it.group ?? "";
    if (!seen.includes(g)) seen.push(g);
  }
  return seen;
}

function Nav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const groups = groupOrder(items);
  return (
    <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
      {groups.map((group) => (
        <div key={group}>
          {group && (
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-osso/35">
              {group}
            </div>
          )}
          <div className="space-y-0.5">
            {items
              .filter((it) => (it.group ?? "") === group)
              .map((it) => {
                const Icon = ICONS[it.icon] ?? LayoutDashboard;
                const active =
                  pathname === it.href || (it.href !== "/app" && pathname.startsWith(it.href));
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-colors ${
                      active ? "bg-gold text-espresso font-semibold" : "text-osso/80 hover:bg-esp2"
                    }`}
                  >
                    <Icon size={17} />
                    {it.label}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Image src="/img/logo.png" alt="Fermo" width={36} height={36} className="rounded-full" />
      <span className="font-cinzel tracking-widest text-osso text-sm">FERMO</span>
    </div>
  );
}

export function AdminShell({
  items,
  user,
  logout,
  children,
}: {
  items: NavItem[];
  user: { name?: string | null; roleKey: string };
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-bone">
      {/* Sidebar fixa (desktop) */}
      <aside className="hidden lg:flex w-60 bg-espresso text-osso flex-col sticky top-0 h-screen shrink-0">
        <div className="px-5 py-4 border-b border-white/5">
          <Brand />
        </div>
        <Nav items={items} pathname={pathname} />
        <Footer user={user} logout={logout} />
      </aside>

      {/* Drawer (mobile) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-espresso/60" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[82%] bg-espresso text-osso flex flex-col h-full">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="text-osso/70">
                <X size={22} />
              </button>
            </div>
            <Nav items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
            <Footer user={user} logout={logout} />
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-espresso text-osso flex items-center justify-between px-4 h-14">
          <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-1 -ml-1">
            <Menu size={24} />
          </button>
          <Brand />
          <span className="w-6" />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function Footer({
  user,
  logout,
}: {
  user: { name?: string | null; roleKey: string };
  logout: () => Promise<void>;
}) {
  return (
    <div className="p-3 border-t border-white/5">
      <div className="px-3 py-2 text-xs text-osso/60">
        <div className="text-osso/90">{user.name}</div>
        <div className="capitalize">{user.roleKey}</div>
      </div>
      <form action={logout}>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-osso/80 hover:bg-esp2 w-full">
          <LogOut size={18} /> Sair
        </button>
      </form>
      <Link href="/" className="block px-3 py-2 text-xs text-osso/50 hover:text-gold">
        Ver o site
      </Link>
    </div>
  );
}
