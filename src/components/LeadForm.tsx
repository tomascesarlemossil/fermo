"use client";

import { useState } from "react";

type ConfigPayload = Record<string, unknown> | undefined;

export function LeadForm({ source = "site", config }: { source?: string; config?: ConfigPayload }) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      company: String(form.get("company") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      message: String(form.get("message") || ""),
      source,
      config,
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Não foi possível enviar.");
      setStatus("ok");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  if (status === "ok") {
    return (
      <div className="card p-6 text-center">
        <p className="font-cormorant text-2xl text-ink">Recebemos seu contato.</p>
        <p className="text-muted mt-2 text-sm">Nosso time comercial retornará em breve.</p>
        <button className="btn-ghost mt-4" onClick={() => setStatus("idle")}>
          Enviar outro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 grid gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Nome*</label>
          <input name="name" required className="input" placeholder="Seu nome" />
        </div>
        <div>
          <label className="label">Marca / Empresa</label>
          <input name="company" className="input" placeholder="Sua marca" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" className="input" placeholder="voce@marca.com" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="phone" className="input" placeholder="(16) 9...." />
        </div>
      </div>
      <div>
        <label className="label">Mensagem</label>
        <textarea name="message" rows={3} className="input" placeholder="Conte sobre seu projeto, volume, prazos..." />
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="btn-gold justify-center">
        {status === "sending" ? "Enviando..." : "Solicitar orçamento"}
      </button>
    </form>
  );
}
