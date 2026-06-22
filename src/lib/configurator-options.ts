/**
 * Opções e preços do configurador 3D (módulo puro — sem Prisma — para ser usado
 * tanto no client quanto no server). Preços por par, em BRL.
 */

export type Option = { id: string; label: string; price: number; hint?: string; variant?: string };

export const MODELS: Option[] = [
  { id: "runner", label: "Fermo Runner", price: 289, hint: "Tênis casual de corrida urbana" },
  { id: "court", label: "Fermo Court", price: 329, hint: "Cano baixo, inspiração quadra" },
  { id: "trail", label: "Fermo Trail", price: 369, hint: "Estrutura reforçada, outdoor" },
];

export const SOLES: Option[] = [
  { id: "borracha", label: "Borracha clássica", price: 0 },
  { id: "eva", label: "EVA ultraleve", price: 25 },
  { id: "trator", label: "Tratorada", price: 45 },
];

// color.variant casa com as variantes do modelo 3D (KHR_materials_variants)
export const COLORS: Option[] = [
  { id: "midnight", label: "Preto Midnight", price: 0, variant: "midnight" },
  { id: "beach", label: "Areia / Caramelo", price: 0, variant: "beach" },
  { id: "street", label: "Bicolor Street", price: 15, variant: "street" },
];

export const LACES: Option[] = [
  { id: "padrao", label: "Cadarço padrão", price: 0 },
  { id: "encerado", label: "Cadarço encerado", price: 10 },
  { id: "premium", label: "Cadarço premium colorido", price: 18 },
];

export type ConfigSelection = {
  model: string;
  sole: string;
  color: string;
  laces: string;
  quantity: number;
};

function find(list: Option[], id: string): Option | undefined {
  return list.find((o) => o.id === id);
}

/** Preço unitário (por par) e total a partir da seleção. Fonte única de verdade. */
export function priceFor(sel: ConfigSelection) {
  const model = find(MODELS, sel.model) ?? MODELS[0];
  const sole = find(SOLES, sel.sole) ?? SOLES[0];
  const color = find(COLORS, sel.color) ?? COLORS[0];
  const laces = find(LACES, sel.laces) ?? LACES[0];
  const unit = model.price + sole.price + color.price + laces.price;
  const quantity = Math.max(1, Math.floor(sel.quantity || 1));
  return {
    unit,
    quantity,
    total: unit * quantity,
    parts: { model, sole, color, laces },
  };
}

export function describe(sel: ConfigSelection) {
  const p = priceFor(sel);
  return `${p.parts.model.label} · ${p.parts.color.label} · sola ${p.parts.sole.label} · ${p.parts.laces.label}`;
}

export const DEFAULT_SELECTION: ConfigSelection = {
  model: "runner",
  sole: "borracha",
  color: "midnight",
  laces: "padrao",
  quantity: 12,
};
