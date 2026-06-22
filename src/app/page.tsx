import Image from "next/image";
import Link from "next/link";
import { publicModel } from "@/server/studio/catalog";
import { DEFAULT_PRICE_PARAMS, type PriceParams, type VolumeTier } from "@/lib/studio/pricing-core";
import { StudioConfigurator } from "./studio/configurador/[slug]/StudioConfigurator";

export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "tenis-casual-masculino";

const linhas = [
  { t: "Sandálias", d: "Couro nobre, conforto e caimento impecável.", img: "/img/sand.jpg" },
  { t: "Tênis & Casual", d: "Camurça premium, costura à mão.", img: "/img/snk.jpg" },
  { t: "Detalhe & Acabamento", d: "Cada par inspecionado peça a peça.", img: "/img/det.jpg" },
];

const numeros = [
  { n: "Franca/SP", l: "Capital Nacional do Calçado." },
  { n: "Private label", l: "Sua marca, nossa manufatura." },
  { n: "Sob encomenda", l: "Produção dedicada por pedido." },
];

export default async function Home() {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const data = await publicModel(slug, DEFAULT_MODEL).catch(() => null);

  let configurator: React.ReactNode = null;
  if (data?.model) {
    const m = data.model;
    const params: PriceParams = data.priceProfile
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
    configurator = (
      <StudioConfigurator
        model={{ id: m.id, slug: m.slug, name: m.name, modelUrl: m.modelUrl, basePrice: Number(m.basePrice), minQty: m.minQty, leadTimeDays: m.leadTimeDays, isDemo: m.isDemo }}
        optionsByGroup={optionsByGroup}
        params={params}
        tiers={tiers}
      />
    );
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-espresso/95 backdrop-blur text-osso">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo" width={40} height={40} className="rounded-full" />
            <span className="font-cinzel tracking-widest text-lg">FERMO</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#configurador" className="hidden sm:inline hover:text-gold">Configurador</a>
            <a href="#linhas" className="hidden sm:inline hover:text-gold">Linhas</a>
            <a href="#processo" className="hidden sm:inline hover:text-gold">Processo</a>
            <Link href="/studio/modelos" className="hover:text-gold">Modelos</Link>
            <Link href="/login" className="btn-gold py-2">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-espresso text-osso overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/img/hero.jpg" alt="" fill priority className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/80 to-espresso/30" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 py-20 sm:py-28">
          <div className="max-w-xl">
            <p className="text-gold font-cinzel tracking-[0.25em] text-xs sm:text-sm mb-4">FERMO STUDIO · PRIVATE LABEL</p>
            <h1 className="font-cormorant text-5xl sm:text-7xl leading-[1.05]">
              Crie sua marca.
              <br />
              Configure seu calçado.
              <br />
              <span className="text-gold">Receba seu orçamento na hora.</span>
            </h1>
            <p className="mt-6 text-osso/85 max-w-md text-lg">
              Monte seu modelo em 3D, escolha materiais, cores e acabamentos, defina a quantidade e
              gere um orçamento completo — direto com a fábrica em Franca/SP.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#configurador" className="btn-gold">Montar meu modelo</a>
              <Link href="/studio/modelos" className="btn-ghost text-osso border-osso/30 hover:bg-esp2">
                Ver modelos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="bg-esp2 text-osso border-y border-gold/15">
        <div className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {numeros.map((x) => (
            <div key={x.n} className="text-center sm:text-left">
              <div className="font-cormorant text-2xl text-gold">{x.n}</div>
              <div className="text-osso/70 text-sm mt-1">{x.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CONFIGURADOR 3D (aberto na home) */}
      <section id="configurador" className="bg-bone">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 sm:py-20">
          <div className="mb-8">
            <p className="text-sela font-cinzel tracking-[0.25em] text-xs mb-2">CONFIGURADOR 3D</p>
            <h2 className="font-cormorant text-4xl sm:text-5xl text-ink">Monte seu tênis e orce na hora</h2>
            <p className="text-muted mt-2 max-w-2xl">
              Gire o modelo em 3D, escolha material, cor, solado, cadarço e acabamento — o preço
              atualiza ao vivo. Ao final, gere seu orçamento completo.
            </p>
          </div>
          {configurator ?? (
            <div className="card p-10 text-center text-muted">
              Configurador indisponível no momento.{" "}
              <Link href="/studio/modelos" className="text-sela underline">Ver modelos</Link>.
            </div>
          )}
        </div>
      </section>

      {/* Linhas / nossos modelos */}
      <section id="linhas" className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-cormorant text-4xl text-ink mb-2">Nossas linhas</h2>
        <p className="text-muted mb-10">Modelos base que adaptamos à identidade da sua marca.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {linhas.map((l) => (
            <div key={l.t} className="card overflow-hidden group">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={l.img} alt={l.t} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <h3 className="font-cormorant text-2xl">{l.t}</h3>
                <p className="text-muted text-sm mt-1">{l.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/studio/modelos" className="btn-ghost">Ver todos os modelos</Link>
        </div>
      </section>

      {/* Processo */}
      <section id="processo" className="bg-osso">
        <div className="max-w-6xl mx-auto px-5 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden shadow-xl">
            <Image src="/img/laser.jpg" alt="Corte automatizado" fill className="object-cover" />
          </div>
          <div>
            <p className="text-sela font-cinzel tracking-[0.25em] text-xs mb-3">TECNOLOGIA + ARTESANATO</p>
            <h2 className="font-cormorant text-4xl text-ink">Precisão da fábrica, alma do feito à mão</h2>
            <p className="text-muted mt-4">
              Corte automatizado que reduz variação e mantém o padrão entre todos os pares, combinado
              com pesponto e montagem artesanais. Rastreabilidade de ponta a ponta — do lote de couro
              à expedição.
            </p>
            <ul className="mt-6 space-y-2 text-ink">
              {["Ficha técnica e BOM por modelo", "Apontamento por setor (QR Code)", "Inspeção de qualidade por par"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <p className="text-sela font-cinzel tracking-[0.25em] text-xs mb-2">DO BRIEFING À ENTREGA</p>
          <h2 className="font-cormorant text-4xl text-ink">Como funciona</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { n: "01", t: "Configure em 3D", d: "Monte seu modelo, escolha materiais, cores e acabamentos." },
            { n: "02", t: "Orçamento na hora", d: "Veja o preço ao vivo e gere a proposta completa." },
            { n: "03", t: "Produção rastreada", d: "Ficha técnica, corte, pesponto, montagem e qualidade por par." },
            { n: "04", t: "Expedição", d: "Faturamento, embalagem e envio com rastreio até sua marca." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <div className="font-cinzel text-gold text-2xl">{s.n}</div>
              <h3 className="font-cormorant text-2xl mt-2">{s.t}</h3>
              <p className="text-muted text-sm mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-espresso text-osso/60 text-sm">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo" width={32} height={32} className="rounded-full" />
            <span>© {new Date().getFullYear()} Fermo · Private Label Shoes · Franca/SP</span>
          </div>
          <Link href="/login" className="hover:text-gold">Acesso à plataforma</Link>
        </div>
      </footer>
    </main>
  );
}
