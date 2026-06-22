"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MODELS,
  SOLES,
  COLORS,
  LACES,
  priceFor,
  DEFAULT_SELECTION,
  type Option,
  type ConfigSelection,
} from "@/lib/configurator-options";
import { createInstantQuoteAction } from "./actions";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OptionRow({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div className="label">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`text-left px-3 py-2.5 rounded-[10px] border transition-colors ${
                active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"
              }`}
            >
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-xs text-muted">
                {o.price > 0 ? `+ ${brl(o.price)}` : "incluso"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Configurator3D() {
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState<ConfigSelection>(DEFAULT_SELECTION);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    import("@google/model-viewer").then(() => mounted && setReady(true)).catch(() => mounted && setReady(false));
    return () => {
      mounted = false;
    };
  }, []);

  const pricing = useMemo(() => priceFor(sel), [sel]);
  const colorVariant = COLORS.find((c) => c.id === sel.color)?.variant ?? "midnight";
  const set = (patch: Partial<ConfigSelection>) => setSel((s) => ({ ...s, ...patch }));

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Visualização 3D */}
      <div className="lg:sticky lg:top-24 self-start">
        <div className="card overflow-hidden bg-gradient-to-b from-osso to-bone">
          <div className="aspect-square w-full">
            <model-viewer
              src="/models/shoe.glb"
              alt="Tênis Fermo em 3D"
              camera-controls
              auto-rotate
              auto-rotate-delay={0}
              rotation-per-second="24deg"
              shadow-intensity={1}
              exposure={1}
              variant-name={colorVariant}
              camera-orbit="0deg 75deg 1.6m"
              style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
            />
          </div>
          <div className="px-5 py-3 border-t border-line flex items-center justify-between">
            <span className="text-xs text-muted">
              {ready ? "Arraste para girar · pinça para zoom" : "Carregando 3D…"}
            </span>
            <span className="font-cormorant text-lg">{pricing.parts.model.label}</span>
          </div>
        </div>
      </div>

      {/* Opções + preço + checkout */}
      <div className="space-y-5">
        <OptionRow title="Modelo" options={MODELS} value={sel.model} onChange={(id) => set({ model: id })} />
        <OptionRow title="Cor" options={COLORS} value={sel.color} onChange={(id) => set({ color: id })} />
        <OptionRow title="Solado" options={SOLES} value={sel.sole} onChange={(id) => set({ sole: id })} />
        <OptionRow title="Cadarço" options={LACES} value={sel.laces} onChange={(id) => set({ laces: id })} />

        <div className="card p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="label">Quantidade (pares)</div>
              <input
                type="number"
                min={1}
                value={sel.quantity}
                onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                className="input w-32"
              />
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Valor unitário {brl(pricing.unit)}</div>
              <div className="font-cormorant text-4xl text-ink leading-none">{brl(pricing.total)}</div>
            </div>
          </div>
        </div>

        <form action={createInstantQuoteAction} onSubmit={() => setSubmitting(true)} className="card p-5 grid gap-3">
          <h3 className="font-cormorant text-2xl">Gerar meu orçamento agora</h3>
          <p className="text-sm text-muted -mt-1">
            Preencha seus dados e receba a proposta com o valor completo na hora, pronta para aprovar.
          </p>
          {/* seleção (autoridade de preço é do servidor) */}
          <input type="hidden" name="model" value={sel.model} />
          <input type="hidden" name="sole" value={sel.sole} />
          <input type="hidden" name="color" value={sel.color} />
          <input type="hidden" name="laces" value={sel.laces} />
          <input type="hidden" name="quantity" value={sel.quantity} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Seu nome*</label>
              <input name="name" required className="input" placeholder="Seu nome" />
            </div>
            <div>
              <label className="label">Marca / empresa</label>
              <input name="company" className="input" placeholder="Sua marca" />
            </div>
            <div>
              <label className="label">E-mail*</label>
              <input name="email" type="email" required className="input" placeholder="voce@marca.com" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input name="phone" className="input" placeholder="(16) 9...." />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-gold justify-center text-base py-3 disabled:opacity-60">
            {submitting ? "Gerando..." : `Gerar orçamento · ${brl(pricing.total)}`}
          </button>
          <Link href="/" className="text-center text-muted text-sm hover:text-sela">
            Voltar ao site
          </Link>
        </form>
      </div>
    </div>
  );
}
