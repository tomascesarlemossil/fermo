/**
 * Motor de preço do Fermo Studio — núcleo PURO (sem Prisma) para ser testável e
 * reutilizável. O servidor é a fonte de verdade; o front apenas exibe.
 */

export type PriceParams = {
  wastePct: number; // perdas sobre o custo base (ex.: 0.08)
  indirectPct: number; // custos indiretos (ex.: 0.05)
  marginPct: number; // margem (ex.: 0.45)
  taxPct: number; // impostos (ex.: 0.12)
  depositPct: number; // sinal (ex.: 0.5)
  validityDays: number; // validade do orçamento
  development: number; // custo de desenvolvimento (único)
  modeling: number; // custo de modelagem (único)
  sampleCost: number; // custo de amostra (único, se solicitada)
  complexityPerColor: number; // custo por cor adicional (por par)
  leadDevDays: number;
  leadSampleDays: number;
  leadProductionDays: number;
};

export const DEFAULT_PRICE_PARAMS: PriceParams = {
  wastePct: 0.08,
  indirectPct: 0.05,
  marginPct: 0.45,
  taxPct: 0.12,
  depositPct: 0.5,
  validityDays: 15,
  development: 1200,
  modeling: 600,
  sampleCost: 350,
  complexityPerColor: 3.5,
  leadDevDays: 10,
  leadSampleDays: 12,
  leadProductionDays: 30,
};

export type VolumeTier = { minQty: number; maxQty: number | null; discountPct: number };

export type PriceInput = {
  basePrice: number; // preço/custo base do modelo, por par
  perPairAdd: number; // soma das opções por par (materiais, solado, forro, cadarço...)
  personalizationPerPair: number; // personalizações por par
  colorsCount: number; // nº de cores distintas escolhidas (complexidade)
  quantity: number;
  sampleRequested: boolean;
  freight: number; // 0 = a calcular
  params: PriceParams;
  tiers: VolumeTier[];
};

export type PriceBreakdown = {
  development: number;
  modeling: number;
  sample: number;
  unit: {
    base: number;
    options: number;
    personalization: number;
    complexity: number;
    waste: number;
    indirect: number;
    margin: number;
    tax: number;
    grossUnit: number; // antes do desconto de volume
    discountPct: number;
    discount: number;
    netUnit: number; // preço unitário final
  };
  quantity: number;
  productionSubtotal: number; // netUnit × quantidade
  oneOff: number; // development + modeling + sample
  freight: number;
  total: number;
  deposit: number;
  balance: number;
  leadTimeDays: number;
  validityDays: number;
};

// ── Agregação da seleção (pura, usada no servidor e no cliente) ──

export type OptionLite = {
  group: string;
  code: string;
  name: string;
  price: number;
  priceType: string; // FIXED_PAIR | PERCENT | FIXED_DEV
  minQty?: number;
};

export type SelectionLite = {
  material?: string;
  color?: string;
  sole?: string;
  insole?: string;
  lining?: string;
  lace?: string;
  eyelet?: string;
  packaging?: string;
  finishes?: string[];
  customizations?: string[];
  quantity: number;
};

export const SINGLE_GROUP_KEYS: Record<string, keyof SelectionLite> = {
  MATERIAL: "material",
  COLOR: "color",
  SOLE: "sole",
  INSOLE: "insole",
  LINING: "lining",
  LACE: "lace",
  EYELET: "eyelet",
  PACKAGING: "packaging",
};

export type Aggregated = {
  perPairAdd: number;
  personalizationPerPair: number;
  devExtra: number;
  colorsCount: number;
  chosen: { group: string; code: string; name: string; price: number; priceType: string }[];
  needsReview: boolean;
};

export function aggregateSelection(base: number, options: OptionLite[], selection: SelectionLite): Aggregated {
  const byKey = new Map(options.map((o) => [`${o.group}:${o.code}`, o]));
  let perPairAdd = 0;
  let personalizationPerPair = 0;
  let devExtra = 0;
  let needsReview = false;
  const chosen: Aggregated["chosen"] = [];

  const consume = (group: string, code?: string) => {
    if (!code) return;
    const opt = byKey.get(`${group}:${code}`);
    if (!opt) return;
    chosen.push({ group, code, name: opt.name, price: opt.price, priceType: opt.priceType });
    if (opt.priceType === "FIXED_DEV") devExtra += opt.price;
    else {
      const add = opt.priceType === "PERCENT" ? base * opt.price : opt.price;
      if (group === "FINISH" || group === "CUSTOMIZATION") personalizationPerPair += add;
      else perPairAdd += add;
    }
    if (opt.minQty && selection.quantity < opt.minQty) needsReview = true;
  };

  for (const [group, key] of Object.entries(SINGLE_GROUP_KEYS)) consume(group, selection[key] as string | undefined);
  for (const code of selection.finishes ?? []) consume("FINISH", code);
  for (const code of selection.customizations ?? []) consume("CUSTOMIZATION", code);

  const colorsCount = 1 + ((selection.customizations?.length ?? 0) > 0 ? 1 : 0);
  return { perPairAdd, personalizationPerPair, devExtra, colorsCount, chosen, needsReview };
}

export function volumeDiscountFor(qty: number, tiers: VolumeTier[]): number {
  const t = tiers.find((x) => qty >= x.minQty && (x.maxQty == null || qty <= x.maxQty));
  return t ? t.discountPct : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computePrice(input: PriceInput): PriceBreakdown {
  const p = input.params;
  const qty = Math.max(1, Math.floor(input.quantity || 1));

  const base = input.basePrice;
  const options = input.perPairAdd;
  const personalization = input.personalizationPerPair;
  const complexity = Math.max(0, input.colorsCount - 1) * p.complexityPerColor;

  const costBase = base + options;
  const waste = costBase * p.wastePct;
  const indirect = costBase * p.indirectPct;

  const unitBeforeMargin = costBase + waste + indirect + personalization + complexity;
  const margin = unitBeforeMargin * p.marginPct;
  const tax = (unitBeforeMargin + margin) * p.taxPct;
  const grossUnit = unitBeforeMargin + margin + tax;

  const discountPct = volumeDiscountFor(qty, input.tiers);
  const discount = grossUnit * discountPct;
  const netUnit = round2(grossUnit - discount);

  const productionSubtotal = round2(netUnit * qty);
  const sample = input.sampleRequested ? p.sampleCost : 0;
  const oneOff = round2(p.development + p.modeling + sample);
  const freight = input.freight || 0;
  const total = round2(productionSubtotal + oneOff + freight);
  const deposit = round2(total * p.depositPct);
  const balance = round2(total - deposit);

  const leadTimeDays = p.leadDevDays + (input.sampleRequested ? p.leadSampleDays : 0) + p.leadProductionDays;

  return {
    development: p.development,
    modeling: p.modeling,
    sample,
    unit: {
      base: round2(base),
      options: round2(options),
      personalization: round2(personalization),
      complexity: round2(complexity),
      waste: round2(waste),
      indirect: round2(indirect),
      margin: round2(margin),
      tax: round2(tax),
      grossUnit: round2(grossUnit),
      discountPct,
      discount: round2(discount),
      netUnit,
    },
    quantity: qty,
    productionSubtotal,
    oneOff,
    freight,
    total,
    deposit,
    balance,
    leadTimeDays,
    validityDays: p.validityDays,
  };
}
