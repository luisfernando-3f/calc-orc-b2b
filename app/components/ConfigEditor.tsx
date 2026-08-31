"use client";

import { useState } from "react";
import { fmtBRL } from "@/lib/format";
import type { AppConfig, RateBounds } from "@/lib/types";

type Etapa = keyof RateBounds;
const ETAPAS: [Etapa, string][] = [
  ["atendido", "Lead → Atendido"],
  ["visita", "Atendido → Visita"],
  ["proposta", "Visita → Proposta"],
  ["venda", "Proposta → Venda"],
];

/* input numérico simples (aceita vírgula) */
function Num({
  value,
  onChange,
  prefix,
  suffix,
  step,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[12px] pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value.replace(",", ".")))
        }
        className={`w-full border-[1.5px] border-line rounded-md py-2 text-[13.5px] text-ink bg-surface tabular focus:outline-none focus:border-brand ${
          prefix ? "pl-7" : "pl-2.5"
        } ${suffix ? "pr-7" : "pr-2.5"}`}
      />
      {suffix && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[12px] pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

const pct = (frac: number) => Math.round(frac * 1000) / 10;

export default function ConfigEditor({
  initial,
  cplReal = {},
}: {
  initial: AppConfig;
  cplReal?: Record<string, { cplMedio: number; amostra: number }>;
}) {
  const [cfg, setCfg] = useState<AppConfig>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  const dirty = () => setStatus("idle");

  const updNicho = (i: number, patch: Partial<AppConfig["nichos"][number]>) => {
    setCfg((c) => ({
      ...c,
      nichos: c.nichos.map((n, idx) => (idx === i ? { ...n, ...patch } : n)),
    }));
    dirty();
  };
  const addNicho = () => {
    setCfg((c) => ({
      ...c,
      nichos: [
        ...c.nichos,
        {
          id: crypto.randomUUID(),
          nome: "",
          cpl: 0,
          base: 0,
          total: 0,
          leadsPorVenda: "",
          ticketPadrao: 0,
          cicloPadrao: 0,
        },
      ],
    }));
    dirty();
  };
  const rmNicho = (i: number) => {
    setCfg((c) => ({ ...c, nichos: c.nichos.filter((_, idx) => idx !== i) }));
    dirty();
  };
  const updBound = (etapa: Etapa, field: "min" | "sugestao" | "max", frac: number) => {
    setCfg((c) => ({
      ...c,
      rateBounds: { ...c.rateBounds, [etapa]: { ...c.rateBounds[etapa], [field]: frac } },
    }));
    dirty();
  };
  const updPrest = (field: keyof AppConfig["prestacao"], val: number) => {
    setCfg((c) => ({ ...c, prestacao: { ...c.prestacao, [field]: val } }));
    dirty();
  };

  const save = async () => {
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (res.ok) {
        setStatus("saved");
        setMsg("Alterações salvas. A calculadora já usa os novos valores.");
      } else {
        const d = await res.json().catch(() => ({}));
        setStatus("error");
        setMsg(d.error || "Erro ao salvar.");
      }
    } catch {
      setStatus("error");
      setMsg("Falha de conexão.");
    }
  };

  const cardCls =
    "bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-6 mb-5";
  const h2 = "text-[16px] font-semibold text-ink";
  const subCls = "text-[13px] text-ink-3 mt-1 mb-4";

  return (
    <div>
      {/* Nichos / CPL */}
      <section className={cardCls}>
        <h2 className={h2}>Nichos e CPL</h2>
        <p className={subCls}>
          Benchmark de CPL por nicho. `base`/`total` = clientes com dado / total no nicho
          (amostra ≤2 dispara aviso na calculadora). `Leads / venda` = média de leads para
          fechar uma venda; alimenta a Tabela Consultiva (texto livre, ex.: “80-120”).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-wide">
                <th className="text-left font-bold py-2 pr-3">Nicho</th>
                <th className="text-left font-bold py-2 px-3 w-[120px]">CPL (R$)</th>
                <th className="text-left font-bold py-2 px-3 w-[80px]">Base</th>
                <th className="text-left font-bold py-2 px-3 w-[80px]">Total</th>
                <th className="text-left font-bold py-2 px-3 w-[120px]">Leads / venda</th>
                <th className="text-left font-bold py-2 px-3 w-[120px]">Ticket padrão</th>
                <th className="text-left font-bold py-2 px-3 w-[110px]">Ciclo (dias)</th>
                <th className="py-2 pl-3 w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {cfg.nichos.map((n, i) => (
                <tr key={n.id} className="border-t border-line">
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={n.nome}
                      onChange={(e) => updNicho(i, { nome: e.target.value })}
                      placeholder="Nome do nicho"
                      className="w-full border-[1.5px] border-line rounded-md px-2.5 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-brand"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Num
                      value={n.cpl}
                      onChange={(v) => updNicho(i, { cpl: v })}
                      prefix="R$"
                      step={0.01}
                    />
                    {cplReal[n.nome] && (
                      <button
                        type="button"
                        onClick={() =>
                          updNicho(i, {
                            cpl: Math.round(cplReal[n.nome].cplMedio * 100) / 100,
                          })
                        }
                        title="Aplicar o CPL real médio dos cases deste nicho"
                        className="mt-1 text-[10.5px] text-pos hover:underline block tabular"
                      >
                        real: {fmtBRL(cplReal[n.nome].cplMedio, true)} ({cplReal[n.nome].amostra}) ↑
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <Num value={n.base} onChange={(v) => updNicho(i, { base: v })} step={1} />
                  </td>
                  <td className="py-2 px-3">
                    <Num
                      value={n.total}
                      onChange={(v) => updNicho(i, { total: v })}
                      step={1}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={n.leadsPorVenda ?? ""}
                      onChange={(e) => updNicho(i, { leadsPorVenda: e.target.value })}
                      placeholder="ex.: 80-120"
                      className="w-full border-[1.5px] border-line rounded-md px-2.5 py-2 text-[13.5px] text-ink bg-surface tabular focus:outline-none focus:border-brand"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Num
                      value={n.ticketPadrao ?? 0}
                      onChange={(v) => updNicho(i, { ticketPadrao: v })}
                      prefix="R$"
                      step={100}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Num
                      value={n.cicloPadrao ?? 0}
                      onChange={(v) => updNicho(i, { cicloPadrao: v })}
                      step={1}
                    />
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => rmNicho(i)}
                      title="Remover nicho"
                      className="text-ink-3 hover:text-neg text-[16px] leading-none px-1"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addNicho}
          className="mt-3 text-[13px] font-semibold text-brand border border-line rounded-md px-3 py-1.5 hover:bg-surface-alt transition-colors"
        >
          + Adicionar nicho
        </button>
      </section>

      {/* Faixas de conversão */}
      <section className={cardCls}>
        <h2 className={h2}>Faixas de conversão do funil</h2>
        <p className={subCls}>
          Pessimista usa o mínimo, Otimista o máximo, e a sugestão preenche o botão “Usar
          sugestões de mercado”. Valores em %.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-wide">
                <th className="text-left font-bold py-2 pr-3">Etapa</th>
                <th className="text-left font-bold py-2 px-3 w-[120px]">Mínimo</th>
                <th className="text-left font-bold py-2 px-3 w-[120px]">Sugestão</th>
                <th className="text-left font-bold py-2 px-3 w-[120px]">Máximo</th>
              </tr>
            </thead>
            <tbody>
              {ETAPAS.map(([etapa, label]) => (
                <tr key={etapa} className="border-t border-line">
                  <td className="py-2 pr-3 font-medium text-ink">{label}</td>
                  <td className="py-2 px-3">
                    <Num
                      value={pct(cfg.rateBounds[etapa].min)}
                      onChange={(v) => updBound(etapa, "min", v / 100)}
                      suffix="%"
                      step={0.5}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Num
                      value={pct(cfg.rateBounds[etapa].sugestao)}
                      onChange={(v) => updBound(etapa, "sugestao", v / 100)}
                      suffix="%"
                      step={0.5}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Num
                      value={pct(cfg.rateBounds[etapa].max)}
                      onChange={(v) => updBound(etapa, "max", v / 100)}
                      suffix="%"
                      step={0.5}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Prestação */}
      <section className={cardCls}>
        <h2 className={h2}>Regra da prestação SEED</h2>
        <p className={subCls}>
          Precificação a partir do saldo acumulado no mês base. Ideal = % do saldo; abaixo do
          piso aplica o mínimo; acima do teto aplica o % reduzido sobre a base inteira.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
              % ideal
            </span>
            <Num
              value={pct(cfg.prestacao.pctIdeal)}
              onChange={(v) => updPrest("pctIdeal", v / 100)}
              suffix="%"
              step={0.5}
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
              % reduzido (contas grandes)
            </span>
            <Num
              value={pct(cfg.prestacao.pctReduzido)}
              onChange={(v) => updPrest("pctReduzido", v / 100)}
              suffix="%"
              step={0.5}
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
              Meses base
            </span>
            <Num
              value={cfg.prestacao.mesesBase}
              onChange={(v) => updPrest("mesesBase", Math.max(1, Math.round(v)))}
              suffix="meses"
              step={1}
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
              Piso (mínimo viável)
            </span>
            <Num
              value={cfg.prestacao.piso}
              onChange={(v) => updPrest("piso", v)}
              prefix="R$"
              step={1000}
            />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
              Teto de referência
            </span>
            <Num
              value={cfg.prestacao.tetoRef}
              onChange={(v) => updPrest("tetoRef", v)}
              prefix="R$"
              step={1000}
            />
          </label>
        </div>
      </section>

      {/* Barra de salvar */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-line py-3 flex items-center justify-between gap-3">
        <span
          className={`text-[13px] ${
            status === "error" ? "text-neg" : status === "saved" ? "text-pos" : "text-ink-3"
          }`}
        >
          {msg}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-2.5 hover:bg-brand-2 transition-colors disabled:opacity-60"
        >
          {status === "saving" ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
