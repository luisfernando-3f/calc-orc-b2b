"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AMOSTRA_FRACA, getActiveRates, getNicho } from "@/lib/benchmarks";
import {
  activeCalc,
  buildSnowball,
  calcForward,
  calcPayback,
  calcReverse,
  cicloMeses,
  clampPct,
  computePrestacao,
  metaMensal,
  withPrestacao,
} from "@/lib/engine";
import { fmtBRL, fmtMeses, fmtMult, fmtNum, fmtPct, hojeBR } from "@/lib/format";
import { matchCampaign } from "@/lib/campaigns";
import { calcPagamentos } from "@/lib/pagamentos";
import type {
  AppConfig,
  CalcResult,
  CalcState,
  Campaign,
  Mode,
  Prestacao,
  PrestacaoConfig,
  Scenario,
  SimulationRecord,
} from "@/lib/types";
import { Card, Field, NumberInput, PillTabs, TextInput } from "./ui";
import Funnel from "./Funnel";
import SnowballView from "./Snowball";
import PrintReport from "./PrintReport";
import NotasPanel from "./NotasPanel";

const SC: Record<Scenario, { label: string; color: string; bg: string }> = {
  pessimista: { label: "Pessimista", color: "var(--sc-pess)", bg: "var(--sc-pess-bg)" },
  realista: { label: "Realista", color: "var(--sc-real)", bg: "var(--sc-real-bg)" },
  otimista: { label: "Otimista", color: "var(--sc-otim)", bg: "var(--sc-otim-bg)" },
};
const SCENARIOS: Scenario[] = ["pessimista", "realista", "otimista"];

const emptyState: CalcState = {
  mode: "investimento",
  scenario: "realista",
  nicho: "",
  cpl: 0,
  investimento: 0,
  meta: 0,
  ticket: 0,
  cicloDias: 0,
  duracao: 6,
  rates: { atendido: 0, visita: 0, proposta: 0, venda: 0 },
};

export default function Calculadora({
  config,
  user,
  initialSim,
  campaigns,
}: {
  config: AppConfig;
  user: { nome: string; email: string };
  initialSim: SimulationRecord | null;
  campaigns: Campaign[];
}) {
  const [state, setState] = useState<CalcState>(initialSim?.state ?? emptyState);
  const [cliente, setCliente] = useState(initialSim?.cliente ?? "");
  const [preparadoPor, setPreparadoPor] = useState(
    initialSim?.preparadoPor ?? user.nome ?? "",
  );
  const [dataCall, setDataCall] = useState("");
  const [observacoes, setObservacoes] = useState(initialSim?.observacoes ?? "");
  const [prestacaoAplicada, setPrestacaoAplicada] = useState(
    initialSim?.prestacaoAplicada ?? false,
  );
  const [descontoAplicado, setDescontoAplicado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notasAbertas, setNotasAbertas] = useState(true);
  // Id do registro no histórico (mesma simulação é atualizada, não duplicada).
  const simIdRef = useRef<string | null>(initialSim?.id ?? null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">(
    initialSim ? "saved" : "idle",
  );

  useEffect(() => setDataCall(hojeBR()), []);

  const set = (patch: Partial<CalcState>) => setState((s) => ({ ...s, ...patch }));
  const setRate = (k: keyof CalcState["rates"], pct: number) =>
    setState((s) => ({ ...s, rates: { ...s.rates, [k]: clampPct(pct) / 100 } }));

  const isInvest = state.mode === "investimento";
  const bounds = config.rateBounds;
  const nicho = getNicho(config.nichos, state.nicho);
  const amostraFraca = nicho ? nicho.base <= AMOSTRA_FRACA : false;

  // "Ponto de partida" preenchido → dispara o auto-save no histórico.
  const pontoPartidaCompleto =
    !!state.nicho &&
    state.ticket > 0 &&
    state.cicloDias > 0 &&
    (isInvest ? state.investimento > 0 : state.meta > 0);

  /* ---- cálculos derivados ---- */
  const rates = useMemo(
    () => getActiveRates(state.scenario, state.rates),
    [state.scenario, state.rates],
  );
  const calc = useMemo(() => activeCalc(state, state.scenario), [state]);
  const snow = useMemo(() => {
    const invMensal = isInvest ? state.investimento : calc.investimento;
    return buildSnowball(
      invMensal,
      state.cpl,
      rates,
      state.ticket,
      cicloMeses(state.cicloDias),
      state.duracao,
    );
  }, [state, calc, rates, isInvest]);
  const prestacao = useMemo(
    () => computePrestacao(snow, config.prestacao),
    [snow, config.prestacao],
  );

  /* ---- validação (usada pelo match de campanha e pelos botões) ---- */
  const getMissing = () => {
    const missing: string[] = [];
    if (!(state.ticket > 0)) missing.push("ticket médio");
    if (!state.nicho) missing.push("nicho do cliente");
    if (isInvest && !(state.investimento > 0)) missing.push("investimento mensal");
    if (!isInvest && !(state.meta > 0)) missing.push("meta de faturamento");
    if (!(state.cicloDias > 0)) missing.push("ciclo de venda (dias)");
    if (!(state.rates.atendido > 0)) missing.push("taxa Lead → Atendido");
    if (!(state.rates.visita > 0)) missing.push("taxa Atendido → Visita");
    if (!(state.rates.proposta > 0)) missing.push("taxa Visita → Proposta");
    if (!(state.rates.venda > 0)) missing.push("taxa Proposta → Venda");
    return missing;
  };
  const simCompleta = getMissing().length === 0;

  /* ---- campanha de desconto aplicável ---- */
  const campaignMatch = useMemo(
    () =>
      simCompleta
        ? matchCampaign(campaigns, {
            sellerEmail: user.email,
            nicho: state.nicho,
            prestacao,
          })
        : null,
    [simCompleta, campaigns, user.email, state.nicho, prestacao],
  );
  const descontoAtivo = descontoAplicado && !!campaignMatch;
  const feeEfetiva = descontoAtivo ? campaignMatch!.novaFee : prestacao.fee;
  const mrrEfetiva = feeEfetiva / config.prestacao.mesesBase;

  // Quando a prestação é aplicada, embute o custo dela no acumulado (mídia +
  // prestação), recalculando saldo e payback. Base do preço = saldo sem a taxa.
  const snowFee = useMemo(
    () =>
      prestacaoAplicada ? withPrestacao(snow, mrrEfetiva, state.duracao) : null,
    [prestacaoAplicada, snow, mrrEfetiva, state.duracao],
  );
  const snowDisplay = snowFee ?? snow;

  const funnelStages = isInvest
    ? [
        { label: "Leads", value: calc.leads },
        { label: "Leads atendidos", value: calc.atendidos },
        { label: "Visitas", value: calc.visitas },
        { label: "Propostas", value: calc.propostas },
        { label: "Vendas", value: calc.vendas },
      ]
    : [
        { label: "Leads necessários", value: calc.leads },
        { label: "Atendidos necessários", value: calc.atendidos },
        { label: "Visitas necessárias", value: calc.visitas },
        { label: "Propostas necessárias", value: calc.propostas },
        { label: "Vendas necessárias", value: calc.vendas },
      ];

  const payback = calcPayback(calc.investimento, calc.receita, cicloMeses(state.cicloDias));

  /* ---- histórico (auto-save + export + proposta) ---- */
  const salvarSimulacao = async (
    exportando: boolean,
    opts?: { forcarPrestacao?: boolean },
  ): Promise<string | null> => {
    const presAplic = opts?.forcarPrestacao ? true : prestacaoAplicada;
    const body = {
      id: simIdRef.current,
      exportado: exportando,
      state,
      cliente,
      preparadoPor,
      observacoes,
      prestacaoAplicada: presAplic,
      summary: {
        mode: state.mode,
        scenario: state.scenario,
        nicho: state.nicho,
        valorPrincipal: isInvest ? calc.receita : calc.investimento,
        roi: calc.roi,
        payback,
        prestacaoFee: presAplic ? feeEfetiva : null,
        descontoCampanha: descontoAtivo ? campaignMatch!.campaign.nome : null,
      },
    };
    setAutoSaveStatus("saving");
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.id) simIdRef.current = data.id;
      setAutoSaveStatus("saved");
      return simIdRef.current;
    } catch {
      // não bloqueia nada se o salvamento falhar
      setAutoSaveStatus("idle");
      return simIdRef.current;
    }
  };

  // "Gerar proposta": garante prestação calculada + salva + abre a tela
  // client-facing numa nova aba.
  const [gerandoProposta, setGerandoProposta] = useState(false);
  const abrirProposta = async () => {
    const missing = getMissing();
    if (missing.length) {
      alert("Antes de gerar a proposta, preencha: " + missing.join(", ") + ".");
      return;
    }
    setGerandoProposta(true);
    if (!prestacaoAplicada) setPrestacaoAplicada(true);
    const id = await salvarSimulacao(false, { forcarPrestacao: true });
    setGerandoProposta(false);
    if (id) window.open(`/proposta/${id}`, "_blank", "noopener");
  };

  // Auto-save: assim que o Ponto de partida está preenchido, grava/atualiza o
  // registro no histórico (debounce após parar de digitar).
  useEffect(() => {
    if (!pontoPartidaCompleto) return;
    const t = setTimeout(() => {
      void salvarSimulacao(false);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pontoPartidaCompleto,
    state,
    cliente,
    preparadoPor,
    observacoes,
    prestacaoAplicada,
    descontoAplicado,
    feeEfetiva,
  ]);

  const exportPDF = async () => {
    const missing = getMissing();
    if (missing.length) {
      alert("Antes de gerar o PDF, preencha: " + missing.join(", ") + ".");
      return;
    }
    setSaving(true);
    await salvarSimulacao(true);
    setSaving(false);
    window.print();
  };

  const aplicarPrestacao = () => {
    if (prestacaoAplicada) {
      setPrestacaoAplicada(false);
      return;
    }
    const missing = getMissing();
    if (missing.length) {
      alert("Antes de calcular a prestação, preencha: " + missing.join(", ") + ".");
      return;
    }
    setPrestacaoAplicada(true);
  };

  // Aplica a condição especial direto do popup (garante prestação visível + desconto).
  const aplicarCondicaoEspecial = () => {
    setPrestacaoAplicada(true);
    setDescontoAplicado(true);
  };

  const reset = () => {
    setState(emptyState);
    setCliente("");
    setPreparadoPor(user.nome ?? "");
    setObservacoes("");
    setDataCall(hojeBR());
    setPrestacaoAplicada(false);
    setDescontoAplicado(false);
    // Nova simulação = novo registro no histórico.
    simIdRef.current = null;
    setAutoSaveStatus("idle");
  };

  const sugerirTaxas = () =>
    setState((s) => ({
      ...s,
      rates: {
        atendido: bounds.atendido.sugestao,
        visita: bounds.visita.sugestao,
        proposta: bounds.proposta.sugestao,
        venda: bounds.venda.sugestao,
      },
    }));

  return (
    <>
      <div
        className={`px-6 py-8 transition-[padding] ${
          notasAbertas ? "xl:pr-[340px] mx-auto max-w-[1520px]" : "mx-auto max-w-[1180px]"
        }`}
      >
        {initialSim && (
          <div className="mb-5 rounded-lg bg-accent-bg border border-line px-4 py-3 text-[13px] text-ink-2 no-print">
            Reaberta a simulação de{" "}
            <strong>{initialSim.cliente || "cliente sem nome"}</strong> —{" "}
            {new Date(initialSim.createdAt).toLocaleDateString("pt-BR")} · vendedor{" "}
            {initialSim.sellerNome}. Ajuste à vontade e gere um novo PDF.
          </div>
        )}

        {/* Passo 1 — dados da call */}
        <Card
          step={1}
          title="Dados da call"
          sub="Preenchido junto com o cliente. Vai também no cabeçalho do PDF final."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
            <Field label="Nome do cliente / empresa" htmlFor="clienteNome">
              <TextInput
                id="clienteNome"
                value={cliente}
                onValue={setCliente}
                placeholder="Ex.: Fazenda Modelo Agropecuária"
              />
            </Field>
            <Field label="Preparado por (vendedor SEED)" htmlFor="preparadoPor">
              <TextInput
                id="preparadoPor"
                value={preparadoPor}
                onValue={setPreparadoPor}
                placeholder="Seu nome"
              />
            </Field>
            <Field label="Data" htmlFor="dataCall">
              <TextInput id="dataCall" value={dataCall} onValue={setDataCall} />
            </Field>
          </div>
        </Card>

        {/* Passo 2 — ponto de partida */}
        <Card
          step={2}
          title="Ponto de partida"
          sub="Escolha como o cliente está pensando o investimento."
        >
          <div className="mb-5">
            <PillTabs<Mode>
              value={state.mode}
              onChange={(mode) => set({ mode })}
              options={[
                { value: "investimento", label: "Por investimento" },
                { value: "meta", label: "Por meta de faturamento" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <Field label="Nicho do cliente" htmlFor="nicho">
                <select
                  id="nicho"
                  value={state.nicho}
                  onChange={(e) => {
                    const nome = e.target.value;
                    const n = getNicho(config.nichos, nome);
                    const patch: Partial<CalcState> = { nicho: nome, cpl: n ? n.cpl : 0 };
                    // pré-preenche ticket/ciclo típicos do nicho (só se ainda vazios)
                    if (n) {
                      if (state.ticket === 0 && n.ticketPadrao)
                        patch.ticket = n.ticketPadrao;
                      if (state.cicloDias === 0 && n.cicloPadrao)
                        patch.cicloDias = n.cicloPadrao;
                    }
                    set(patch);
                  }}
                  className="w-full border-[1.5px] border-line rounded-lg px-3 py-2.5 text-[14px] text-ink bg-surface font-medium focus:outline-none focus:border-brand"
                >
                  <option value="">Selecione o nicho…</option>
                  {config.nichos.map((n) => (
                    <option key={n.id} value={n.nome}>
                      {n.nome}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="CPL médio (R$)"
                htmlFor="cpl"
                hint={
                  nicho ? (
                    <span
                      className="inline-block tabular text-[11px] rounded-md px-2 py-0.5"
                      style={{ background: "var(--accent-bg)", color: "var(--brand)" }}
                    >
                      benchmark do nicho ({nicho.base} de {nicho.total} clientes com dado) —
                      ajustável
                    </span>
                  ) : (
                    "Selecione o nicho para carregar o benchmark."
                  )
                }
              >
                <NumberInput
                  id="cpl"
                  value={state.cpl}
                  onValue={(cpl) => set({ cpl })}
                  prefix="R$"
                  step={0.01}
                />
              </Field>

              {amostraFraca && (
                <p className="text-[12px] text-neg bg-neg-bg rounded-md px-3 py-2 -mt-1 mb-4 leading-snug">
                  ⚠ Amostra pequena neste nicho ({nicho?.base}{" "}
                  {nicho?.base === 1 ? "cliente" : "clientes"} com dado). Use o benchmark
                  com ressalva verbal na call.
                </p>
              )}

              {isInvest ? (
                <Field label="Investimento mensal em mídia (R$)" htmlFor="investimento">
                  <NumberInput
                    id="investimento"
                    value={state.investimento}
                    onValue={(investimento) => set({ investimento })}
                    prefix="R$"
                    step={100}
                  />
                </Field>
              ) : (
                <Field
                  label="Meta de faturamento total desejada (R$)"
                  htmlFor="meta"
                  hint={
                    state.meta > 0 && state.duracao > 0
                      ? `Equivale a ${fmtBRL(metaMensal(state))}/mês ao longo de ${
                          state.duracao
                        } ${state.duracao === 1 ? "mês" : "meses"}.`
                      : "Quanto o cliente quer faturar a mais, no total, dentro do prazo informado ao lado."
                  }
                >
                  <NumberInput
                    id="meta"
                    value={state.meta}
                    onValue={(meta) => set({ meta })}
                    prefix="R$"
                    step={1000}
                  />
                </Field>
              )}
            </div>

            <div>
              <Field label="Ticket médio do cliente por venda (R$)" htmlFor="ticket">
                <NumberInput
                  id="ticket"
                  value={state.ticket}
                  onValue={(ticket) => set({ ticket })}
                  prefix="R$"
                  step={100}
                  invalid={!(state.ticket > 0) && state.ticket !== 0}
                />
              </Field>
              <Field
                label="Ciclo de venda do cliente (dias)"
                htmlFor="ciclo"
                hint="Usado no payback e na defasagem entre lead gerado e venda fechada."
              >
                <NumberInput
                  id="ciclo"
                  value={state.cicloDias}
                  onValue={(cicloDias) => set({ cicloDias: Math.max(0, cicloDias) })}
                  suffix="dias"
                  step={1}
                />
              </Field>
              <Field
                label={
                  isInvest
                    ? "Duração do contrato SEED (meses)"
                    : "Em quantos meses o cliente quer bater essa meta"
                }
                htmlFor="duracao"
                hint={
                  isInvest
                    ? "Padrão: 6 meses (projeto SEED padrão)."
                    : "Define o prazo da meta e também a duração do investimento simulado na bola de neve."
                }
              >
                <NumberInput
                  id="duracao"
                  value={state.duracao}
                  onValue={(d) => set({ duracao: Math.max(1, Math.round(d)) })}
                  blankWhenZero={false}
                  suffix="meses"
                  step={1}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Passo 3 — taxas + funil + resultado no mesmo quadro */}
        <Card
          step={3}
          title="Taxas de conversão e resultado projetado"
          sub="Ajuste as taxas à esquerda; o funil e o resultado à direita se atualizam ao vivo."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Esquerda: taxas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-ink-2">
                  Taxas do funil
                </span>
                <button
                  type="button"
                  onClick={sugerirTaxas}
                  className="text-[12.5px] font-semibold text-brand border border-line rounded-md px-3 py-1.5 hover:bg-surface-alt transition-colors"
                >
                  Usar sugestões de mercado
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {(
                  [
                    ["atendido", "Lead → Atendido"],
                    ["visita", "Atendido → Visita"],
                    ["proposta", "Visita → Proposta"],
                    ["venda", "Proposta → Venda"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="border border-line rounded-lg p-3.5 bg-surface-alt/50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <label
                        htmlFor={`rate-${key}`}
                        className="text-[12.5px] font-semibold text-ink-2"
                      >
                        {label}
                      </label>
                      <span className="tabular text-[11px] text-ink-3">
                        sugestão: {fmtNum(bounds[key].min * 100)}%–
                        {fmtNum(bounds[key].max * 100)}%
                      </span>
                    </div>
                    <NumberInput
                      id={`rate-${key}`}
                      value={Math.round(state.rates[key] * 1000) / 10}
                      onValue={(v) => setRate(key, v)}
                      suffix="%"
                      step={0.5}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] text-ink-3 leading-relaxed mt-4">
                Estas taxas ainda não têm histórico medido em CRM — vêm da percepção do
                time comercial da SEED. O valor digitado aqui é o cenário{" "}
                <strong>Realista</strong>; Pessimista e Otimista aplicam −20% e +20%
                apenas em <strong>Lead → Atendido</strong> e{" "}
                <strong>Atendido → Visita</strong> — as demais etapas seguem iguais ao
                Realista.
              </p>
            </div>

            {/* Direita: cenário + funil + resultado (ao vivo) */}
            <div className="lg:border-l lg:border-line lg:pl-8">
              <div className="grid grid-cols-3 gap-2 mb-5">
                {SCENARIOS.map((s) => {
                  const active = state.scenario === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set({ scenario: s })}
                      className="text-left border-[1.5px] rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors"
                      style={{
                        borderColor: active ? SC[s].color : "var(--line)",
                        background: active ? SC[s].bg : "var(--surface)",
                        color: active ? SC[s].color : "var(--ink-3)",
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle"
                        style={{ background: SC[s].color }}
                      />
                      {SC[s].label}
                    </button>
                  );
                })}
              </div>

              <Funnel stages={funnelStages} color={SC[state.scenario].color} />

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="col-span-2">
                  <ResultCard
                    label={
                      isInvest ? "Receita projetada / mês" : "Investimento necessário / mês"
                    }
                    value={fmtBRL(isInvest ? calc.receita : calc.investimento)}
                    primary
                  />
                </div>
                <ResultCard label="ROI" value={fmtMult(calc.roi)} />
                <ResultCard
                  label="Payback estimado"
                  value={payback !== null ? fmtMeses(payback) : "n/d"}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Passo 4 — tabela de sensibilidade */}
        <Card
          step={4}
          title="Tabela de sensibilidade"
          sub={
            isInvest
              ? "Mesmo investimento, ticket e ciclo — só as taxas de conversão mudam entre os cenários."
              : "Mesma meta, ticket e ciclo — no pior cenário, é preciso mais investimento pra bater a mesma meta."
          }
        >
          <SensitivityTable state={state} />
        </Card>

        {/* Comparador de investimento (só no modo investimento) */}
        {isInvest && state.investimento > 0 && (
          <Card
            title="Comparador de investimento"
            sub="Quanto muda o resultado ao investir mais — apoia a conversa de quanto investir na call."
          >
            <ComparadorInvestimento
              cpl={state.cpl}
              rates={rates}
              ticket={state.ticket}
              cicloM={cicloMeses(state.cicloDias)}
              base={state.investimento}
            />
          </Card>
        )}

        {/* Passo 5 — bola de neve */}
        <Card
          step={5}
          title="Efeito bola de neve — projeção do contrato"
          sub="Como o investimento se acumula, com que atraso as vendas amadurecem (ciclo de venda) e em que mês o retorno acumulado ultrapassa o investido — inclusive depois de o contrato terminar, porque leads gerados perto do fim ainda estão fechando."
        >
          <SnowballView
            rows={snowDisplay.rows}
            paybackMonth={snowDisplay.paybackMonth}
            lag={snowDisplay.lag}
            cicloDias={state.cicloDias}
            showPrestacao={prestacaoAplicada}
          />
          <p className="text-[11.5px] text-ink-3 leading-relaxed mt-4">
            Simplificação: o ciclo de venda informado em dias é convertido para meses (÷30)
            e arredondado para o mês inteiro mais próximo. Leads gerados no mês <em>t</em>{" "}
            fecham como venda no mês <em>t + ciclo</em>. O investimento só ocorre durante a
            duração do contrato; a receita de leads gerados perto do fim continua entrando
            depois disso.
          </p>

          {/* Prestação SEED */}
          <div className="mt-5 pt-5 border-t border-line">
            {prestacaoAplicada && (
              <>
                <PrestacaoCard
                  prestacao={prestacao}
                  cfg={config.prestacao}
                  descontoFee={descontoAtivo ? feeEfetiva : null}
                  campanhaNome={descontoAtivo ? campaignMatch!.campaign.nome : undefined}
                />

                {/* Popup chamativo de condição especial — abaixo do card da prestação */}
                {campaignMatch && !descontoAtivo && (
                  <div className="mt-4 rounded-[var(--radius)] border-2 border-pos bg-pos-bg p-5 flex flex-col sm:flex-row sm:items-center gap-4 no-print shadow-[0_6px_24px_rgba(15,138,95,0.18)]">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-pos/30 animate-ping" />
                      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-pos text-white text-[17px] font-bold">
                        %
                      </span>
                    </span>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-pos">
                        Condição especial disponível
                      </div>
                      <div className="text-[15px] font-semibold text-ink leading-snug">
                        Este cliente tem direito à campanha “{campaignMatch.campaign.nome}”.
                      </div>
                      <div className="text-[13px] text-ink-2 tabular mt-0.5">
                        {fmtBRL(prestacao.fee)} →{" "}
                        <strong className="text-pos">
                          {fmtBRL(campaignMatch.novaFee)}
                        </strong>{" "}
                        no pacote semestral.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={aplicarCondicaoEspecial}
                      className="shrink-0 text-[14px] font-semibold text-white bg-pos rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity"
                    >
                      Aplicar condição especial
                    </button>
                  </div>
                )}

                <PagamentosBlock fee={feeEfetiva} />
              </>
            )}
            <div
              className={
                prestacaoAplicada
                  ? "flex flex-wrap items-center justify-end gap-3 mt-4"
                  : "flex justify-center"
              }
            >
              {prestacaoAplicada && descontoAtivo && (
                <button
                  type="button"
                  onClick={() => setDescontoAplicado(false)}
                  className="text-[13px] font-semibold text-ink-2 border border-line rounded-lg px-4 py-2 hover:bg-surface-alt transition-colors"
                >
                  Remover desconto
                </button>
              )}
              {prestacaoAplicada && (
                <button
                  type="button"
                  onClick={aplicarPrestacao}
                  className="text-[13px] font-semibold text-ink-2 border border-line rounded-lg px-4 py-2 hover:bg-surface-alt transition-colors"
                >
                  Ocultar prestação
                </button>
              )}
              <button
                type="button"
                onClick={abrirProposta}
                disabled={gerandoProposta}
                className={
                  prestacaoAplicada
                    ? "text-[13px] font-semibold text-white bg-brand rounded-lg px-5 py-2 hover:bg-brand-2 transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
                    : "text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-3 hover:bg-brand-2 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                }
              >
                {gerandoProposta
                  ? "Gerando…"
                  : prestacaoAplicada
                    ? "Abrir proposta ↗"
                    : "Gerar proposta ↗"}
              </button>
            </div>
          </div>
        </Card>

        {/* Ações — fixadas ao final da calculadora */}
        <div className="mt-2 pt-5 border-t border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <span className="text-[12px] text-ink-3 flex items-center gap-1.5">
            {autoSaveStatus === "saving" ? (
              "Salvando no histórico…"
            ) : autoSaveStatus === "saved" ? (
              <>
                <span className="text-pos">✓</span> Salvo no histórico automaticamente
              </>
            ) : (
              "A simulação é salva no histórico ao preencher o ponto de partida."
            )}
          </span>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={reset}
              className="text-[14px] font-semibold text-brand border-[1.5px] border-brand rounded-lg px-5 py-2.5 hover:bg-surface-alt transition-colors"
            >
              Restaurar padrões
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={saving}
              className="text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-2.5 hover:bg-brand-2 transition-colors disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Baixar PDF para o cliente"}
            </button>
          </div>
        </div>
      </div>

      {/* Notas — painel lateral flutuante */}
      <NotasPanel
        value={observacoes}
        onChange={setObservacoes}
        aberta={notasAbertas}
        onAbertaChange={setNotasAbertas}
      />

      <PrintReport
        state={state}
        calc={calc}
        snow={snowDisplay}
        rates={rates}
        cliente={cliente}
        preparadoPor={preparadoPor}
        observacoes={observacoes}
        prestacao={prestacaoAplicada ? prestacao : null}
        feeEfetiva={feeEfetiva}
        campanhaNome={descontoAtivo ? campaignMatch!.campaign.nome : null}
      />
    </>
  );
}

/* ---------------- Result card ---------------- */
function ResultCard({
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
      className={`rounded-[10px] p-5 ${
        primary ? "bg-brand text-white" : "bg-surface-alt border border-line text-ink"
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

/* ---------------- Prestação SEED card ---------------- */
function faixaInfo(faixa: Prestacao["faixa"], cfg: PrestacaoConfig) {
  switch (faixa) {
    case "ideal":
      return {
        tag: "Faixa ideal",
        desc: `${fmtPct(cfg.pctIdeal)} do saldo acumulado no mês ${cfg.mesesBase}.`,
      };
    case "minimo":
      return {
        tag: "Mínimo viável",
        desc: `Abaixo da faixa — aplicado o piso de ${fmtBRL(cfg.piso)} (${fmtBRL(
          cfg.piso / cfg.mesesBase,
        )}/mês).`,
      };
    case "reduzido":
      return {
        tag: "Conta grande",
        desc: `Acima de ${fmtBRL(cfg.tetoRef)} — aplicado ${fmtPct(
          cfg.pctReduzido,
        )} sobre a base inteira.`,
      };
  }
}

function PrestacaoCard({
  prestacao,
  cfg,
  descontoFee = null,
  campanhaNome,
}: {
  prestacao: Prestacao;
  cfg: PrestacaoConfig;
  descontoFee?: number | null;
  campanhaNome?: string;
}) {
  const info = faixaInfo(prestacao.faixa, cfg);
  const temDesconto = descontoFee !== null;
  const feeFinal = temDesconto ? descontoFee! : prestacao.fee;
  const mrrFinal = feeFinal / cfg.mesesBase;
  return (
    <div className="rounded-[var(--radius)] bg-brand text-white p-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
            Prestação SEED sugerida
          </div>
          {temDesconto && (
            <div className="tabular text-[16px] text-white/45 line-through leading-none mt-1">
              {fmtBRL(prestacao.fee)}
            </div>
          )}
          <div className="tabular text-[34px] font-bold leading-tight mt-1">
            {fmtBRL(feeFinal)}
            <span className="text-[15px] font-medium text-white/60 ml-2">
              em {cfg.mesesBase} meses
            </span>
          </div>
          <div className="tabular text-[15px] text-white/80 mt-0.5">
            ≈ {fmtBRL(mrrFinal)}/mês
          </div>
        </div>
        <span
          className="text-[11.5px] font-semibold rounded-full px-3 py-1"
          style={{
            background: temDesconto ? "var(--pos)" : "rgba(255,255,255,0.14)",
          }}
        >
          {temDesconto ? `Condição especial · ${campanhaNome}` : info.tag}
          {!temDesconto && prestacao.pctEfetivo !== null && (
            <span className="text-white/70 font-medium ml-1.5">
              {fmtPct(prestacao.pctEfetivo)}
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 mt-5 pt-4 border-t border-white/15 text-[12.5px]">
        <div>
          <div className="text-white/55">Saldo acumulado (mês {cfg.mesesBase})</div>
          <div className="tabular text-white/95 font-semibold">{fmtBRL(prestacao.base)}</div>
        </div>
        <div>
          <div className="text-white/55">% efetivo sobre a base</div>
          <div className="tabular text-white/95 font-semibold">
            {prestacao.pctEfetivo !== null ? fmtPct(prestacao.pctEfetivo) : "—"}
          </div>
        </div>
        <div>
          <div className="text-white/55">Regra aplicada</div>
          <div className="text-white/95 font-semibold leading-snug">{info.desc}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Comparador de investimento ---------------- */
function ComparadorInvestimento({
  cpl,
  rates,
  ticket,
  cicloM,
  base,
}: {
  cpl: number;
  rates: CalcState["rates"];
  ticket: number;
  cicloM: number;
  base: number;
}) {
  const brutos = [base, base * 1.5, base * 2].map((v) => Math.round(v / 500) * 500);
  const niveis = brutos.filter((v, i) => v > 0 && brutos.indexOf(v) === i);
  if (niveis.length === 0) return null;

  // ROI e payback são constantes no modelo linear — mostrados uma vez na nota.
  const baseCalc = calcForward(niveis[0], cpl, rates, ticket);
  const basePb = calcPayback(niveis[0], baseCalc.receita, cicloM);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {niveis.map((inv, i) => {
          const c = calcForward(inv, cpl, rates, ticket);
          const atual = i === 0;
          return (
            <div
              key={inv}
              className={`rounded-[var(--radius)] p-4 border ${
                atual ? "border-brand bg-surface-alt/60" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  {atual ? "Investimento atual" : `Cenário ${i + 1}`}
                </span>
              </div>
              <div className="tabular text-[20px] font-bold text-ink leading-none">
                {fmtBRL(inv)}
                <span className="text-[12px] font-medium text-ink-3">/mês</span>
              </div>
              <dl className="mt-3 space-y-1.5 text-[12.5px]">
                <Row label="Vendas / mês" value={fmtNum(c.vendas, 1)} />
                <Row label="Receita / mês" value={fmtBRL(c.receita)} strong />
              </dl>
            </div>
          );
        })}
      </div>
      <p className="text-[12px] text-ink-3 mt-3 leading-relaxed">
        O retorno é <strong className="text-ink-2">proporcional ao investimento</strong>:
        ROI de <strong className="text-ink-2">{fmtMult(baseCalc.roi)}</strong> e payback de{" "}
        <strong className="text-ink-2">
          {basePb !== null ? fmtMeses(basePb) : "n/d"}
        </strong>{" "}
        em todos os níveis — o que cresce é o volume de vendas e a receita.
      </p>
    </>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-3">{label}</dt>
      <dd className={`tabular ${strong ? "font-semibold text-ink" : "text-ink-2"}`}>
        {value}
      </dd>
    </div>
  );
}

/* ---------------- Formas de pagamento (colapsável) ---------------- */
function PagamentosBlock({ fee }: { fee: number }) {
  const [aberto, setAberto] = useState(false);
  const opts = calcPagamentos(fee);
  return (
    <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface-alt/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-alt/60 transition-colors"
      >
        <span className="text-[13px] font-semibold text-ink">
          Formas de pagamento — pacote semestral
        </span>
        <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-3">
          {aberto ? "ocultar" : "ver condições"}
          <span className="text-[15px] leading-none">{aberto ? "▾" : "▸"}</span>
        </span>
      </button>
      {aberto && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pb-5">
        {opts.map(({ opcao, total, porMes }) => (
          <div key={opcao.id} className="bg-surface border border-line rounded-lg p-4">
            <div className="text-[12.5px] font-semibold text-ink leading-snug min-h-[34px]">
              {opcao.label}
            </div>
            <div className="mt-1">
              {opcao.desconto > 0 ? (
                <span className="text-[11px] font-semibold text-pos bg-pos-bg rounded-full px-2 py-0.5">
                  {fmtPct(opcao.desconto)} de desconto
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
      )}
    </div>
  );
}

/* ---------------- Sensitivity table ---------------- */
function SensitivityTable({ state }: { state: CalcState }) {
  const isInvest = state.mode === "investimento";
  const calcs: Record<Scenario, CalcResult> = {
    pessimista: sc(state, "pessimista"),
    realista: sc(state, "realista"),
    otimista: sc(state, "otimista"),
  };
  const ciclo = cicloMeses(state.cicloDias);
  const pb: Record<Scenario, number | null> = {
    pessimista: calcPayback(calcs.pessimista.investimento, calcs.pessimista.receita, ciclo),
    realista: calcPayback(calcs.realista.investimento, calcs.realista.receita, ciclo),
    otimista: calcPayback(calcs.otimista.investimento, calcs.otimista.receita, ciclo),
  };
  const moneyKey: keyof CalcResult = isInvest ? "receita" : "investimento";

  const rateRows: [string, (s: Scenario) => number][] = [
    ["Lead → Atendido", (s) => getActiveRates(s, state.rates).atendido],
    ["Atendido → Visita", (s) => getActiveRates(s, state.rates).visita],
    ["Visita → Proposta", (s) => getActiveRates(s, state.rates).proposta],
    ["Proposta → Venda", (s) => getActiveRates(s, state.rates).venda],
  ];

  const colBg = (s: Scenario) => ({ background: SC[s].bg });
  const th = "py-2.5 px-3 text-right font-bold text-[12px] uppercase tracking-wide";
  const td = "py-2.5 px-3 text-right tabular";
  const lbl = "py-2.5 px-3 text-left font-semibold text-ink";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13.5px] border-collapse">
        <thead>
          <tr className="text-ink-2">
            <th className="py-2.5 px-3 text-left font-bold text-[12px] uppercase tracking-wide border-b-2 border-line">
              Métrica
            </th>
            {SCENARIOS.map((s) => (
              <th
                key={s}
                className={`${th} border-b-2 border-line`}
                style={{ ...colBg(s), color: SC[s].color }}
              >
                {SC[s].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rateRows.map(([label, getter]) => (
            <tr key={label} className="border-b border-line">
              <td className={lbl}>{label}</td>
              {SCENARIOS.map((s) => (
                <td key={s} className={td} style={colBg(s)}>
                  {fmtPct(getter(s))}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-b border-line">
            <td className={lbl}>{isInvest ? "Leads gerados" : "Leads necessários"}</td>
            {SCENARIOS.map((s) => (
              <td key={s} className={td} style={colBg(s)}>
                {fmtNum(calcs[s].leads, 1)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-line">
            <td className={lbl}>{isInvest ? "Vendas" : "Vendas necessárias"}</td>
            {SCENARIOS.map((s) => (
              <td key={s} className={td} style={colBg(s)}>
                {fmtNum(calcs[s].vendas, 1)}
              </td>
            ))}
          </tr>
          <tr className="border-y-2 border-line font-bold">
            <td className={lbl}>
              {isInvest ? "Receita projetada / mês" : "Investimento necessário / mês"}
            </td>
            {SCENARIOS.map((s) => (
              <td key={s} className={`${td} font-bold`} style={colBg(s)}>
                {fmtBRL(calcs[s][moneyKey])}
              </td>
            ))}
          </tr>
          <tr className="border-b border-line">
            <td className={lbl}>ROI</td>
            {SCENARIOS.map((s) => (
              <td key={s} className={td} style={colBg(s)}>
                {fmtMult(calcs[s].roi)}
              </td>
            ))}
          </tr>
          <tr>
            <td className={lbl}>Payback</td>
            {SCENARIOS.map((s) => (
              <td key={s} className={td} style={colBg(s)}>
                {pb[s] !== null ? fmtMeses(pb[s]) : "n/d"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function sc(state: CalcState, scenario: Scenario): CalcResult {
  const rates = getActiveRates(scenario, state.rates);
  if (state.mode === "investimento") {
    return calcForward(state.investimento, state.cpl, rates, state.ticket);
  }
  return calcReverse(metaMensal(state), state.cpl, rates, state.ticket);
}
