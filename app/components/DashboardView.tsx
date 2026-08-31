"use client";

import { fmtBRL, fmtNum } from "@/lib/format";
import type { PorVendedor } from "@/lib/dashboard";

export interface Kpi {
  label: string;
  value: string;
  primary?: boolean;
}

export default function DashboardView({
  titulo,
  subtitulo,
  kpis,
  porNicho,
  porVendedor,
  vazio,
  avisos,
}: {
  titulo: string;
  subtitulo: string;
  kpis: Kpi[];
  porNicho: { nicho: string; propostas: number }[];
  porVendedor?: PorVendedor[];
  vazio: boolean;
  avisos?: string[];
}) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">{titulo}</h1>
        <p className="text-[13px] text-ink-3 mt-1">{subtitulo}</p>
      </div>

      {avisos && avisos.length > 0 && (
        <div className="mb-6 rounded-[var(--radius)] border border-neg/40 bg-neg-bg px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-neg mb-1">
            Segurança
          </div>
          <ul className="text-[13px] text-ink-2 leading-snug list-disc pl-5 space-y-0.5">
            {avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {vazio ? (
        <div className="bg-surface border border-line rounded-[var(--radius)] p-12 text-center text-ink-3 text-[14px]">
          Ainda não há simulações para resumir. Assim que forem feitas, o painel se
          preenche automaticamente.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`rounded-[var(--radius)] p-4 ${
                  k.primary
                    ? "bg-brand text-white"
                    : "bg-surface border border-line text-ink"
                }`}
              >
                <div
                  className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${
                    k.primary ? "text-white/70" : "text-ink-3"
                  }`}
                >
                  {k.label}
                </div>
                <div className="tabular text-[22px] font-bold leading-none">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Propostas por nicho */}
            <div className="bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-5">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-3 mb-4">
                Propostas por nicho
              </h2>
              {porNicho.length === 0 ? (
                <p className="text-[13px] text-ink-3 py-8 text-center">
                  Nenhuma proposta gerada ainda.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(() => {
                    const max = Math.max(...porNicho.map((n) => n.propostas), 1);
                    return porNicho.map((n) => (
                      <div key={n.nicho}>
                        <div className="flex justify-between items-baseline text-[12.5px] mb-1">
                          <span className="text-ink-2 font-medium">{n.nicho}</span>
                          <span className="tabular text-ink">{fmtNum(n.propostas)}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-surface-alt overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${(n.propostas / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Por vendedor (admin) */}
            {porVendedor && (
              <div className="bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-5">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-3 mb-4">
                  Desempenho por vendedor
                </h2>
                {porVendedor.length === 0 ? (
                  <p className="text-[13px] text-ink-3 py-8 text-center">
                    Sem dados de vendedores ainda.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] border-collapse">
                      <thead>
                        <tr className="text-ink-3 text-[11px] uppercase tracking-wide">
                          <th className="text-left font-bold py-2 pr-3">Vendedor</th>
                          <th className="text-right font-bold py-2 px-2">Propostas</th>
                          <th className="text-right font-bold py-2 px-2">Ganhos</th>
                          <th className="text-right font-bold py-2 pl-2">Valor ganho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porVendedor.map((v) => (
                          <tr key={v.email} className="border-t border-line">
                            <td className="py-2 pr-3 font-medium text-ink">{v.nome}</td>
                            <td className="py-2 px-2 text-right tabular text-ink-2">
                              {fmtNum(v.propostas)}
                            </td>
                            <td className="py-2 px-2 text-right tabular text-pos font-semibold">
                              {fmtNum(v.ganhos)}
                            </td>
                            <td className="py-2 pl-2 text-right tabular font-semibold text-ink">
                              {fmtBRL(v.valorGanho)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
