import Image from "next/image";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";

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

export default function Home() {
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
            <a href="#linhas" className="hidden sm:inline hover:text-gold">Linhas</a>
            <a href="#processo" className="hidden sm:inline hover:text-gold">Processo</a>
            <a href="#contato" className="hidden sm:inline hover:text-gold">Contato</a>
            <Link href="/configurador" className="hover:text-gold">Configurador</Link>
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
        <div className="relative max-w-6xl mx-auto px-5 py-24 sm:py-32">
          <div className="max-w-xl">
            <p className="text-gold font-cinzel tracking-[0.25em] text-xs sm:text-sm mb-4">PRIVATE LABEL SHOES</p>
            <h1 className="font-cormorant text-5xl sm:text-7xl leading-[1.05]">
              Sua marca.
              <br />
              Nosso couro.
              <br />
              <span className="text-gold">Feito à mão.</span>
            </h1>
            <p className="mt-6 text-osso/85 max-w-md text-lg">
              Fábrica de calçados em couro em Franca/SP. Produzimos sua coleção sob encomenda — do
              briefing à expedição — com padrão de manufatura de luxo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contato" className="btn-gold">Solicitar orçamento</a>
              <Link href="/configurador" className="btn-ghost text-osso border-osso/30 hover:bg-esp2">
                Montar meu modelo
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

      {/* Linhas */}
      <section id="linhas" className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-cormorant text-4xl text-ink mb-2">Nossas linhas</h2>
        <p className="text-muted mb-10">Modelos base que adaptamos à identidade da sua marca.</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {linhas.map((l) => (
            <div key={l.t} className="card overflow-hidden group">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={l.img}
                  alt={l.t}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-cormorant text-2xl">{l.t}</h3>
                <p className="text-muted text-sm mt-1">{l.d}</p>
              </div>
            </div>
          ))}
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

      {/* Contato / Lead */}
      <section id="contato" className="bg-bone">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <div className="text-center mb-8">
            <h2 className="font-cormorant text-4xl text-ink">Vamos criar sua coleção?</h2>
            <p className="text-muted mt-2">Conte sobre seu projeto. Retornamos com um orçamento personalizado.</p>
          </div>
          <LeadForm source="site" />
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
