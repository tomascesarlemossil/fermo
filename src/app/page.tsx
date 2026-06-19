import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";

const linhas = [
  { t: "Mocassins", d: "Conforto e caimento, costura à mão." },
  { t: "Scarpins", d: "Clássicos atemporais em couro nobre." },
  { t: "Botas", d: "Estrutura e durabilidade, design autoral." },
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
      <header className="sticky top-0 z-40 bg-espresso text-osso">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center font-cinzel font-bold text-espresso">
              F
            </div>
            <span className="font-cinzel tracking-widest text-lg">FERMO</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#linhas" className="hidden sm:inline hover:text-gold">Linhas</a>
            <a href="#contato" className="hidden sm:inline hover:text-gold">Contato</a>
            <Link href="/configurador" className="hover:text-gold">Configurador</Link>
            <Link href="/login" className="btn-gold py-2">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-espresso text-osso">
        <div className="max-w-6xl mx-auto px-5 py-20 sm:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-gold font-cinzel tracking-[0.2em] text-sm mb-4">PRIVATE LABEL SHOES</p>
            <h1 className="font-cormorant text-5xl sm:text-6xl leading-tight">
              Sua marca.
              <br />
              Nosso couro.
              <br />
              <span className="text-gold">Feito à mão.</span>
            </h1>
            <p className="mt-6 text-osso/80 max-w-md">
              Fábrica de calçados em couro em Franca/SP. Produzimos sua coleção sob encomenda, do
              briefing à expedição, com a qualidade da manufatura italiana brasileira.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="#contato" className="btn-gold">Solicitar orçamento</a>
              <Link href="/configurador" className="btn-ghost text-osso border-osso/30 hover:bg-esp2">
                Montar meu modelo
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {numeros.map((x) => (
              <div key={x.n} className="bg-esp2 border border-gold/20 rounded-xl p-5">
                <div className="font-cormorant text-2xl text-gold">{x.n}</div>
                <div className="text-osso/70 text-xs mt-2">{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Linhas */}
      <section id="linhas" className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-cormorant text-4xl text-ink mb-2">Nossas linhas</h2>
        <p className="text-muted mb-10">Modelos base que adaptamos à identidade da sua marca.</p>
        <div className="grid sm:grid-cols-3 gap-5">
          {linhas.map((l) => (
            <div key={l.t} className="card p-6">
              <div className="w-10 h-10 rounded-full bg-osso flex items-center justify-center text-gold font-cinzel">
                {l.t[0]}
              </div>
              <h3 className="font-cormorant text-2xl mt-4">{l.t}</h3>
              <p className="text-muted text-sm mt-2">{l.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contato / Lead */}
      <section id="contato" className="bg-osso">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <div className="text-center mb-8">
            <h2 className="font-cormorant text-4xl text-ink">Vamos criar sua coleção?</h2>
            <p className="text-muted mt-2">
              Conte-nos sobre seu projeto. Retornamos com um orçamento personalizado.
            </p>
          </div>
          <LeadForm source="site" />
        </div>
      </section>

      <footer className="bg-espresso text-osso/60 text-sm">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Fermo · Private Label Shoes · Franca/SP</span>
          <Link href="/login" className="hover:text-gold">Acesso à plataforma</Link>
        </div>
      </footer>
    </main>
  );
}
