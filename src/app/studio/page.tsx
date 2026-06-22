import Image from "next/image";
import Link from "next/link";
import { publicStudioData } from "@/server/studio/catalog";

export const dynamic = "force-dynamic";

export default async function StudioLanding() {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const data = await publicStudioData(slug);
  const models = (data?.models ?? []).slice(0, 6);

  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-espresso/95 backdrop-blur text-osso sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo" width={36} height={36} className="rounded-full" />
            <span className="font-cinzel tracking-widest">FERMO STUDIO</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/studio/modelos" className="hover:text-gold">Modelos</Link>
            <Link href="/login" className="btn-gold py-2">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-espresso text-osso overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/img/snk.jpg" alt="" fill priority className="object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/85 to-espresso/40" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 py-24 sm:py-32">
          <div className="max-w-2xl">
            <p className="text-gold font-cinzel tracking-[0.25em] text-xs sm:text-sm mb-4">FERMO STUDIO</p>
            <h1 className="font-cormorant text-5xl sm:text-7xl leading-[1.05]">
              Crie sua marca.<br />Configure seu calçado.<br /><span className="text-gold">Receba seu orçamento na hora.</span>
            </h1>
            <p className="mt-6 text-osso/85 max-w-xl text-lg">
              Mais do que fabricar calçados: construímos marcas. Escolha um modelo, personalize cada
              detalhe em 3D, defina a grade e gere um orçamento completo — do conceito à produção em Franca/SP.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/studio/modelos" className="btn-gold text-base px-6 py-3">Começar agora</Link>
              <Link href="/" className="btn-ghost text-osso border-osso/30 hover:bg-esp2">Conhecer a Fermo</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Propostas de valor */}
      <section className="max-w-6xl mx-auto px-5 py-16 grid sm:grid-cols-3 gap-6">
        {[
          { t: "Visualize antes de produzir", d: "Configurador 3D em tempo real: gire, amplie e troque materiais e cores." },
          { t: "Orçamento instantâneo", d: "Preço unitário, desenvolvimento, prazo e sinal calculados na hora." },
          { t: "Sua marca, ponta a ponta", d: "Logo, embalagem, etiqueta e grade — produção profissional sob encomenda." },
        ].map((x) => (
          <div key={x.t} className="card p-6">
            <h3 className="font-cormorant text-2xl">{x.t}</h3>
            <p className="text-muted text-sm mt-2">{x.d}</p>
          </div>
        ))}
      </section>

      {/* Modelos em destaque */}
      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-cormorant text-4xl text-ink">Modelos para sua coleção</h2>
          <Link href="/studio/modelos" className="text-sela hover:underline text-sm">Ver todos</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((m: any) => (
            <Link key={m.id} href={`/studio/configurador/${m.slug}`} className="card overflow-hidden group">
              <div className="relative aspect-[4/3]">
                <Image src={m.thumbnailUrl || "/img/snk.jpg"} alt={m.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                {m.badge && <span className="absolute top-3 left-3 chip bg-gold text-espresso">{m.badge}</span>}
              </div>
              <div className="p-5">
                <h3 className="font-cormorant text-2xl">{m.name}</h3>
                <p className="text-muted text-sm mt-1">A partir de {Number(m.basePrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/par · mín. {m.minQty}</p>
              </div>
            </Link>
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
