// Motor de cálculo — funções puras. Portado 1:1 do protótipo, com as fórmulas
// documentadas em CONTEXT.md. Antes de "corrigir" um número, leia a seção
// correspondente do CONTEXT.md.

import { DIAS_POR_MES, getActiveRates } from "./benchmarks";
import type {
  CalcResult,
  CalcState,
  Prestacao,
  PrestacaoConfig,
  Rates,
  Scenario,
  Snowball,
  SnowballFee,
  SnowRowFee,
} from "./types";

export function cicloMeses(cicloDias: number): number {
  return cicloDias / DIAS_POR_MES;
}

export function clampPct(v: number | string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Meta TOTAL ÷ prazo (meses) = meta mensal. Ver CONTEXT.md §4. */
export function metaMensal(state: Pick<CalcState, "meta" | "duracao">): number {
  return state.duracao > 0 ? state.meta / state.duracao : 0;
}

/** Modo forward: Investimento ÷ CPL → Leads → … → Vendas → Receita. */
export function calcForward(
  investimento: number,
  cpl: number,
  rates: Rates,
  ticket: number,
): CalcResult {
  const leads = cpl > 0 ? investimento / cpl : 0;
  const atendidos = leads * rates.atendido;
  const visitas = atendidos * rates.visita;
  const propostas = visitas * rates.proposta;
  const vendas = propostas * rates.venda;
  const receita = vendas * ticket;
  const roi = investimento > 0 ? receita / investimento : 0;
  return { leads, atendidos, visitas, propostas, vendas, receita, roi, investimento };
}

/** Modo reverse: parte da meta MENSAL e reverte o funil até o investimento. */
export function calcReverse(
  metaMes: number,
  cpl: number,
  rates: Rates,
  ticket: number,
): CalcResult {
  const vendas = ticket > 0 ? metaMes / ticket : 0;
  const propostas = rates.venda > 0 ? vendas / rates.venda : 0;
  const visitas = rates.proposta > 0 ? propostas / rates.proposta : 0;
  const atendidos = rates.visita > 0 ? visitas / rates.visita : 0;
  const leads = rates.atendido > 0 ? atendidos / rates.atendido : 0;
  const investimento = leads * cpl;
  const roi = investimento > 0 ? metaMes / investimento : 0;
  return { leads, atendidos, visitas, propostas, vendas, receita: metaMes, roi, investimento };
}

/** Aproximação de 1ª ordem do payback em meses. Ver CONTEXT.md §8. */
export function calcPayback(
  investimentoMensal: number,
  receitaMensal: number,
  ciclo: number,
): number | null {
  if (receitaMensal <= 0) return null;
  return ciclo + (investimentoMensal * ciclo) / receitaMensal;
}

/** Cálculo ativo conforme modo + cenário. */
export function activeCalc(state: CalcState, scenario: Scenario): CalcResult {
  const rates = getActiveRates(scenario, state.rates);
  if (state.mode === "investimento") {
    return calcForward(state.investimento, state.cpl, rates, state.ticket);
  }
  return calcReverse(metaMensal(state), state.cpl, rates, state.ticket);
}

/**
 * Efeito bola de neve. Investimento constante durante `duracao` meses; leads do
 * mês t fecham no mês t+lag (lag = ciclo em meses arredondado). Ver CONTEXT.md §5.
 */
export function buildSnowball(
  investimentoMensal: number,
  cpl: number,
  rates: Rates,
  ticket: number,
  ciclo: number,
  duracao: number,
): Snowball {
  const lag = Math.max(0, Math.round(ciclo));
  const totalConv = rates.atendido * rates.visita * rates.proposta * rates.venda;
  const timeline = Math.min(30, Math.max(duracao, duracao + lag + 1));
  const leadsPerActiveMonth = cpl > 0 ? investimentoMensal / cpl : 0;

  const rows = [];
  let cumInvest = 0;
  let cumReceita = 0;
  let paybackMonth: number | null = null;

  for (let t = 1; t <= timeline; t++) {
    const investeEsteMes = t <= duracao ? investimentoMensal : 0;
    const leadsEsteMes = t <= duracao ? leadsPerActiveMonth : 0;

    const sourceMonth = t - lag;
    const leadsQueFecham =
      sourceMonth >= 1 && sourceMonth <= duracao ? leadsPerActiveMonth : 0;
    const vendasEsteMes = leadsQueFecham * totalConv;
    const receitaEsteMes = vendasEsteMes * ticket;

    cumInvest += investeEsteMes;
    cumReceita += receitaEsteMes;
    const saldo = cumReceita - cumInvest;
    if (paybackMonth === null && saldo >= 0 && cumReceita > 0) paybackMonth = t;

    rows.push({
      t,
      investeEsteMes,
      leadsEsteMes,
      vendasEsteMes,
      receitaEsteMes,
      cumInvest,
      cumReceita,
      saldo,
    });
  }
  return { rows, paybackMonth, lag, totalConv };
}

/** Saldo acumulado no mês `mesesBase` (fallback: última linha disponível). */
export function saldoMes6(snow: Snowball, mesesBase: number): number {
  const row =
    snow.rows.find((r) => r.t === mesesBase) ?? snow.rows[snow.rows.length - 1];
  return row ? row.saldo : 0;
}

/**
 * Prestação SEED sugerida a partir do saldo acumulado no mês base. Regra em três
 * faixas — ver CONTEXT.md §13. Os parâmetros vêm da config editável.
 */
export function computePrestacao(
  snow: Snowball,
  cfg: PrestacaoConfig,
): Prestacao {
  const base = Math.max(0, saldoMes6(snow, cfg.mesesBase));
  const ideal = cfg.pctIdeal * base;

  let fee: number;
  let faixa: Prestacao["faixa"];
  let pctEfetivo: number | null;

  if (ideal > cfg.tetoRef) {
    // conta grande: recalcula tudo com % reduzido sobre a base inteira
    fee = cfg.pctReduzido * base;
    faixa = "reduzido";
    pctEfetivo = cfg.pctReduzido;
  } else if (ideal < cfg.piso) {
    // abaixo da faixa: aplica o mínimo viável. O % efetivo aqui não é a história
    // (o piso sobrepõe o %) e explode para bases pequenas — não expomos.
    fee = cfg.piso;
    faixa = "minimo";
    pctEfetivo = null;
  } else {
    fee = ideal;
    faixa = "ideal";
    pctEfetivo = cfg.pctIdeal;
  }

  return { base, fee, mrr: fee / cfg.mesesBase, pctEfetivo, faixa };
}

/**
 * Reprojeta a bola de neve incluindo a prestação SEED como custo mensal do
 * cliente durante os meses de contrato. A prestação NÃO altera a receita de
 * vendas — só entra no investido acumulado, o que reduz o saldo e desloca o
 * payback. `prestacaoMensal` é cobrada nos meses 1..feeMonths.
 */
export function withPrestacao(
  snow: Snowball,
  prestacaoMensal: number,
  feeMonths: number,
): SnowballFee {
  let cumPrest = 0;
  let paybackMonth: number | null = null;
  const rows: SnowRowFee[] = snow.rows.map((r) => {
    const prestacaoEsteMes = r.t <= feeMonths ? prestacaoMensal : 0;
    cumPrest += prestacaoEsteMes;
    const cumInvest = r.cumInvest + cumPrest; // mídia + prestação acumuladas
    const saldo = r.cumReceita - cumInvest;
    if (paybackMonth === null && saldo >= 0 && r.cumReceita > 0) paybackMonth = r.t;
    return { ...r, prestacaoEsteMes, cumInvest, saldo };
  });
  return { rows, paybackMonth, lag: snow.lag, totalConv: snow.totalConv };
}
