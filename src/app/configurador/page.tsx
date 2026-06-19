"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LeadForm } from "@/components/LeadForm";

const STEPS = [
  { key: "modelo", label: "Modelo", options: ["Mocassim", "Scarpin", "Bota", "Tênis"] },
  { key: "couro", label: "Couro", options: ["Liso", "Nobuck", "Verniz", "Camurça"] },
  { key: "cor", label: "Cor", options: ["Preto", "Caramelo", "Café", "Off-white"] },
  { key: "solado", label: "Solado", options: ["Couro", "Borracha", "Tratorado"] },
  { key: "grade", label: "Grade", options: ["33–40 (Fem)", "38–44 (Masc)", "Personalizada"] },
];

export default function Configurador() {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const summary = useMemo(
    () => STEPS.map((s) => `${s.label}: ${sel[s.key] ?? "—"}`).join(" · "),
    [sel],
  );

  function pick(value: string) {
    setSel((s) => ({ ...s, [current.key]: value }));
    if (step < STEPS.length - 1) setStep(step + 1);
    else setDone(true);
  }

  const config = { ...sel, summary };

  return (
    <main className="min-h-screen bg-osso">
      <header className="bg-espresso text-osso">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="font-cinzel tracking-widest">FERMO</Link>
          <Link href="/" className="text-sm hover:text-gold">Voltar ao site</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="font-cormorant text-4xl text-ink">Monte seu modelo</h1>
        <p className="text-muted mt-1 mb-8">Passo a passo. Ao final, enviamos seu orçamento.</p>

        {/* progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full ${i <= step || done ? "bg-gold" : "bg-line"}`}
            />
          ))}
        </div>

        {!done ? (
          <div className="card p-6">
            <p className="label">Passo {step + 1} de {STEPS.length}</p>
            <h2 className="font-cormorant text-2xl mb-5">{current.label}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {current.options.map((o) => (
                <button
                  key={o}
                  onClick={() => pick(o)}
                  className={`text-left px-4 py-3 rounded-[10px] border transition-colors ${
                    sel[current.key] === o
                      ? "border-gold bg-gold/10"
                      : "border-line hover:border-gold/50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn-ghost mt-5">
                Voltar
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="card p-5">
              <p className="label">Sua configuração</p>
              <p className="text-ink">{summary}</p>
              <button onClick={() => { setDone(false); setStep(0); }} className="btn-ghost mt-4">
                Editar
              </button>
            </div>
            <div>
              <h3 className="font-cormorant text-2xl mb-3 text-ink">Finalize seu pedido de orçamento</h3>
              <LeadForm source="configurador" config={config} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
