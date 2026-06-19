"use client";

import Link from "next/link";
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
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: string };

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
};

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? LayoutDashboard;
        const active = pathname === it.href || (it.href !== "/app" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-colors ${
              active ? "bg-gold text-espresso font-semibold" : "text-osso/80 hover:bg-esp2"
            }`}
          >
            <Icon size={18} />
            {it.label}
          </Link>
        );
      })}
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center font-cinzel font-bold text-espresso">
        F
      </div>
      <span className="font-cinzel tracking-widest text-osso">FERMO</span>
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

  // fecha o drawer ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-bone">
      {/* Sidebar fixa (desktop) */}
      <aside className="hidden lg:flex w-60 bg-espresso text-osso flex-col sticky top-0 h-screen shrink-0">
        <div className="px-5 py-5 border-b border-white/5">
          <Brand />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks items={items} pathname={pathname} />
        </nav>
        <Footer user={user} logout={logout} />
      </aside>

      {/* Drawer (mobile) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-espresso/60" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[80%] bg-espresso text-osso flex flex-col h-full">
            <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="text-osso/70">
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <Footer user={user} logout={logout} />
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar mobile */}
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
