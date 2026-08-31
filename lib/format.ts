// Formatação pt-BR. Mesmo padrão do dre-control.

const brl0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const brl2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtBRL(v: number | null | undefined, cents = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return cents ? "R$ 0,00" : "R$ 0";
  return cents ? brl2.format(v) : brl0.format(v);
}

export function fmtNum(v: number | null | undefined, d = 0): string {
  const n = Number.isFinite(v as number) ? (v as number) : 0;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtPct(v: number | null | undefined): string {
  const n = Number.isFinite(v as number) ? (v as number) * 100 : 0;
  return (
    n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"
  );
}

export function fmtMult(v: number | null | undefined): string {
  const n = Number.isFinite(v as number) ? (v as number) : 0;
  return (
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "x"
  );
}

export function fmtMeses(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "n/d";
  const singular = Math.abs(v - 1) < 0.05;
  return fmtNum(v, 1) + (singular ? " mês" : " meses");
}

export function hojeBR(): string {
  return new Date().toLocaleDateString("pt-BR");
}
