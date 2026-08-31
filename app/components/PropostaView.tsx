"use client";

import { useEffect, useState } from "react";
import { fmtBRL, fmtMeses, fmtMult, fmtNum } from "@/lib/format";
import type { PagamentoCalc, Scenario, SnowRowFee } from "@/lib/types";
import Funnel from "./Funnel";
import SnowballView from "./Snowball";

const SC_LABEL: Record<Scenario, string> = {
  pessimista: "Pessimista",
  realista: "Realista",
  otimista: "Otimista",
};

export default function PropostaView(props: {
  cliente: string;
  preparadoPor: string;
  dataISO: string;
  nicho: string;
  isInvest: boolean;
  scenario: Scenario;
  duracao: number;
  cicloDias: number;
  funnel: { label: string; value: number }[];
  valorPrincipal: number;
  roi: number;
  payback: number | null;
  investimentoMensal: number;
  feeBase: number;
  feeEfetiva: number;
  mrrEfetiva: number;
  mesesBase: number;
  descontoCampanha: string | null;
  pagamentos: PagamentoCalc[];
  snowRows: SnowRowFee[];
  paybackMonth: number | null;
  lag: number;
  simId?: string; // presente só na visão do vendedor (habilita o link do cliente)
  viewToken?: string; // presente só na visão pública → registra a abertura
  shareToken?: string | null;
  shareViews?: number;
  shareLastViewedAt?: string | null;
  shareExpiresAt?: string | null;
}) {
  const temDesconto =
    props.descontoCampanha !== null && props.feeEfetiva < props.feeBase;
  const dataBR = new Date(props.dataISO).toLocaleDateString("pt-BR");

  // Visão pública: registra a abertura pelo cliente (uma vez).
  useEffect(() => {
    if (!props.viewToken) return;
    fetch("/api/share/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: props.viewToken }),
    }).catch(() => {});
  }, [props.viewToken]);

  const [linkStatus, setLinkStatus] = useState<"idle" | "gerando" | "copiado" | "erro">(
    "idle",
  );
  const copiarLink = async () => {
    if (!props.simId) return;
    setLinkStatus("gerando");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.simId }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error();
      const url = `${window.location.origin}/p/${data.token}`;
      try {
        await navigator.clipboard.writeText(url);
        setLinkStatus("copiado");
      } catch {
        window.prompt("Copie o link da proposta:", url);
        setLinkStatus("copiado");
      }
      setTimeout(() => setLinkStatus("idle"), 2500);
    } catch {
      setLinkStatus("erro");
      setTimeout(() => setLinkStatus("idle"), 2500);
    }
  };

  const [revogado, setRevogado] = useState(false);
  const revogarLink = async () => {
    if (!props.simId) return;
    if (!confirm("Revogar o link? Quem já tiver o link deixa de conseguir abrir.")) return;
    const res = await fetch("/api/share", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: props.simId }),
    });
    if (res.ok) setRevogado(true);
  };

  return (
    <div className="proposta-root min-h-screen bg-bg text-ink">
      {/* Cabeçalho */}
      <header className="bg-brand text-white">
        <div className="mx-auto max-w-[960px] px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-white text-brand text-[14px] font-black">
              3F
            </span>
            <div className="leading-tight">
              <div className="text-[16px] font-semibold">SEED</div>
              <div className="text-[11px] text-white/60">Proposta comercial</div>
            </div>
          </div>
          <div className="no-print flex items-center gap-2.5">
            {props.simId && !revogado && (
              <button
                type="button"
                onClick={copiarLink}
                disabled={linkStatus === "gerando"}
                className="text-[13px] font-semibold text-brand bg-white rounded-lg px-4 py-2 hover:bg-white/90 transition-colors disabled:opacity-70"
              >
                {linkStatus === "gerando"
                  ? "Gerando…"
                  : linkStatus === "copiado"
                    ? "Link copiado ✓"
                    : linkStatus === "erro"
                      ? "Erro ao gerar"
                      : "Copiar link do cliente"}
              </button>
            )}
            {props.simId && props.shareToken != null && !revogado && (
              <button
                type="button"
                onClick={revogarLink}
                className="text-[13px] font-semibold text-white/80 border border-white/30 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
              >
                Revogar link
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="text-[13px] font-semibold text-white border border-white/30 rounded-lg px-4 py-2 hover:bg-white/10 transition-colors"
            >
              Baixar PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-6 py-10">
        {/* Dados */}
        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
            Proposta para
          </div>
          <h1 className="text-[28px] font-bold text-ink leading-tight mt-1">
            {props.cliente || "Cliente"}
          </h1>
          <div className="text-[13px] text-ink-3 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <span>Nicho: {props.nicho || "—"}</span>
            <span>Cenário: {SC_LABEL[props.scenario]}</span>
            <span>Ciclo de venda: {fmtNum(props.cicloDias)} dias</span>
            {props.preparadoPor && <span>Por: {props.preparadoPor}</span>}
            <span>{dataBR}</span>
          </div>
          {props.simId && (props.shareViews || props.shareToken) && !revogado && (
            <div className="no-print mt-3 text-[12px] text-ink-3 bg-surface-alt/60 rounded-md px-3 py-2 inline-block">
              Link do cliente:{" "}
              {props.shareViews
                ? `aberto ${fmtNum(props.shareViews)}× pelo cliente`
                : "ainda não aberto"}
              {props.shareLastViewedAt
                ? ` · última em ${new Date(props.shareLastViewedAt).toLocaleDateString("pt-BR")}`
                : ""}
              {props.shareExpiresAt
                ? ` · válido até ${new Date(props.shareExpiresAt).toLocaleDateString("pt-BR")}`
                : ""}
            </div>
          )}
        </div>

        {/* Resultado projetado */}
        <section className="mb-8">
          <SectionTitle>Resultado projetado por mês</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BigCard
              primary
              label={props.isInvest ? "Receita projetada / mês" : "Investimento / mês"}
              value={fmtBRL(props.valorPrincipal)}
            />
            <BigCard
              label="Payback estimado"
              value={props.payback !== null ? fmtMeses(props.payback) : "n/d"}
            />
            <BigCard
              label="Retorno projetado (por R$ 1 investido)"
              value={fmtMult(props.roi)}
            />
          </div>
          <p className="text-[12px] text-ink-3 mt-2">
            Com investimento de{" "}
            <strong className="text-ink-2">{fmtBRL(props.investimentoMensal)}/mês</strong> em
            mídia, ao longo de {props.duracao} meses. Estimativa baseada nas taxas de
            conversão informadas na reunião — não é garantia de resultado.
          </p>
        </section>

        {/* Bola de neve */}
        <section className="mb-8">
          <SectionTitle>Retorno acumulado mês a mês</SectionTitle>
          <SnowballView
            rows={props.snowRows}
            paybackMonth={props.paybackMonth}
            lag={props.lag}
            cicloDias={props.cicloDias}
            showPrestacao
          />
        </section>

        {/* Funil */}
        <section className="mb-8">
          <SectionTitle>Como chegamos lá — o funil</SectionTitle>
          <div className="bg-surface border border-line rounded-[var(--radius)] p-6">
            <Funnel stages={props.funnel} color="var(--brand)" />
          </div>
        </section>

        {/* A proposta */}
        <section className="mb-8">
          <SectionTitle>Investimento na SEED</SectionTitle>
          <div className="rounded-[var(--radius)] bg-brand text-white p-6 mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
              Prestação SEED — pacote de {props.mesesBase} meses
            </div>
            {temDesconto && (
              <div className="tabular text-[16px] text-white/45 line-through mt-1">
                {fmtBRL(props.feeBase)}
              </div>
            )}
            <div className="tabular text-[34px] font-bold leading-tight mt-0.5">
              {fmtBRL(props.feeEfetiva)}
            </div>
            <div className="tabular text-[15px] text-white/80 mt-0.5">
              ≈ {fmtBRL(props.mrrEfetiva)}/mês
            </div>
            {temDesconto && (
              <span
                className="inline-block mt-3 text-[11.5px] font-semibold rounded-full px-3 py-1"
                style={{ background: "var(--pos)" }}
              >
                Condição especial · {props.descontoCampanha}
              </span>
            )}
          </div>

          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-3 mb-2">
            Formas de pagamento
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {props.pagamentos.map(({ opcao, total, porMes }) => (
              <div
                key={opcao.id}
                className="bg-surface border border-line rounded-lg p-4"
              >
                <div className="text-[12.5px] font-semibold text-ink leading-snug min-h-[34px]">
                  {opcao.label}
                </div>
                <div className="mt-1">
                  {opcao.desconto > 0 ? (
                    <span className="text-[11px] font-semibold text-pos bg-pos-bg rounded-full px-2 py-0.5">
                      {fmtNum(opcao.desconto * 100)}% de desconto
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-ink-3 bg-surface-alt rounded-full px-2 py-0.5">
                      valor integral
                    </span>
                  )}
                </div>
                <div className="tabular text-[20px] font-bold text-ink mt-2">
                  {fmtBRL(total)}
                </div>
                {opcao.parcelas > 1 && (
                  <div className="tabular text-[12.5px] text-ink-3">
                    {opcao.parcelas}× de {fmtBRL(porMes)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11.5px] text-ink-3 leading-relaxed border-t border-line pt-4">
          Projeção baseada em benchmarks de CPL da carteira de clientes ativos da SEED e em
          faixas de conversão observadas pelo time comercial. Não é garantia de resultado —
          é uma estimativa para orientar a decisão de investimento.
        </p>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-3 mb-3">
      {children}
    </h2>
  );
}

function BigCard({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] p-5 ${
        primary ? "bg-brand text-white" : "bg-surface border border-line text-ink"
      }`}
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${
          primary ? "text-white/70" : "text-ink-3"
        }`}
      >
        {label}
      </div>
      <div className="tabular text-[26px] font-bold leading-none">{value}</div>
    </div>
  );
}
