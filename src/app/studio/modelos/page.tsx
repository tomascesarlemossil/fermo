import Image from "next/image";
import Link from "next/link";
import { publicStudioData } from "@/server/studio/catalog";

export const dynamic = "force-dynamic";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ModelosPage() {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const data = await publicStudioData(slug);
  const models = data?.models ?? [];
  const categories = data?.categories ?? [];

  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-espresso text-osso sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/studio" className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo Studio" width={32} height={32} className="rounded-full" />
            <span className="font-cinzel tracking-widest">FERMO STUDIO</span>
          </Link>
          <Link href="/studio" className="text-sm hover:text-gold">Início</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-10">
        <h1 className="font-cormorant text-4xl text-ink">Escolha seu modelo-base</h1>
        <p className="text-muted mt-1 mb-8">Personalize no configurador 3D e receba o orçamento na hora.</p>

        {categories.map((c: any) => {
          const list = models.filter((m: any) => m.categoryId === c.id);
          if (!list.length) return null;
          return (
            <section key={c.id} className="mb-10">
              <h2 className="font-cormorant text-2xl text-ink mb-4">{c.name}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((m: any) => (
                  <Link key={m.id} href={`/studio/configurador/${m.slug}`} className="card overflow-hidden group">
                    <div className="relative aspect-[4/3]">
                      <Image src={m.thumbnailUrl || "/img/snk.jpg"} alt={m.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      {m.badge && <span className="absolute top-3 left-3 chip bg-gold text-espresso">{m.badge}</span>}
                    </div>
                    <div className="p-5">
                      <h3 className="font-cormorant text-2xl">{m.name}</h3>
                      <p className="text-muted text-sm mt-1">A partir de {brl(Number(m.basePrice))}/par · mín. {m.minQty} · {m.leadTimeDays}d</p>
                      <span className="btn-gold mt-3 inline-flex py-2">Personalizar</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
