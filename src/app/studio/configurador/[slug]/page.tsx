import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicModel } from "@/server/studio/catalog";
import { DEFAULT_PRICE_PARAMS, type PriceParams, type VolumeTier } from "@/lib/studio/pricing-core";
import { StudioConfigurator } from "./StudioConfigurator";

export const dynamic = "force-dynamic";

export default async function ConfiguradorPage({ params }: { params: { slug: string } }) {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const data = await publicModel(slug, params.slug);
  if (!data?.model) notFound();

  const m = data.model;
  const priceParams: PriceParams = data.priceProfile
    ? { ...DEFAULT_PRICE_PARAMS, ...(data.priceProfile.version.params as any) }
    : DEFAULT_PRICE_PARAMS;
  const tiers: VolumeTier[] = data.priceProfile
    ? data.priceProfile.version.tiers.map((t: any) => ({ minQty: t.minQty, maxQty: t.maxQty ?? null, discountPct: Number(t.discountPct) }))
    : [];

  const optionsByGroup: Record<string, any[]> = {};
  for (const [g, list] of Object.entries(data.optionsByGroup)) {
    optionsByGroup[g] = (list as any[]).map((o) => ({
      id: o.id, code: o.code, name: o.name, price: Number(o.price), priceType: o.priceType,
      colorHex: o.colorHex, variant: o.variant, leadTimeDays: o.leadTimeDays, minQty: o.minQty,
    }));
  }

  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-espresso text-osso sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/studio" className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo Studio" width={32} height={32} className="rounded-full" />
            <span className="font-cinzel tracking-widest">FERMO STUDIO</span>
          </Link>
          <Link href="/studio/modelos" className="text-sm hover:text-gold">Modelos</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8">
        <p className="text-sela font-cinzel tracking-[0.25em] text-xs mb-1">CONFIGURADOR 3D</p>
        <h1 className="font-cormorant text-3xl sm:text-4xl text-ink">{m.name}</h1>
        <p className="text-muted mt-1 mb-6 max-w-2xl">
          Personalize materiais, cores, solado, forro, cadarço e sua marca. Veja o preço ao vivo e
          gere o orçamento na hora.
        </p>
        <StudioConfigurator
          model={{
            id: m.id, slug: m.slug, name: m.name, modelUrl: m.modelUrl,
            basePrice: Number(m.basePrice), minQty: m.minQty, leadTimeDays: m.leadTimeDays, isDemo: m.isDemo,
          }}
          optionsByGroup={optionsByGroup}
          params={priceParams}
          tiers={tiers}
        />
      </div>
    </main>
  );
}
