"use client";

import { useState } from "react";
import { fmtMult } from "@/lib/format";
import type { Case } from "@/lib/types";

function blank(nicho: string): Case {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Math.round(performance.now())),
    nicho,
    apelido: "",
    periodo: "",
    destaque: "",
    publicado: true,
    createdAt: new Date().toISOString(),
  };
}

type MetricKey = "roas" | "faturamento" | "vendas" | "ticketMedio" | "cpl" | "cac" | "investimento";
const METRICS: { key: MetricKey; label: string; prefix?: string; suffix?: string; step?: number }[] = [
  { key: "roas", label: "ROAS", suffix: "x", step: 0.1 },
  { key: "faturamento", label: "Faturamento gerado", prefix: "R$", step: 1000 },
  { key: "vendas", label: "Vendas", step: 1 },
  { key: "ticketMedio", label: "Ticket médio", prefix: "R$", step: 100 },
  { key: "cpl", label: "CPL", prefix: "R$", step: 0.5 },
  { key: "cac", label: "CAC", prefix: "R$", step: 50 },
  { key: "investimento", label: "Investimento em mídia", prefix: "R$", step: 500 },
];

export default function CaseManager({
  initial,
  nichos,
}: {
  initial: Case[];
  nichos: string[];
}) {
  const [list, setList] = useState<Case[]>(initial);
  const [draft, setDraft] = useState<Case | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [msg, setMsg] = useState("");

  const persist = async (next: Case[]) => {
    setList(next);
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setStatus("idle");
        setMsg("Alterações salvas.");
      } else {
        setStatus("error");
        setMsg("Erro ao salvar.");
      }
    } catch {
      setStatus("error");
      setMsg("Falha de conexão.");
    }
  };

  const togglePub = (id: string) =>
    persist(list.map((c) => (c.id === id ? { ...c, publicado: !c.publicado } : c)));
  const remover = (id: string) => persist(list.filter((c) => c.id !== id));

  const salvar = () => {
    if (!draft) return;
    if (!draft.nicho) return alert("Escolha o nicho.");
    if (!draft.destaque.trim()) return alert("Escreva o destaque do case.");
    const exists = list.some((c) => c.id === draft.id);
    persist(exists ? list.map((c) => (c.id === draft.id ? draft : c)) : [...list, draft]);
    setDraft(null);
  };

  const upd = (patch: Partial<Case>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updMetric = (k: MetricKey, v: number) => upd({ [k]: v } as Partial<Case>);

  const inputCls =
    "w-full border-[1.5px] border-line rounded-md px-2.5 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-brand";
  const cardCls =
    "bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-6 mb-5";

  return (
    <div>
      <section className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-ink">Cases</h2>
          {!draft && (
            <button
              type="button"
              onClick={() => setDraft(blank(nichos[0] ?? ""))}
              className="text-[13px] font-semibold text-white bg-brand rounded-md px-3.5 py-2 hover:bg-brand-2 transition-colors"
            >
              + Novo case
            </button>
          )}
        </div>
        {list.length === 0 && !draft ? (
          <p className="text-[13.5px] text-ink-3 py-6 text-center">
            Nenhum case cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-wide text-left">
                  <th className="py-2 pr-3 font-bold">Referência</th>
                  <th className="py-2 px-3 font-bold">Nicho</th>
                  <th className="py-2 px-3 font-bold">Período</th>
                  <th className="py-2 px-3 font-bold">ROAS</th>
                  <th className="py-2 px-3 font-bold">Publicado</th>
                  <th className="py-2 pl-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-2.5 pr-3 font-semibold text-ink">
                      {c.apelido || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-ink-2">{c.nicho}</td>
                    <td className="py-2.5 px-3 text-ink-2">{c.periodo || "—"}</td>
                    <td className="py-2.5 px-3 tabular text-ink-2">
                      {c.roas ? fmtMult(c.roas) : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => togglePub(c.id)}
                        className={`text-[11.5px] font-semibold rounded-full px-2.5 py-1 ${
                          c.publicado ? "bg-pos-bg text-pos" : "bg-surface-alt text-ink-3"
                        }`}
                      >
                        {c.publicado ? "Publicado" : "Rascunho"}
                      </button>
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDraft({ ...c })}
                        className="text-[12.5px] font-semibold text-brand hover:underline mr-3"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(c.id)}
                        className="text-[12.5px] font-semibold text-neg hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {msg && (
          <p
            className={`text-[12.5px] mt-3 ${status === "error" ? "text-neg" : "text-pos"}`}
          >
            {msg}
          </p>
        )}
      </section>

      {draft && (
        <section className={cardCls}>
          <h2 className="text-[16px] font-semibold text-ink mb-4">
            {list.some((c) => c.id === draft.id) ? "Editar case" : "Novo case"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                Nicho
              </span>
              <select
                value={draft.nicho}
                onChange={(e) => upd({ nicho: e.target.value })}
                className={inputCls}
              >
                {nichos.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                Referência interna
              </span>
              <input
                type="text"
                value={draft.apelido}
                onChange={(e) => upd({ apelido: e.target.value })}
                placeholder="Ex.: Milagro Agro (não aparece p/ cliente)"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                Período
              </span>
              <input
                type="text"
                value={draft.periodo}
                onChange={(e) => upd({ periodo: e.target.value })}
                placeholder="Ex.: Julho/2026"
                className={inputCls}
              />
            </label>
          </div>

          <label className="block mb-4">
            <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
              Destaque (o que o vendedor vai mostrar)
            </span>
            <textarea
              value={draft.destaque}
              onChange={(e) => upd({ destaque: e.target.value })}
              placeholder="Ex.: R$ 773 mil de faturamento em um mês, com ROAS de 25x e pico de R$ 594 mil em 24h."
              className={`${inputCls} min-h-[70px] resize-y`}
            />
          </label>

          <div className="text-[12.5px] font-semibold text-ink-2 mb-2">
            Métricas (deixe em branco as que não se aplicam)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {METRICS.map((m) => (
              <label key={m.key} className="block">
                <span className="block text-[11.5px] text-ink-3 mb-1">{m.label}</span>
                <div className="relative">
                  {m.prefix && (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[12px]">
                      {m.prefix}
                    </span>
                  )}
                  <input
                    type="number"
                    step={m.step}
                    value={(draft[m.key] as number | undefined) ?? ""}
                    onChange={(e) =>
                      updMetric(
                        m.key,
                        e.target.value === "" ? 0 : Number(e.target.value.replace(",", ".")),
                      )
                    }
                    className={`${inputCls} tabular ${m.prefix ? "pl-7" : ""} ${
                      m.suffix ? "pr-6" : ""
                    }`}
                  />
                  {m.suffix && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[12px]">
                      {m.suffix}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2 mb-5">
            <input
              type="checkbox"
              checked={draft.publicado}
              onChange={(e) => upd({ publicado: e.target.checked })}
            />
            Publicado (visível para os vendedores)
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[14px] font-semibold text-brand border-[1.5px] border-brand rounded-lg px-5 py-2.5 hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={status === "saving"}
              className="text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-2.5 hover:bg-brand-2 transition-colors disabled:opacity-60"
            >
              {status === "saving" ? "Salvando…" : "Salvar case"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
