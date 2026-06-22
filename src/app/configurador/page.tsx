import Image from "next/image";
import Link from "next/link";
import { Configurator3D } from "./Configurator3D";

export const dynamic = "force-dynamic";

export default function ConfiguradorPage() {
  return (
    <main className="min-h-screen bg-bone">
      <header className="bg-espresso text-osso sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo" width={32} height={32} className="rounded-full" />
            <span className="font-cinzel tracking-widest">FERMO</span>
          </Link>
          <Link href="/" className="text-sm hover:text-gold">Voltar ao site</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-8 sm:py-12">
        <p className="text-sela font-cinzel tracking-[0.25em] text-xs mb-2">CONFIGURADOR 3D</p>
        <h1 className="font-cormorant text-3xl sm:text-5xl text-ink">Monte seu tênis e orce na hora</h1>
        <p className="text-muted mt-2 mb-8 max-w-2xl">
          Gire o modelo em 3D, escolha cor, solado e cadarço, defina a quantidade e gere um orçamento
          com o valor completo — pronto para aprovar no portal.
        </p>
        <Configurator3D />
      </div>
    </main>
  );
}
