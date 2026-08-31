// Tipos centrais da calculadora SEED.
// A lógica de negócio por trás destes tipos está documentada em CONTEXT.md.

export type Mode = "investimento" | "meta";
export type Scenario = "pessimista" | "realista" | "otimista";

/* ============================================================
   Config editável (banco de dados administrado pelo admin).
   Ver lib/store.ts e o console /admin.
============================================================ */

/** Benchmark de CPL de um nicho. */
export interface NichoBenchmark {
  id: string;
  nome: string;
  cpl: number;
  base: number; // clientes com dado
  total: number; // clientes no nicho
  leadsPorVenda: string; // média de leads p/ fechar uma venda (texto: "80-120" ou "100")
  ticketPadrao?: number; // ticket médio típico do nicho (pré-preenche a call)
  cicloPadrao?: number; // ciclo de venda típico do nicho, em dias
}

/** Faixa de uma etapa do funil (frações 0–1). */
export interface RateBound {
  min: number;
  sugestao: number;
  max: number;
}
export interface RateBounds {
  atendido: RateBound;
  visita: RateBound;
  proposta: RateBound;
  venda: RateBound;
}

/** Parâmetros da regra de precificação da prestação (ver CONTEXT.md §13). */
export interface PrestacaoConfig {
  pctIdeal: number;
  pctReduzido: number;
  piso: number;
  tetoRef: number;
  mesesBase: number;
}

export interface AppConfig {
  nichos: NichoBenchmark[];
  rateBounds: RateBounds;
  prestacao: PrestacaoConfig;
}

/** As 4 taxas de conversão do funil, em fração (0–1). */
export interface Rates {
  atendido: number; // Lead → Atendido
  visita: number; // Atendido → Visita
  proposta: number; // Visita → Proposta
  venda: number; // Proposta → Venda
}

/** Estado completo preenchido pelo vendedor durante a call. */
export interface CalcState {
  mode: Mode;
  scenario: Scenario;
  nicho: string;
  cpl: number;
  investimento: number; // modo "investimento": mídia/mês
  meta: number; // modo "meta": faturamento TOTAL desejado
  ticket: number;
  cicloDias: number; // ciclo de venda em DIAS (ver CONTEXT.md §6)
  duracao: number; // meses — contrato (investimento) ou prazo da meta
  rates: Rates;
}

/** Resultado de um cálculo de funil (forward ou reverse). */
export interface CalcResult {
  leads: number;
  atendidos: number;
  visitas: number;
  propostas: number;
  vendas: number;
  receita: number;
  roi: number;
  investimento: number;
}

/** Uma linha da projeção mês a mês (bola de neve). */
export interface SnowRow {
  t: number;
  investeEsteMes: number;
  leadsEsteMes: number;
  vendasEsteMes: number;
  receitaEsteMes: number;
  cumInvest: number;
  cumReceita: number;
  saldo: number;
}

export interface Snowball {
  rows: SnowRow[];
  paybackMonth: number | null;
  lag: number;
  totalConv: number;
}

/** Linha da bola de neve com a prestação SEED embutida no acumulado. */
export interface SnowRowFee extends SnowRow {
  prestacaoEsteMes: number; // prestação SEED cobrada neste mês
  // cumInvest e saldo aqui já incluem a prestação acumulada.
}
export interface SnowballFee extends Omit<Snowball, "rows"> {
  rows: SnowRowFee[];
}

/** Em qual faixa da regra de precificação a prestação caiu. */
export type PrestacaoFaixa = "minimo" | "ideal" | "reduzido";

/** Prestação SEED sugerida a partir do saldo acumulado. Ver CONTEXT.md §13. */
export interface Prestacao {
  base: number; // saldo acumulado no mês 6 (cenário ativo)
  fee: number; // valor total do contrato (6 meses)
  mrr: number; // fee / 6 meses
  pctEfetivo: number | null; // % efetivo aplicado sobre a base
  faixa: PrestacaoFaixa;
}

/* ============================================================
   Histórico de simulações (persistido em data/simulations.json).
============================================================ */

/** Resumo desnormalizado para listagem no histórico. */
export interface SimulationSummary {
  mode: Mode;
  scenario: Scenario;
  nicho: string;
  valorPrincipal: number; // receita/mês (invest.) ou investimento/mês (meta)
  roi: number;
  payback: number | null;
  prestacaoFee: number | null;
  descontoCampanha?: string | null; // nome da campanha aplicada (para a proposta)
}

/* ============================================================
   Campanhas comerciais de desconto (admin) — data/campaigns.json.
============================================================ */

/** Como um cliente "se encaixa" na campanha (o admin escolhe). */
export type CampaignCriterioTipo = "minimo" | "todos" | "nicho" | "faixa";
/** Como o desconto é calculado (o admin escolhe). */
export type CampaignDescontoTipo = "piso" | "percentual" | "fixo";

export interface Campaign {
  id: string;
  nome: string;
  ativa: boolean;
  // Alvo
  alvoTodos: boolean; // true = todos os vendedores
  vendedores: string[]; // e-mails (quando alvoTodos = false)
  // Critério de encaixe
  criterioTipo: CampaignCriterioTipo;
  criterioNicho?: string; // quando criterioTipo = "nicho"
  criterioMin?: number; // quando "faixa" (valor da prestação)
  criterioMax?: number; // quando "faixa"
  // Desconto
  descontoTipo: CampaignDescontoTipo;
  descontoValor: number; // piso/fixo: R$; percentual: fração 0–1
  createdAt: string;
}

/** Campanha aplicável + a nova prestação com desconto. */
export interface CampaignMatch {
  campaign: Campaign;
  novaFee: number;
}

/* ============================================================
   Cases e Projetos (prova social) — data/cases.json.
   Curado pelo admin a partir dos debriefings da operação; exibido ao
   vendedor filtrado por nicho, anonimizado ("Cliente de <nicho>").
============================================================ */
export interface Case {
  id: string;
  nicho: string;
  apelido: string; // referência interna do admin (NÃO exibida ao prospect)
  periodo: string; // ex.: "Julho/2026" ou "Mai–Ago 2026"
  destaque: string; // 1–2 frases de impacto
  // Métricas headline (todas opcionais — nem todo case tem todas)
  roas?: number;
  faturamento?: number;
  vendas?: number;
  ticketMedio?: number;
  cpl?: number;
  cac?: number;
  investimento?: number;
  publicado: boolean;
  createdAt: string;
}

/* ============================================================
   Formas de pagamento.
============================================================ */
export interface PagamentoOpcao {
  id: string;
  label: string;
  desconto: number; // fração 0–1 sobre o pacote semestral
  parcelas: number;
}
export interface PagamentoCalc {
  opcao: PagamentoOpcao;
  total: number;
  porMes: number;
}

/** Desfecho comercial de uma simulação/proposta. */
export type DealStatus = "aberta" | "ganho" | "perdido";

/** Registro de uma simulação. Salvo já no preenchimento do Ponto de partida
 *  (rascunho) e atualizado até a exportação. Guarda o estado completo p/ reabrir. */
export interface SimulationRecord {
  id: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO — última atualização (auto-save)
  exportado: boolean; // false = rascunho; true = PDF gerado
  status?: DealStatus; // desfecho comercial (default "aberta")
  sellerEmail: string;
  sellerNome: string;
  cliente: string;
  preparadoPor: string;
  observacoes: string;
  state: CalcState; // inputs completos (para reabrir na calculadora)
  prestacaoAplicada: boolean;
  summary: SimulationSummary;
  shareToken?: string; // token do link público da proposta (gerado sob demanda)
  shareExpiresAt?: string; // ISO — validade do link público
  shareViews?: number; // quantas vezes o cliente abriu o link
  shareLastViewedAt?: string; // ISO — última abertura pelo cliente
}
