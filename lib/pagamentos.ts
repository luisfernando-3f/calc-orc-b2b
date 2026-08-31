// Formas de pagamento do pacote semestral (a prestação SEED). Política fixa da
// casa — fácil de ajustar aqui. Aplicadas sobre a prestação vigente (com
// desconto de campanha, se houver).

import type { PagamentoCalc, PagamentoOpcao } from "./types";

export const PAGAMENTOS: PagamentoOpcao[] = [
  { id: "pix", label: "À vista no Pix", desconto: 0.15, parcelas: 1 },
  {
    id: "credito-avista",
    label: "À vista no cartão de crédito",
    desconto: 0.1,
    parcelas: 1,
  },
  {
    id: "credito-6x",
    label: "6x sem juros no cartão de crédito",
    desconto: 0,
    parcelas: 6,
  },
];

export function calcPagamentos(fee: number): PagamentoCalc[] {
  return PAGAMENTOS.map((opcao) => {
    const total = fee * (1 - opcao.desconto);
    return { opcao, total, porMes: total / opcao.parcelas };
  });
}
