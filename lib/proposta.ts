// Recalcula os dados da proposta a partir do registro salvo + config. Pura,
// usada tanto pela proposta interna (/proposta/[id]) quanto pela pública (/p/[token]).

import { getActiveRates } from "./benchmarks";
import {
  activeCalc,
  buildSnowball,
  calcPayback,
  cicloMeses,
  computePrestacao,
  withPrestacao,
} from "./engine";
import { calcPagamentos } from "./pagamentos";
import type { AppConfig, SimulationRecord } from "./types";

export function computePropostaData(record: SimulationRecord, config: AppConfig) {
  const s = record.state;
  const rates = getActiveRates(s.scenario, s.rates);
  const calc = activeCalc(s, s.scenario);
  const invMensal = s.mode === "investimento" ? s.investimento : calc.investimento;
  const snow = buildSnowball(
    invMensal,
    s.cpl,
    rates,
    s.ticket,
    cicloMeses(s.cicloDias),
    s.duracao,
  );
  const prestacaoBase = computePrestacao(snow, config.prestacao);
  const feeEfetiva = record.summary.prestacaoFee ?? prestacaoBase.fee;
  const mrrEfetiva = feeEfetiva / config.prestacao.mesesBase;
  const snowFee = withPrestacao(snow, mrrEfetiva, s.duracao);
  const isInvest = s.mode === "investimento";

  return {
    cliente: record.cliente,
    preparadoPor: record.preparadoPor,
    dataISO: record.updatedAt ?? record.createdAt,
    nicho: s.nicho,
    isInvest,
    scenario: s.scenario,
    duracao: s.duracao,
    cicloDias: s.cicloDias,
    funnel: [
      { label: isInvest ? "Leads" : "Leads necessários", value: calc.leads },
      {
        label: isInvest ? "Leads atendidos" : "Atendidos necessários",
        value: calc.atendidos,
      },
      { label: isInvest ? "Visitas" : "Visitas necessárias", value: calc.visitas },
      { label: isInvest ? "Propostas" : "Propostas necessárias", value: calc.propostas },
      { label: isInvest ? "Vendas" : "Vendas necessárias", value: calc.vendas },
    ],
    valorPrincipal: isInvest ? calc.receita : calc.investimento,
    roi: calc.roi,
    payback: calcPayback(calc.investimento, calc.receita, cicloMeses(s.cicloDias)),
    investimentoMensal: invMensal,
    feeBase: prestacaoBase.fee,
    feeEfetiva,
    mrrEfetiva,
    mesesBase: config.prestacao.mesesBase,
    descontoCampanha: record.summary.descontoCampanha ?? null,
    pagamentos: calcPagamentos(feeEfetiva),
    snowRows: snowFee.rows,
    paybackMonth: snowFee.paybackMonth,
    lag: snowFee.lag,
  };
}
