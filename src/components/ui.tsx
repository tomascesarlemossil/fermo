import React from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 px-7 py-6 border-b border-line bg-bone sticky top-0 z-10">
      <div>
        <h1 className="font-cormorant text-3xl text-ink leading-none">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function brl(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TONE: Record<string, string> = {
  gold: "bg-gold/15 text-sela",
  green: "bg-success/15 text-success",
  red: "bg-dangerbg text-danger",
  gray: "bg-osso text-muted",
  blue: "bg-[#3D6473]/15 text-[#3D6473]",
};

export function StatusChip({ label, tone = "gray" }: { label: string; tone?: keyof typeof TONE }) {
  return <span className={`chip ${TONE[tone]}`}>{label}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-10 text-center text-muted">
      <p>{children}</p>
    </div>
  );
}
