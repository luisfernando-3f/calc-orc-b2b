// Calibração: CPL real médio por nicho a partir dos cases publicados. Puro.

import type { Case } from "./types";

export interface CplReal {
  cplMedio: number;
  amostra: number; // quantos cases contribuíram
}

/** Mapa nicho → CPL real médio (só cases com cpl > 0). */
export function cplRealPorNicho(cases: Case[]): Record<string, CplReal> {
  const acc = new Map<string, { soma: number; n: number }>();
  cases.forEach((c) => {
    if (c.publicado && c.nicho && c.cpl && c.cpl > 0) {
      const e = acc.get(c.nicho) ?? { soma: 0, n: 0 };
      e.soma += c.cpl;
      e.n += 1;
      acc.set(c.nicho, e);
    }
  });
  const out: Record<string, CplReal> = {};
  acc.forEach((v, nicho) => {
    out[nicho] = { cplMedio: v.soma / v.n, amostra: v.n };
  });
  return out;
}
