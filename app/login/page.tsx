"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Não foi possível entrar.");
        setLoading(false);
        return;
      }
      window.location.href = next || data.redirect || "/";
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full border-[1.5px] border-line rounded-lg px-3 py-2.5 text-[14px] text-ink bg-surface focus:outline-none focus:border-brand";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 justify-center mb-7">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-brand text-white text-[15px] font-black">
            3F
          </span>
          <div className="leading-tight">
            <div className="text-[17px] font-semibold text-ink">SEED</div>
            <div className="text-[11px] text-ink-3">
              Marketing de performance para o agro
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-7"
        >
          <h1 className="text-[18px] font-semibold text-ink mb-1">Entrar</h1>
          <p className="text-[13px] text-ink-3 mb-5">
            Calculadora de previsão de resultados.
          </p>

          <label className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            autoComplete="username"
            className={`${inputCls} mb-4`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@3fventure.com.br"
            required
          />

          <label className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
            Senha
          </label>
          <input
            type="password"
            autoComplete="current-password"
            className={`${inputCls} ${erro ? "border-neg" : ""}`}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <p className="text-[12.5px] text-neg mt-2">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-2.5 hover:bg-brand-2 transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
