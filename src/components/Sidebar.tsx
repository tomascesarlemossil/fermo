"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Tags,
  FileText,
  ClipboardList,
  Factory,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: string };

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  leads: Users,
  customers: Tags,
  quotes: FileText,
  orders: ClipboardList,
  production: Factory,
};

export function Sidebar({
  items,
  user,
  logout,
}: {
  items: NavItem[];
  user: { name?: string | null; roleKey: string };
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  return (
    <aside className="w-60 bg-espresso text-osso flex flex-col sticky top-0 h-screen shrink-0">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center font-cinzel font-bold text-espresso">
          F
        </div>
        <span className="font-cinzel tracking-widest">FERMO</span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = ICONS[it.icon] ?? LayoutDashboard;
          const active = pathname === it.href || (it.href !== "/app" && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-colors ${
                active ? "bg-gold text-espresso font-semibold" : "text-osso/80 hover:bg-esp2"
              }`}
            >
              <Icon size={18} />
              {it.label}
            </Link>
          );
        })}
      </nav>

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
    </aside>
  );
}
