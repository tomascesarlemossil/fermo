"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await signIn("credentials", {
        email: String(form.get("email") || "").toLowerCase().trim(),
        password: String(form.get("password") || ""),
        redirect: false,
      });
      if (!res || res.error) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }
      // Navegação completa: garante que o cookie de sessão seja lido pelo servidor.
      window.location.assign("/app");
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-espresso flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/img/logo.png"
            alt="Fermo"
            width={88}
            height={88}
            className="mx-auto rounded-full shadow-lg"
            priority
          />
          <p className="text-osso/60 text-sm mt-4 font-cinzel tracking-[0.3em]">PLATAFORMA</p>
        </div>

        <form onSubmit={onSubmit} className="bg-bone rounded-2xl p-6 grid gap-3 shadow-xl">
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" required autoComplete="username" className="input" placeholder="voce@fermo.com.br" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold justify-center mt-1 disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <Link href="/" className="text-center text-muted text-sm hover:text-sela mt-1">
            Voltar ao site
          </Link>
        </form>

        <p className="text-osso/40 text-xs text-center mt-5">
          Demonstração: diego@fermo.com.br / diegoadmin
        </p>
      </div>
    </main>
  );
}
