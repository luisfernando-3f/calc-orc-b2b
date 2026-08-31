// Lógica pura de campanhas de desconto. Sem fs — pode rodar no cliente.

import type { Campaign, CampaignMatch, Prestacao } from "./types";

export interface MatchContext {
  sellerEmail: string;
  nicho: string;
  prestacao: Prestacao;
}

/** Prestação com o desconto da campanha aplicado. */
export function descontoFee(prestacao: Prestacao, c: Campaign): number {
  switch (c.descontoTipo) {
    case "percentual":
      return Math.max(0, prestacao.fee * (1 - c.descontoValor));
    case "fixo":
      return Math.max(0, c.descontoValor);
    case "piso":
      // Novo mínimo viável: só afeta quem está na faixa "mínimo" (bate o piso).
      return prestacao.faixa === "minimo"
        ? Math.max(0, c.descontoValor)
        : prestacao.fee;
  }
}

/** A campanha vale para este contexto? (ativa + alvo + critério de encaixe) */
export function campaignMatches(c: Campaign, ctx: MatchContext): boolean {
  if (!c.ativa) return false;
  if (!c.alvoTodos && !c.vendedores.includes(ctx.sellerEmail)) return false;
  switch (c.criterioTipo) {
    case "todos":
      return true;
    case "minimo":
      return ctx.prestacao.faixa === "minimo";
    case "nicho":
      return !!ctx.nicho && ctx.nicho === c.criterioNicho;
    case "faixa": {
      const min = c.criterioMin ?? 0;
      const max = c.criterioMax ?? Number.POSITIVE_INFINITY;
      return ctx.prestacao.fee >= min && ctx.prestacao.fee <= max;
    }
  }
}

/**
 * Primeira campanha aplicável que gera desconto REAL (nova prestação menor que a
 * atual). Evita notificar "você tem direito" sem mudança de valor.
 */
export function matchCampaign(
  campaigns: Campaign[],
  ctx: MatchContext,
): CampaignMatch | null {
  for (const c of campaigns) {
    if (!campaignMatches(c, ctx)) continue;
    const novaFee = descontoFee(ctx.prestacao, c);
    if (novaFee < ctx.prestacao.fee - 0.5) return { campaign: c, novaFee };
  }
  return null;
}
