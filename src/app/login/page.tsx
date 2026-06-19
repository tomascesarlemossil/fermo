"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email") || "").toLowerCase(),
      password: String(form.get("password") || ""),
      tenant: String(form.get("tenant") || ""),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-espresso flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gold mx-auto flex items-center justify-center font-cinzel font-bold text-2xl text-espresso">
            F
          </div>
          <h1 className="font-cinzel tracking-widest text-osso text-xl mt-4">FERMO</h1>
          <p className="text-osso/60 text-sm mt-1">Plataforma de gestão</p>
        </div>

        <form onSubmit={onSubmit} className="bg-bone rounded-xl p-6 grid gap-3">
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" required className="input" placeholder="voce@fermo.com.br" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="password" type="password" required className="input" placeholder="••••••••" />
          </div>
          <input type="hidden" name="tenant" value="" />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold justify-center mt-1">
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <Link href="/" className="text-center text-muted text-sm hover:text-gold mt-1">
            Voltar ao site
          </Link>
        </form>

        <p className="text-osso/40 text-xs text-center mt-5">
          Demo: diego@fermo.com.br / diegoadmin
        </p>
      </div>
    </main>
  );
}
