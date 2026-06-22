import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectByToken } from "@/server/studio/projects";
import { approveStudioAction } from "../../actions";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
const brl = (n: number) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function OrcamentoPage({ params }: { params: { token: string } }) {
  const slug = process.env.DEFAULT_TENANT_SLUG || "fermo";
  const data = await getProjectByToken(slug, params.token);
  if (!data?.project) notFound();

  const { project, model, quote } = data;
  const snap: any = project.priceSnapshot;
  const b = snap?.breakdown;
  const chosen: any[] = snap?.chosenOptions ?? [];
  const approved = project.status === "CONVERTED_TO_ORDER";
  const inReview = project.status === "WAITING_TECHNICAL_REVIEW";

  return (
    <main className="min-h-screen bg-osso">
      <header className="bg-espresso text-osso print:hidden">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/studio" className="flex items-center gap-3">
            <Image src="/img/logo.png" alt="Fermo Studio" width={32} height={32} className="rounded-full" />
            <span className="font-cinzel tracking-widest">FERMO STUDIO</span>
          </Link>
          <Link href="/studio/modelos" className="text-sm hover:text-gold">Novo projeto</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-5 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Image src="/img/logo.png" alt="Fermo" width={40} height={40} className="rounded-full hidden print:block" />
          <div>
            <p className="font-cinzel tracking-[0.2em] text-sela text-xs">ORÇAMENTO · FERMO STUDIO</p>
            <h1 className="font-cormorant text-3xl sm:text-4xl text-ink">{model?.name ?? project.name}</h1>
          </div>
        </div>
        <p className="text-muted text-sm">
          Projeto {project.publicToken.slice(0, 8).toUpperCase()} · {project.quantity} pares
          {quote ? ` · ${quote.number}` : ""}
        </p>

        {!b && <div className="card p-6 mt-6 text-muted">Orçamento ainda não gerado para este projeto.</div>}

        {b && (
          <>
            <div className="card mt-6 p-6">
              <h2 className="font-cormorant text-xl mb-3">Configuração</h2>
              <ul className="text-sm text-muted grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {chosen.map((c) => (
                  <li key={`${c.group}:${c.code}`} className="flex justify-between border-b border-line/60 py-1">
                    <span>{c.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card mt-6 p-6">
              <h2 className="font-cormorant text-xl mb-3">Valores</h2>
              <dl className="text-sm space-y-1">
                <Row k="Preço unitário" v={brl(b.unit?.netUnit)} />
                {b.unit?.discountPct > 0 && <Row k={`Desconto por volume (${(b.unit.discountPct * 100).toFixed(0)}%)`} v={`− ${brl(b.unit.discount * b.quantity)}`} muted />}
                <Row k={`Produção (${b.quantity} pares)`} v={brl(b.productionSubtotal)} />
                <Row k="Desenvolvimento + modelagem" v={brl(b.development + b.modeling)} muted />
                {b.sample > 0 && <Row k="Amostra" v={brl(b.sample)} muted />}
                <Row k="Frete" v="a calcular" muted />
                <div className="flex justify-between font-cormorant text-3xl pt-2 border-t border-line">
                  <span>Total</span><span>{brl(b.total)}</span>
                </div>
                <Row k="Sinal" v={brl(b.deposit)} muted />
                <Row k="Saldo" v={brl(b.balance)} muted />
                <Row k="Prazo estimado" v={`${b.leadTimeDays} dias`} muted />
                <Row k="Validade" v={`${b.validityDays} dias`} muted />
              </dl>
              <p className="text-xs text-muted mt-3">Valores sujeitos a validação técnica em personalizações especiais. Frete a calcular.</p>
            </div>

            <div className="mt-6 print:hidden">
              {approved ? (
                <div className="card p-6 text-center">
                  <p className="text-success font-cormorant text-2xl">Pedido confirmado!</p>
                  <p className="text-muted text-sm mt-1">Seu projeto entrou em produção. Acompanhe pelo nosso time.</p>
                </div>
              ) : inReview ? (
                <div className="card p-6 text-center">
                  <p className="font-cormorant text-2xl text-sela">Em análise técnica</p>
                  <p className="text-muted text-sm mt-1">
                    Sua configuração tem itens que exigem validação. Retornaremos com a confirmação do preço/prazo.
                  </p>
                </div>
              ) : (
                <div className="card p-6">
                  <p className="text-muted text-sm mb-4">
                    Revise sua proposta e aprove para iniciarmos. A aprovação gera o pedido e o cronograma de produção.
                  </p>
                  <form action={approveStudioAction}>
                    <input type="hidden" name="token" value={project.publicToken} />
                    <button className="btn-gold w-full justify-center">Aprovar e gerar pedido</button>
                  </form>
                  <div className="flex gap-3 mt-3">
                    <Link href={`/studio/configurador/${model?.slug ?? ""}`} className="btn-ghost flex-1 justify-center">Editar configuração</Link>
                    <PrintButton />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
