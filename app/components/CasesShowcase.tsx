"use client";

import { useState } from "react";
import { fmtBRL, fmtMult, fmtNum } from "@/lib/format";
import type { Case } from "@/lib/types";

export default function CasesShowcase({
  cases,
  nichos,
}: {
  cases: Case[];
  nichos: string[];
}) {
  const [filtro, setFiltro] = useState<string>("");

  const visiveis = filtro ? cases.filter((c) => c.nicho === filtro) : cases;

  if (cases.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-[var(--radius)] p-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-ink-3 text-[22px] mb-4">
          ◫
        </div>
        <h2 className="text-[17px] font-semibold text-ink">Em breve</h2>
        <p className="text-[13.5px] text-ink-3 mt-1.5 max-w-[440px] mx-auto leading-relaxed">
          Os cases de resultado aparecem aqui assim que o administrador publicá-los.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtro por nicho */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Chip label="Todos" ativo={filtro === ""} onClick={() => setFiltro("")} />
        {nichos.map((n) => (
          <Chip key={n} label={n} ativo={filtro === n} onClick={() => setFiltro(n)} />
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-[13.5px] text-ink-3 py-8 text-center">
          Nenhum case neste nicho ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visiveis.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12.5px] font-semibold rounded-full px-3.5 py-1.5 border transition-colors ${
        ativo
          ? "bg-brand text-white border-brand"
          : "bg-surface text-ink-2 border-line hover:bg-surface-alt"
      }`}
    >
      {label}
    </button>
  );
}

function CaseCard({ c }: { c: Case }) {
  const metricas: { label: string; value: string }[] = [];
  if (c.roas) metricas.push({ label: "ROAS", value: fmtMult(c.roas) });
  if (c.faturamento) metricas.push({ label: "Faturamento", value: fmtBRL(c.faturamento) });
  if (c.vendas) metricas.push({ label: "Vendas", value: fmtNum(c.vendas) });
  if (c.ticketMedio) metricas.push({ label: "Ticket médio", value: fmtBRL(c.ticketMedio) });
  if (c.cpl) metricas.push({ label: "CPL", value: fmtBRL(c.cpl, true) });
  if (c.cac) metricas.push({ label: "CAC", value: fmtBRL(c.cac) });

  return (
    <div className="bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-2 bg-accent-bg rounded-full px-2.5 py-0.5">
          {c.nicho}
        </span>
        {c.periodo && <span className="text-[12px] text-ink-3">{c.periodo}</span>}
      </div>
      <h3 className="text-[16px] font-semibold text-ink mt-2">Cliente de {c.nicho}</h3>
      <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">{c.destaque}</p>

      {metricas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-line">
          {metricas.map((m) => (
            <div key={m.label}>
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
                {m.label}
              </div>
              <div className="tabular text-[15px] font-bold text-ink mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
