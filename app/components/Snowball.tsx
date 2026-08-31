"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtBRL, fmtNum } from "@/lib/format";
import type { SnowRow } from "@/lib/types";

const COL_INVEST = "#d1495b"; // neg
const COL_RECEITA = "#0f8a5f"; // pos

type Row = SnowRow & { prestacaoEsteMes?: number };

export default function SnowballView({
  rows,
  paybackMonth,
  lag,
  cicloDias,
  showPrestacao,
}: {
  rows: Row[];
  paybackMonth: number | null;
  lag: number;
  cicloDias: number;
  showPrestacao: boolean;
}) {
  const data = rows.map((r) => ({
    mes: `M${r.t}`,
    investido: r.cumInvest,
    receita: r.cumReceita,
  }));
  const paybackLabel = paybackMonth !== null ? `M${paybackMonth}` : null;

  return (
    <div>
      {/* Payback banner */}
      {paybackMonth !== null ? (
        <div className="flex items-center gap-3.5 bg-pos-bg border border-pos/40 rounded-lg px-4 py-3.5 mb-5">
          <div className="text-[22px] font-bold text-pos tabular leading-none">
            Mês {paybackMonth}
          </div>
          <div className="text-[13px] text-ink-2 leading-snug">
            é quando a receita acumulada ultrapassa o investimento acumulado
            {showPrestacao ? " (mídia + prestação SEED)" : ""}, considerando o ciclo de
            venda de {fmtNum(cicloDias, 0)} dias (~{lag} {lag === 1 ? "mês" : "meses"}{" "}
            nesta tabela).
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 bg-neg-bg border border-neg/40 rounded-lg px-4 py-3.5 mb-5">
          <div className="text-[15px] font-bold text-neg leading-tight">
            Payback não atingido
          </div>
          <div className="text-[13px] text-ink-2 leading-snug">
            dentro da janela projetada — considere um investimento maior, um contrato mais
            longo, ou revise as taxas de conversão com o cliente.
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-surface-alt/60 rounded-lg p-4 mb-5">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COL_RECEITA} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COL_RECEITA} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gInvest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COL_INVEST} stopOpacity={0.1} />
                <stop offset="100%" stopColor={COL_INVEST} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e4e4" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "#8a9099" }}
              tickLine={false}
              axisLine={{ stroke: "#e3e4e4" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#8a9099" }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => fmtBRL(v as number)}
            />
            <Tooltip
              formatter={(v, name) => [
                fmtBRL(Number(v)),
                name === "receita" ? "Receita acum." : "Investido acum.",
              ]}
              labelFormatter={(l) => `Mês ${String(l).replace("M", "")}`}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e3e4e4",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            />
            {paybackLabel && (
              <ReferenceLine
                x={paybackLabel}
                stroke="#0f8a5f"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: "payback",
                  position: "top",
                  fontSize: 10,
                  fill: "#0f8a5f",
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="investido"
              stroke={COL_INVEST}
              strokeWidth={2}
              fill="url(#gInvest)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="receita"
              stroke={COL_RECEITA}
              strokeWidth={2}
              fill="url(#gReceita)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-5 justify-center mt-2 text-[12px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: COL_INVEST }}
            />
            Investido acumulado{showPrestacao ? " (mídia + prestação)" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: COL_RECEITA }}
            />
            Receita acumulada
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] tabular border-collapse">
          <thead>
            <tr className="text-ink-3 text-[11.5px] uppercase tracking-wide">
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">Mês</th>
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Investido no mês
              </th>
              {showPrestacao && (
                <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                  Prestação SEED
                </th>
              )}
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Leads gerados
              </th>
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Vendas fechadas
              </th>
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Receita no mês
              </th>
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Investido acum.
              </th>
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Receita acum.
              </th>
              <th className="text-center font-bold py-2 px-2.5 border-b-2 border-line">
                Saldo acum.
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isPayback = r.t === paybackMonth;
              return (
                <tr
                  key={r.t}
                  className={
                    isPayback
                      ? "bg-pos-bg font-bold"
                      : r.t % 2 === 0
                        ? "bg-surface-alt/50"
                        : ""
                  }
                >
                  <td className="text-center py-1.5 px-2.5">{r.t}</td>
                  <td className="text-center py-1.5 px-2.5">{fmtBRL(r.investeEsteMes)}</td>
                  {showPrestacao && (
                    <td className="text-center py-1.5 px-2.5 text-ink-2">
                      {fmtBRL(r.prestacaoEsteMes ?? 0)}
                    </td>
                  )}
                  <td className="text-center py-1.5 px-2.5">{fmtNum(r.leadsEsteMes, 1)}</td>
                  <td className="text-center py-1.5 px-2.5">{fmtNum(r.vendasEsteMes, 1)}</td>
                  <td className="text-center py-1.5 px-2.5">{fmtBRL(r.receitaEsteMes)}</td>
                  <td className="text-center py-1.5 px-2.5">{fmtBRL(r.cumInvest)}</td>
                  <td className="text-center py-1.5 px-2.5">{fmtBRL(r.cumReceita)}</td>
                  <td
                    className={`text-center py-1.5 px-2.5 ${
                      r.saldo < 0 ? "text-neg" : "text-pos"
                    }`}
                  >
                    {fmtBRL(r.saldo)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
