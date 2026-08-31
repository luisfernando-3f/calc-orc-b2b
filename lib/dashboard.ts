// Agregações do painel a partir do histórico de simulações. Puro.

import type { SimulationRecord } from "./types";

export interface DashStats {
  total: number; // total de simulações
  comProposta: number; // com prestação gerada
  exportadas: number; // PDF gerado
  valorPropostoTotal: number; // soma das prestações
  ticketMedio: number; // média da prestação (das que têm)
  roiMedio: number; // ROI médio (das com dados)
  ganhos: number;
  perdidos: number;
  valorGanho: number; // soma das prestações das ganhas
  taxaConversao: number; // ganhos / (ganhos + perdidos)
  porNicho: { nicho: string; propostas: number }[];
}

export function computeDash(records: SimulationRecord[]): DashStats {
  const total = records.length;
  const comPresta = records.filter((r) => r.summary.prestacaoFee != null);
  const comProposta = comPresta.length;
  const exportadas = records.filter((r) => r.exportado !== false).length;
  const valorPropostoTotal = comPresta.reduce(
    (s, r) => s + (r.summary.prestacaoFee || 0),
    0,
  );
  const ticketMedio = comProposta ? valorPropostoTotal / comProposta : 0;
  const roiRecs = records.filter((r) => r.summary.roi > 0);
  const roiMedio = roiRecs.length
    ? roiRecs.reduce((s, r) => s + r.summary.roi, 0) / roiRecs.length
    : 0;

  const map = new Map<string, number>();
  comPresta.forEach((r) => {
    const n = r.summary.nicho || "—";
    map.set(n, (map.get(n) || 0) + 1);
  });
  const porNicho = [...map.entries()]
    .map(([nicho, propostas]) => ({ nicho, propostas }))
    .sort((a, b) => b.propostas - a.propostas);

  const ganhosRecs = records.filter((r) => r.status === "ganho");
  const ganhos = ganhosRecs.length;
  const perdidos = records.filter((r) => r.status === "perdido").length;
  const valorGanho = ganhosRecs.reduce(
    (s, r) => s + (r.summary.prestacaoFee || 0),
    0,
  );
  const decididos = ganhos + perdidos;
  const taxaConversao = decididos ? ganhos / decididos : 0;

  return {
    total,
    comProposta,
    exportadas,
    valorPropostoTotal,
    ticketMedio,
    roiMedio,
    ganhos,
    perdidos,
    valorGanho,
    taxaConversao,
    porNicho,
  };
}

export interface PorVendedor {
  nome: string;
  email: string;
  simulacoes: number;
  propostas: number;
  valor: number;
  ganhos: number;
  valorGanho: number;
}

export function computePorVendedor(records: SimulationRecord[]): PorVendedor[] {
  const map = new Map<string, PorVendedor>();
  records.forEach((r) => {
    let v = map.get(r.sellerEmail);
    if (!v) {
      v = {
        nome: r.sellerNome,
        email: r.sellerEmail,
        simulacoes: 0,
        propostas: 0,
        valor: 0,
        ganhos: 0,
        valorGanho: 0,
      };
      map.set(r.sellerEmail, v);
    }
    v.simulacoes++;
    if (r.summary.prestacaoFee != null) {
      v.propostas++;
      v.valor += r.summary.prestacaoFee;
    }
    if (r.status === "ganho") {
      v.ganhos++;
      v.valorGanho += r.summary.prestacaoFee || 0;
    }
  });
  return [...map.values()].sort((a, b) => b.valorGanho - a.valorGanho || b.valor - a.valor);
}
