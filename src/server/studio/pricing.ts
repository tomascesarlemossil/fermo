import { prisma } from "@/lib/prisma";
import {
  computePrice,
  aggregateSelection,
  DEFAULT_PRICE_PARAMS,
  type PriceParams,
  type VolumeTier,
  type PriceBreakdown,
  type OptionLite,
} from "@/lib/studio/pricing-core";
import { getActivePriceProfile } from "./catalog";

/**
 * Precificação server-side (fonte de verdade). Carrega modelo, opções e perfil
 * de preço ativo, calcula o breakdown e devolve também o SNAPSHOT imutável a ser
 * gravado no orçamento.
 */

export type StudioSelection = {
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
  sampleRequested?: boolean;
  grade?: Record<string, number>;
  brand?: { name?: string; placement?: string; logoAssetId?: string };
};

export type PricedConfiguration = {
  breakdown: PriceBreakdown;
  snapshot: any;
  needsReview: boolean;
};

export async function priceConfiguration(modelId: string, selection: StudioSelection): Promise<PricedConfiguration> {
  const model = await prisma.shoeModel.findFirst({ where: { id: modelId } });
  if (!model) throw new Error("Modelo não encontrado.");

  const options = await prisma.studioOption.findMany({ where: { active: true } });
  const optionsLite: OptionLite[] = options.map((o) => ({
    group: o.group,
    code: o.code,
    name: o.name,
    price: Number(o.price),
    priceType: o.priceType,
    minQty: o.minQty,
  }));

  const base = Number(model.basePrice);
  const agg = aggregateSelection(base, optionsLite, selection);
  const { perPairAdd, personalizationPerPair, devExtra, colorsCount, chosen } = agg;
  const needsReview = agg.needsReview || selection.quantity < model.minQty;

  const active = await getActivePriceProfile();
  const baseParams: PriceParams = active ? { ...DEFAULT_PRICE_PARAMS, ...(active.version.params as any) } : DEFAULT_PRICE_PARAMS;
  const params: PriceParams = { ...baseParams, development: baseParams.development + devExtra };
  const tiers: VolumeTier[] = active
    ? active.version.tiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty ?? null, discountPct: Number(t.discountPct) }))
    : [];

  const breakdown = computePrice({
    basePrice: base,
    perPairAdd,
    personalizationPerPair,
    colorsCount,
    quantity: selection.quantity,
    sampleRequested: !!selection.sampleRequested,
    freight: 0,
    params,
    tiers,
  });

  const snapshot = {
    model: { id: model.id, name: model.name, basePrice: base },
    selection,
    chosenOptions: chosen,
    params,
    tiers,
    priceProfileVersionId: active?.version.id ?? null,
    breakdown,
    computedAt: new Date().toISOString(),
  };

  return { breakdown, snapshot, needsReview };
}
