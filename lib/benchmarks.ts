// Dados de base — valores PADRÃO (seed) da carteira SEED. A partir do login,
// estes números viram um "banco de dados" editável pelo admin (data/config.json,
// console /admin). Estes DEFAULT_* são só a semente inicial.
//
// NÃO edite os números sem ler CONTEXT.md §2, §3 e §13. Muita coisa aqui é
// decisão de negócio (faixas empíricas, regra de exclusão de CPL=0), não
// escolha técnica arbitrária.

import type {
  AppConfig,
  NichoBenchmark,
  Rates,
  RateBounds,
  Scenario,
} from "./types";

/**
 * CPL médio por nicho (R$). Benchmark real de 46 clientes ativos, calculado
 * EXCLUINDO 18 registros com CPL=0 (dado faltante). `base`/`total` = clientes
 * com dado / clientes no nicho — amostra pequena (≤2) é benchmark fraco.
 */
export const DEFAULT_NICHOS: NichoBenchmark[] = [
  { id: "nutricao-animal", nome: "Nutrição Animal", cpl: 14.35, base: 5, total: 9, leadsPorVenda: "" },
  { id: "nutricao-vegetal", nome: "Nutrição Vegetal", cpl: 12.95, base: 9, total: 15, leadsPorVenda: "" },
  { id: "softwares", nome: "Softwares", cpl: 15.0, base: 1, total: 2, leadsPorVenda: "" },
  { id: "servicos", nome: "Serviços", cpl: 49.63, base: 5, total: 7, leadsPorVenda: "" },
  { id: "financeiro", nome: "Financeiro", cpl: 65.22, base: 1, total: 2, leadsPorVenda: "" },
  { id: "maquinas", nome: "Máquinas e Equipamentos", cpl: 36.64, base: 7, total: 11, leadsPorVenda: "" },
];

/** Amostra considerada fraca (aviso na UI) quando há ≤2 clientes com dado. */
export const AMOSTRA_FRACA = 2;

/**
 * Faixas de conversão por etapa (fração). Percepção empírica do time comercial.
 * Pessimista = min, Otimista = max (âncoras fixas de mercado, CONTEXT.md §7).
 */
export const DEFAULT_RATE_BOUNDS: RateBounds = {
  atendido: { min: 0.3, sugestao: 0.4, max: 0.5 },
  visita: { min: 0.3, sugestao: 0.4, max: 0.5 },
  proposta: { min: 0.5, sugestao: 0.65, max: 0.8 },
  venda: { min: 0.25, sugestao: 0.375, max: 0.5 },
};

/** Regra de precificação da prestação SEED (ver CONTEXT.md §13). */
export const DEFAULT_PRESTACAO = {
  pctIdeal: 0.1,
  pctReduzido: 0.06,
  piso: 24000,
  tetoRef: 30000,
  mesesBase: 6,
};

/** Config padrão completa — semente do banco de dados editável. */
export const DEFAULT_CONFIG: AppConfig = {
  nichos: DEFAULT_NICHOS,
  rateBounds: DEFAULT_RATE_BOUNDS,
  prestacao: DEFAULT_PRESTACAO,
};

export const DIAS_POR_MES = 30;

export function getNicho(
  nichos: NichoBenchmark[],
  nome: string,
): NichoBenchmark | undefined {
  return nichos.find((n) => n.nome === nome);
}

/** Diferença dos cenários Pessimista/Otimista em relação ao Realista (20%). */
export const SCENARIO_SPREAD = 0.2;

function clampFrac(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Taxas ativas de um cenário. Realista = o que o vendedor digitou; Pessimista e
 * Otimista aplicam SCENARIO_SPREAD (20%) para menos / para mais SOMENTE nas duas
 * primeiras conversões — Lead → Atendido e Atendido → Visita (as etapas de topo
 * de funil, onde está a incerteza). Visita → Proposta e Proposta → Venda seguem
 * sempre iguais ao Realista. Travado em 0–100%. Decisão do usuário (CONTEXT §7).
 */
export function getActiveRates(scenario: Scenario, typed: Rates): Rates {
  if (scenario === "realista") return { ...typed };
  const factor = scenario === "pessimista" ? 1 - SCENARIO_SPREAD : 1 + SCENARIO_SPREAD;
  return {
    atendido: clampFrac(typed.atendido * factor),
    visita: clampFrac(typed.visita * factor),
    proposta: typed.proposta,
    venda: typed.venda,
  };
}
