"use client";

import { fmtBRL, fmtMeses, fmtMult, fmtNum, fmtPct } from "@/lib/format";
import { calcPayback, cicloMeses, metaMensal } from "@/lib/engine";
import { calcPagamentos } from "@/lib/pagamentos";
import type { CalcResult, CalcState, Prestacao, Rates, Snowball } from "@/lib/types";

const SC_LABEL = {
  pessimista: "Pessimista",
  realista: "Realista",
  otimista: "Otimista",
} as const;

/** Documento que só aparece na impressão (window.print → Salvar como PDF). */
export default function PrintReport({
  state,
  calc,
  snow,
  rates,
  cliente,
  preparadoPor,
  observacoes,
  prestacao,
  feeEfetiva,
  campanhaNome,
}: {
  state: CalcState;
  calc: CalcResult;
  snow: Snowball;
  rates: Rates;
  cliente: string;
  preparadoPor: string;
  observacoes: string;
  prestacao: Prestacao | null;
  feeEfetiva: number;
  campanhaNome: string | null;
}) {
  const isInvest = state.mode === "investimento";
  const pb = calcPayback(calc.investimento, calc.receita, cicloMeses(state.cicloDias));
  const funnel = isInvest
    ? ["Leads", "Leads atendidos", "Visitas", "Propostas", "Vendas"]
    : [
        "Leads necessários",
        "Atendidos necessários",
        "Visitas necessárias",
        "Propostas necessárias",
        "Vendas necessárias",
      ];
  const funnelVals = [calc.leads, calc.atendidos, calc.visitas, calc.propostas, calc.vendas];

  const th = "border border-[#d7d9da] px-2 py-1.5 text-left bg-[#eef0f1] font-semibold";
  const td = "border border-[#d7d9da] px-2 py-1.5 text-left";
  const h3 =
    "text-[15px] font-semibold text-[#2d3036] mt-6 mb-2 border-b border-[#d7d9da] pb-1";

  return (
    <div className="print-only" id="print-view">
      <div className="flex justify-between items-end border-b-[3px] border-[#2d3036] pb-3.5 mb-5">
        <div>
          <div className="text-[22px] font-bold text-[#2d3036] flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#2d3036] text-white text-[12px] font-black">
              3F
            </span>
            SEED
          </div>
          <div className="text-[12px] text-ink-2 mt-0.5">
            Marketing de performance para o agro
          </div>
        </div>
        <div className="text-[12px] text-ink-3 tabular">
          Gerado em {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>

      <div className={h3}>Resumo da proposta</div>
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[13px] mb-1.5">
        <div>
          <span className="text-ink-3">Cliente: </span>
          <strong>{cliente || "—"}</strong>
        </div>
        <div>
          <span className="text-ink-3">Preparado por: </span>
          <strong>{preparadoPor || "—"}</strong>
        </div>
        <div>
          <span className="text-ink-3">Nicho: </span>
          <strong>{state.nicho || "—"}</strong>
        </div>
        <div>
          <span className="text-ink-3">
            {isInvest ? "Duração do contrato: " : "Prazo da meta: "}
          </span>
          <strong>{state.duracao} meses</strong>
        </div>
        <div>
          <span className="text-ink-3">Cenário apresentado: </span>
          <strong>{SC_LABEL[state.scenario]}</strong>
        </div>
        <div>
          <span className="text-ink-3">Ciclo de venda considerado: </span>
          <strong>{fmtNum(state.cicloDias, 0)} dias</strong>
        </div>
      </div>

      <div className={h3}>Premissas acordadas</div>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <tr>
            <th className={th}>Ticket médio por venda</th>
            <td className={td}>{fmtBRL(state.ticket, true)}</td>
          </tr>
          <tr>
            <th className={th}>
              {isInvest ? "Investimento mensal em mídia" : "Meta de faturamento total"}
            </th>
            <td className={td}>{fmtBRL(isInvest ? state.investimento : state.meta)}</td>
          </tr>
          {!isInvest && (
            <tr>
              <th className={th}>Receita mensal necessária (meta ÷ prazo)</th>
              <td className={td}>{fmtBRL(metaMensal(state))}</td>
            </tr>
          )}
          <tr>
            <th className={th}>CPL médio usado</th>
            <td className={td}>{fmtBRL(state.cpl, true)}</td>
          </tr>
          <tr>
            <th className={th}>Lead → Atendido</th>
            <td className={td}>{fmtPct(rates.atendido)}</td>
          </tr>
          <tr>
            <th className={th}>Atendido → Visita</th>
            <td className={td}>{fmtPct(rates.visita)}</td>
          </tr>
          <tr>
            <th className={th}>Visita → Proposta</th>
            <td className={td}>{fmtPct(rates.proposta)}</td>
          </tr>
          <tr>
            <th className={th}>Proposta → Venda</th>
            <td className={td}>{fmtPct(rates.venda)}</td>
          </tr>
        </tbody>
      </table>

      <div className={h3}>Funil projetado (mensal, em regime)</div>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <tr>
            <th className={th}>Etapa</th>
            <th className={th}>Quantidade / mês</th>
          </tr>
          {funnel.map((l, i) => (
            <tr key={l}>
              <td className={td}>{l}</td>
              <td className={td}>{fmtNum(funnelVals[i], 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={h3}>Resultado</div>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <tr>
            <th className={th}>
              {isInvest ? "Receita mensal projetada" : "Investimento necessário / mês"}
            </th>
            <td className={td}>{fmtBRL(isInvest ? calc.receita : calc.investimento)}</td>
          </tr>
          <tr>
            <th className={th}>ROI (retorno por R$ investido)</th>
            <td className={td}>{fmtMult(calc.roi)}</td>
          </tr>
          <tr>
            <th className={th}>Payback estimado</th>
            <td className={td}>{pb !== null ? fmtMeses(pb) : "n/d"}</td>
          </tr>
        </tbody>
      </table>

      {prestacao &&
        (() => {
          const temDesconto = campanhaNome !== null && feeEfetiva < prestacao.fee;
          const feeFinal = temDesconto ? feeEfetiva : prestacao.fee;
          const pagamentos = calcPagamentos(feeFinal);
          return (
            <>
              <div className={h3}>Investimento na SEED</div>
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <th className={th}>Prestação SEED (contrato de 6 meses)</th>
                    <td className={td}>
                      {temDesconto && (
                        <span style={{ textDecoration: "line-through", color: "#8a9099" }}>
                          {fmtBRL(prestacao.fee)}
                        </span>
                      )}{" "}
                      <strong>{fmtBRL(feeFinal)}</strong>
                    </td>
                  </tr>
                  {temDesconto && (
                    <tr>
                      <th className={th}>Condição especial</th>
                      <td className={td}>{campanhaNome}</td>
                    </tr>
                  )}
                  <tr>
                    <th className={th}>Equivalente mensal (MRR)</th>
                    <td className={td}>{fmtBRL(feeFinal / 6)}/mês</td>
                  </tr>
                </tbody>
              </table>

              <div className={h3}>Formas de pagamento (pacote semestral)</div>
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <th className={th}>Forma</th>
                    <th className={th}>Condição</th>
                    <th className={th}>Total</th>
                  </tr>
                  {pagamentos.map(({ opcao, total, porMes }) => (
                    <tr key={opcao.id}>
                      <td className={td}>{opcao.label}</td>
                      <td className={td}>
                        {opcao.desconto > 0
                          ? `${fmtPct(opcao.desconto)} de desconto`
                          : "Valor integral"}
                      </td>
                      <td className={td}>
                        {fmtBRL(total)}
                        {opcao.parcelas > 1 ? ` (${opcao.parcelas}× ${fmtBRL(porMes)})` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}

      <div className={h3}>Projeção mês a mês (bola de neve)</div>
      {prestacao && (
        <p className="text-[11px] text-ink-3 mb-1.5">
          O investido acumulado abaixo inclui a mídia + a prestação SEED.
        </p>
      )}
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <tr>
            <th className={th}>Mês</th>
            <th className={th}>Investido acum.</th>
            <th className={th}>Receita acum.</th>
            <th className={th}>Saldo acum.</th>
          </tr>
          {snow.rows.map((r) => (
            <tr
              key={r.t}
              style={
                r.t === snow.paybackMonth
                  ? { background: "#e7f5ef", fontWeight: 700 }
                  : undefined
              }
            >
              <td className={td}>{r.t}</td>
              <td className={td}>{fmtBRL(r.cumInvest)}</td>
              <td className={td}>{fmtBRL(r.cumReceita)}</td>
              <td className={td}>{fmtBRL(r.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[11.5px] text-ink-2 mt-5 leading-relaxed border-t border-[#d7d9da] pt-2.5">
        <strong>Observações acordadas:</strong>
        <br />
        {observacoes || "—"}
        <br />
        <br />
        Projeção baseada em benchmarks de CPL da carteira de clientes ativos da SEED
        e em faixas de conversão observadas empiricamente pelo time comercial. Não é
        garantia de resultado — é uma estimativa para orientar a decisão de investimento.
      </div>
    </div>
  );
}
