"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  computePrice,
  aggregateSelection,
  type PriceParams,
  type VolumeTier,
  type OptionLite,
} from "@/lib/studio/pricing-core";
import { generateStudioQuoteAction } from "../../actions";

type Opt = {
  id: string;
  code: string;
  name: string;
  price: number;
  priceType: string;
  colorHex?: string | null;
  variant?: string | null;
  leadTimeDays: number;
  minQty: number;
};
type Model = {
  id: string;
  slug: string;
  name: string;
  modelUrl?: string | null;
  basePrice: number;
  minQty: number;
  leadTimeDays: number;
  isDemo: boolean;
};

const GROUP_LABEL: Record<string, string> = {
  MATERIAL: "Material",
  COLOR: "Cor",
  SOLE: "Solado",
  LINING: "Forro",
  INSOLE: "Palmilha",
  LACE: "Cadarço",
  EYELET: "Ilhós",
  PACKAGING: "Embalagem",
};
const SINGLE_GROUPS = ["MATERIAL", "COLOR", "SOLE", "LINING", "INSOLE", "LACE", "EYELET", "PACKAGING"] as const;
const SELECT_KEY: Record<string, string> = {
  MATERIAL: "material", COLOR: "color", SOLE: "sole", LINING: "lining",
  INSOLE: "insole", LACE: "lace", EYELET: "eyelet", PACKAGING: "packaging",
};
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const GRADE_SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43];

export function StudioConfigurator({
  model,
  optionsByGroup,
  params,
  tiers,
}: {
  model: Model;
  optionsByGroup: Record<string, Opt[]>;
  params: PriceParams;
  tiers: VolumeTier[];
}) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sel, setSel] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = { quantity: Math.max(12, model.minQty), finishes: [], customizations: [], sampleRequested: false };
    for (const g of SINGLE_GROUPS) {
      const first = optionsByGroup[g]?.[0];
      if (first) init[SELECT_KEY[g]] = first.code;
    }
    return init;
  });
  const [useGrade, setUseGrade] = useState(false);
  const [grade, setGrade] = useState<Record<number, number>>({});

  useEffect(() => {
    let on = true;
    import("@google/model-viewer").then(() => on && setReady(true)).catch(() => {});
    return () => { on = false; };
  }, []);

  const allOptions: OptionLite[] = useMemo(
    () =>
      Object.values(optionsByGroup)
        .flat()
        .map((o) => ({ group: groupOf(o, optionsByGroup), code: o.code, name: o.name, price: o.price, priceType: o.priceType, minQty: o.minQty })),
    [optionsByGroup],
  );

  const breakdown = useMemo(() => {
    const agg = aggregateSelection(model.basePrice, allOptions, { ...(sel as any) });
    return computePrice({
      basePrice: model.basePrice,
      perPairAdd: agg.perPairAdd,
      personalizationPerPair: agg.personalizationPerPair,
      colorsCount: agg.colorsCount,
      quantity: sel.quantity,
      sampleRequested: !!sel.sampleRequested,
      freight: 0,
      params: { ...params, development: params.development + agg.devExtra },
      tiers,
    });
  }, [sel, allOptions, model.basePrice, params, tiers]);

  const colorVariant = optionsByGroup.COLOR?.find((c) => c.code === sel.color)?.variant ?? undefined;
  const gradeSum = Object.values(grade).reduce((s, n) => s + (Number(n) || 0), 0);
  const gradeValid = !useGrade || gradeSum === sel.quantity;
  const belowMin = sel.quantity < model.minQty;

  const set = (patch: Record<string, any>) => setSel((s) => ({ ...s, ...patch }));
  const toggleMulti = (key: "finishes" | "customizations", code: string) =>
    setSel((s) => {
      const arr: string[] = s[key] ?? [];
      return { ...s, [key]: arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code] };
    });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* 3D */}
      <div className="lg:sticky lg:top-24 self-start space-y-3">
        <div className="card overflow-hidden bg-gradient-to-b from-osso to-bone">
          <div className="aspect-square w-full">
            <model-viewer
              src={model.modelUrl ?? "/models/shoe.glb"}
              alt={`${model.name} em 3D`}
              camera-controls
              auto-rotate
              auto-rotate-delay={0}
              rotation-per-second="22deg"
              shadow-intensity={1}
              exposure={1}
              variant-name={colorVariant}
              camera-orbit="0deg 75deg 1.6m"
              style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
            />
          </div>
          <div className="px-5 py-3 border-t border-line flex items-center justify-between">
            <span className="text-xs text-muted">{ready ? "Arraste para girar · pinça para zoom" : "Carregando 3D…"}</span>
            {model.isDemo && <span className="chip bg-osso text-muted">modelo 3D DEMO</span>}
          </div>
        </div>
        {/* resumo de preço fixo no mobile via card */}
        <div className="card p-4 flex items-center justify-between lg:hidden">
          <span className="text-xs text-muted">Total estimado</span>
          <span className="font-cormorant text-2xl">{brl(breakdown.total)}</span>
        </div>
      </div>

      {/* Opções + preço + checkout */}
      <div className="space-y-5">
        {SINGLE_GROUPS.filter((g) => optionsByGroup[g]?.length).map((g) => (
          <div key={g}>
            <div className="label">{GROUP_LABEL[g]}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {optionsByGroup[g].map((o) => {
                const active = sel[SELECT_KEY[g]] === o.code;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set({ [SELECT_KEY[g]]: o.code })}
                    className={`text-left px-3 py-2.5 rounded-[10px] border transition-colors ${active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      {o.colorHex && <span className="w-4 h-4 rounded-full border border-line" style={{ background: o.colorHex }} />}
                      <span className="text-sm font-medium">{o.name}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {priceLabel(o)}
                      {o.leadTimeDays ? ` · +${o.leadTimeDays}d` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {(["FINISH", "CUSTOMIZATION"] as const).map((g) =>
          optionsByGroup[g]?.length ? (
            <div key={g}>
              <div className="label">{g === "FINISH" ? "Acabamentos" : "Personalizações"}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {optionsByGroup[g].map((o) => {
                  const key = g === "FINISH" ? "finishes" : "customizations";
                  const active = (sel[key] ?? []).includes(o.code);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleMulti(key as any, o.code)}
                      className={`text-left px-3 py-2.5 rounded-[10px] border transition-colors ${active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"}`}
                    >
                      <div className="text-sm font-medium">{o.name}</div>
                      <div className="text-xs text-muted">{priceLabel(o)}{o.minQty ? ` · mín. ${o.minQty}` : ""}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null,
        )}

        {/* Quantidade + amostra */}
        <div className="card p-5 space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="label">Quantidade (pares)</div>
              <input type="number" min={1} value={sel.quantity} onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })} className="input w-32" />
              {belowMin && <p className="text-xs text-danger mt-1">Mínimo do modelo: {model.minQty} — sujeito a análise técnica.</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sel.sampleRequested} onChange={(e) => set({ sampleRequested: e.target.checked })} />
              Incluir amostra
            </label>
          </div>

          <button type="button" onClick={() => setUseGrade((v) => !v)} className="text-sm text-sela hover:underline">
            {useGrade ? "Ocultar grade de numeração" : "Distribuir por numeração (grade)"}
          </button>
          {useGrade && (
            <div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {GRADE_SIZES.map((sz) => (
                  <div key={sz} className="text-center">
                    <div className="text-[10px] text-muted">{sz}</div>
                    <input
                      type="number"
                      min={0}
                      value={grade[sz] ?? ""}
                      onChange={(e) => setGrade((gr) => ({ ...gr, [sz]: Number(e.target.value) || 0 }))}
                      className="input px-1 py-1 text-center text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-2 ${gradeValid ? "text-muted" : "text-danger"}`}>
                Soma da grade: {gradeSum} / {sel.quantity} {gradeValid ? "✓" : "(deve igualar a quantidade)"}
              </p>
            </div>
          )}
        </div>

        {/* Resumo de preço */}
        <div className="card p-5">
          <h3 className="font-cormorant text-xl mb-3">Orçamento estimado</h3>
          <dl className="text-sm space-y-1">
            <Row k="Preço unitário" v={brl(breakdown.unit.netUnit)} />
            {breakdown.unit.discountPct > 0 && <Row k={`Desconto volume (${(breakdown.unit.discountPct * 100).toFixed(0)}%)`} v={`− ${brl(breakdown.unit.discount * breakdown.quantity)}`} muted />}
            <Row k={`Produção (${breakdown.quantity} pares)`} v={brl(breakdown.productionSubtotal)} />
            <Row k="Desenvolvimento + modelagem" v={brl(breakdown.development + breakdown.modeling)} muted />
            {breakdown.sample > 0 && <Row k="Amostra" v={brl(breakdown.sample)} muted />}
            <div className="flex justify-between font-cormorant text-2xl pt-2 border-t border-line">
              <span>Total</span><span>{brl(breakdown.total)}</span>
            </div>
            <Row k={`Sinal (${(params.depositPct * 100).toFixed(0)}%)`} v={brl(breakdown.deposit)} muted />
            <Row k="Prazo estimado" v={`${breakdown.leadTimeDays} dias`} muted />
          </dl>
          <p className="text-xs text-muted mt-3">Valores podem depender de validação técnica em personalizações especiais. Frete a calcular.</p>
        </div>

        {/* Checkout */}
        <form action={generateStudioQuoteAction} onSubmit={() => setSubmitting(true)} className="card p-5 grid gap-3">
          <h3 className="font-cormorant text-2xl">Gerar orçamento agora</h3>
          <input type="hidden" name="modelId" value={model.id} />
          <input type="hidden" name="modelSlug" value={model.slug} />
          {SINGLE_GROUPS.map((g) => (<input key={g} type="hidden" name={SELECT_KEY[g]} value={sel[SELECT_KEY[g]] ?? ""} />))}
          <input type="hidden" name="finishes" value={(sel.finishes ?? []).join(",")} />
          <input type="hidden" name="customizations" value={(sel.customizations ?? []).join(",")} />
          <input type="hidden" name="quantity" value={sel.quantity} />
          <input type="hidden" name="sampleRequested" value={sel.sampleRequested ? "1" : ""} />
          <input type="hidden" name="grade" value={useGrade ? JSON.stringify(grade) : ""} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Seu nome*</label><input name="name" required className="input" /></div>
            <div><label className="label">Marca / empresa</label><input name="company" className="input" /></div>
            <div><label className="label">E-mail*</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Telefone / WhatsApp</label><input name="phone" className="input" /></div>
          </div>
          <button type="submit" disabled={submitting || !gradeValid} className="btn-gold justify-center text-base py-3 disabled:opacity-60">
            {submitting ? "Gerando..." : `Gerar orçamento · ${brl(breakdown.total)}`}
          </button>
          {!gradeValid && <p className="text-xs text-danger text-center">Ajuste a grade para igualar a quantidade.</p>}
          <Link href="/studio/modelos" className="text-center text-muted text-sm hover:text-sela">Trocar de modelo</Link>
        </form>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
function priceLabel(o: Opt) {
  if (o.priceType === "PERCENT") return o.price > 0 ? `+ ${(o.price * 100).toFixed(0)}%` : "incluso";
  if (o.priceType === "FIXED_DEV") return `+ ${brl(o.price)} (dev)`;
  if (o.price === 0) return "incluso";
  return o.price > 0 ? `+ ${brl(o.price)}` : `− ${brl(Math.abs(o.price))}`;
}
function groupOf(o: Opt, byGroup: Record<string, Opt[]>): string {
  for (const [g, list] of Object.entries(byGroup)) if (list.some((x) => x.id === o.id)) return g;
  return "MATERIAL";
}
