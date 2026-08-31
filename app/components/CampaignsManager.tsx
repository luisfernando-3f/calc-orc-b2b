"use client";

import { useState } from "react";
import { fmtBRL, fmtPct } from "@/lib/format";
import type {
  Campaign,
  CampaignCriterioTipo,
  CampaignDescontoTipo,
} from "@/lib/types";

type Vendedor = { email: string; nome: string };

const CRITERIO_LABEL: Record<CampaignCriterioTipo, string> = {
  minimo: "Prestação no mínimo viável",
  todos: "Qualquer cliente do vendedor",
  nicho: "Nicho específico",
  faixa: "Faixa de valor da prestação",
};
const DESCONTO_LABEL: Record<CampaignDescontoTipo, string> = {
  piso: "Novo mínimo viável (piso)",
  percentual: "% sobre a prestação",
  fixo: "Valor fixo",
};

function blank(): Campaign {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Math.round(performance.now())),
    nome: "",
    ativa: true,
    alvoTodos: false,
    vendedores: [],
    criterioTipo: "minimo",
    descontoTipo: "piso",
    descontoValor: 0,
    createdAt: new Date().toISOString(),
  };
}

function descontoResumo(c: Campaign): string {
  if (c.descontoTipo === "percentual") return fmtPct(c.descontoValor) + " off";
  return fmtBRL(c.descontoValor);
}

export default function CampaignsManager({
  initial,
  vendedores,
  nichos,
}: {
  initial: Campaign[];
  vendedores: Vendedor[];
  nichos: string[];
}) {
  const [list, setList] = useState<Campaign[]>(initial);
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  const persist = async (next: Campaign[]) => {
    setList(next);
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setStatus("saved");
        setMsg("Alterações salvas.");
      } else {
        setStatus("error");
        setMsg("Erro ao salvar.");
      }
    } catch {
      setStatus("error");
      setMsg("Falha de conexão.");
    }
  };

  const toggleAtiva = (id: string) =>
    persist(list.map((c) => (c.id === id ? { ...c, ativa: !c.ativa } : c)));
  const remover = (id: string) => persist(list.filter((c) => c.id !== id));

  const salvarDraft = () => {
    if (!draft) return;
    if (!draft.nome.trim()) {
      alert("Dê um nome à campanha.");
      return;
    }
    if (!draft.alvoTodos && draft.vendedores.length === 0) {
      alert("Selecione ao menos um vendedor (ou marque “todos”).");
      return;
    }
    if (!(draft.descontoValor > 0)) {
      alert("Informe o valor do desconto.");
      return;
    }
    const exists = list.some((c) => c.id === draft.id);
    const next = exists
      ? list.map((c) => (c.id === draft.id ? draft : c))
      : [...list, draft];
    persist(next);
    setDraft(null);
  };

  const upd = (patch: Partial<Campaign>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const inputCls =
    "w-full border-[1.5px] border-line rounded-md px-2.5 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-brand";
  const cardCls =
    "bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-6 mb-5";

  return (
    <div>
      {/* Lista */}
      <section className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-ink">Campanhas</h2>
          {!draft && (
            <button
              type="button"
              onClick={() => setDraft(blank())}
              className="text-[13px] font-semibold text-white bg-brand rounded-md px-3.5 py-2 hover:bg-brand-2 transition-colors"
            >
              + Nova campanha
            </button>
          )}
        </div>

        {list.length === 0 && !draft ? (
          <p className="text-[13.5px] text-ink-3 py-6 text-center">
            Nenhuma campanha cadastrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-ink-3 text-[11.5px] uppercase tracking-wide text-left">
                  <th className="py-2 pr-3 font-bold">Campanha</th>
                  <th className="py-2 px-3 font-bold">Alvo</th>
                  <th className="py-2 px-3 font-bold">Encaixe</th>
                  <th className="py-2 px-3 font-bold">Desconto</th>
                  <th className="py-2 px-3 font-bold">Ativa</th>
                  <th className="py-2 pl-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{c.nome}</td>
                    <td className="py-2.5 px-3 text-ink-2">
                      {c.alvoTodos
                        ? "Todos"
                        : `${c.vendedores.length} vendedor(es)`}
                    </td>
                    <td className="py-2.5 px-3 text-ink-2">
                      {CRITERIO_LABEL[c.criterioTipo]}
                      {c.criterioTipo === "nicho" && c.criterioNicho
                        ? ` (${c.criterioNicho})`
                        : ""}
                    </td>
                    <td className="py-2.5 px-3 text-ink-2 tabular">
                      {descontoResumo(c)}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggleAtiva(c.id)}
                        className={`text-[11.5px] font-semibold rounded-full px-2.5 py-1 ${
                          c.ativa
                            ? "bg-pos-bg text-pos"
                            : "bg-surface-alt text-ink-3"
                        }`}
                      >
                        {c.ativa ? "Ativa" : "Inativa"}
                      </button>
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDraft({ ...c })}
                        className="text-[12.5px] font-semibold text-brand hover:underline mr-3"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(c.id)}
                        className="text-[12.5px] font-semibold text-neg hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {msg && (
          <p
            className={`text-[12.5px] mt-3 ${
              status === "error" ? "text-neg" : "text-pos"
            }`}
          >
            {msg}
          </p>
        )}
      </section>

      {/* Formulário */}
      {draft && (
        <section className={cardCls}>
          <h2 className="text-[16px] font-semibold text-ink mb-4">
            {list.some((c) => c.id === draft.id) ? "Editar campanha" : "Nova campanha"}
          </h2>

          {/* Nome + ativa */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end mb-5">
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                Nome da campanha
              </span>
              <input
                type="text"
                value={draft.nome}
                onChange={(e) => upd({ nome: e.target.value })}
                placeholder="Ex.: Condição de virada de mês"
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2 pb-2">
              <input
                type="checkbox"
                checked={draft.ativa}
                onChange={(e) => upd({ ativa: e.target.checked })}
              />
              Ativa
            </label>
          </div>

          {/* Alvo */}
          <FieldGroup title="Liberar para">
            <Radio
              checked={draft.alvoTodos}
              onChange={() => upd({ alvoTodos: true })}
              label="Todos os vendedores"
            />
            <Radio
              checked={!draft.alvoTodos}
              onChange={() => upd({ alvoTodos: false })}
              label="Selecionar vendedores"
            />
            {!draft.alvoTodos && (
              <div className="ml-6 mt-1 flex flex-col gap-1.5">
                {vendedores.map((v) => (
                  <label
                    key={v.email}
                    className="flex items-center gap-2 text-[13px] text-ink-2"
                  >
                    <input
                      type="checkbox"
                      checked={draft.vendedores.includes(v.email)}
                      onChange={(e) =>
                        upd({
                          vendedores: e.target.checked
                            ? [...draft.vendedores, v.email]
                            : draft.vendedores.filter((x) => x !== v.email),
                        })
                      }
                    />
                    {v.nome}{" "}
                    <span className="text-ink-3 text-[12px]">({v.email})</span>
                  </label>
                ))}
                {vendedores.length === 0 && (
                  <span className="text-[12.5px] text-ink-3">
                    Nenhum vendedor cadastrado.
                  </span>
                )}
              </div>
            )}
          </FieldGroup>

          {/* Critério de encaixe */}
          <FieldGroup title="Quem se encaixa">
            {(
              [
                ["minimo", CRITERIO_LABEL.minimo],
                ["todos", CRITERIO_LABEL.todos],
                ["nicho", CRITERIO_LABEL.nicho],
                ["faixa", CRITERIO_LABEL.faixa],
              ] as [CampaignCriterioTipo, string][]
            ).map(([tipo, label]) => (
              <Radio
                key={tipo}
                checked={draft.criterioTipo === tipo}
                onChange={() => upd({ criterioTipo: tipo })}
                label={label}
              />
            ))}
            {draft.criterioTipo === "nicho" && (
              <div className="ml-6 mt-1">
                <select
                  value={draft.criterioNicho ?? ""}
                  onChange={(e) => upd({ criterioNicho: e.target.value })}
                  className={inputCls + " max-w-[280px]"}
                >
                  <option value="">Selecione o nicho…</option>
                  {nichos.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {draft.criterioTipo === "faixa" && (
              <div className="ml-6 mt-1 flex items-center gap-3">
                <label className="text-[12.5px] text-ink-2">
                  De{" "}
                  <input
                    type="number"
                    value={draft.criterioMin ?? 0}
                    onChange={(e) => upd({ criterioMin: Number(e.target.value) || 0 })}
                    className={inputCls + " w-[120px] inline-block ml-1"}
                  />
                </label>
                <label className="text-[12.5px] text-ink-2">
                  até{" "}
                  <input
                    type="number"
                    value={draft.criterioMax ?? 0}
                    onChange={(e) => upd({ criterioMax: Number(e.target.value) || 0 })}
                    className={inputCls + " w-[120px] inline-block ml-1"}
                  />
                </label>
                <span className="text-[12px] text-ink-3">(valor da prestação, R$)</span>
              </div>
            )}
          </FieldGroup>

          {/* Desconto */}
          <FieldGroup title="Desconto">
            {(
              [
                ["piso", DESCONTO_LABEL.piso],
                ["percentual", DESCONTO_LABEL.percentual],
                ["fixo", DESCONTO_LABEL.fixo],
              ] as [CampaignDescontoTipo, string][]
            ).map(([tipo, label]) => (
              <Radio
                key={tipo}
                checked={draft.descontoTipo === tipo}
                onChange={() => upd({ descontoTipo: tipo, descontoValor: 0 })}
                label={label}
              />
            ))}
            <div className="ml-6 mt-1">
              {draft.descontoTipo === "percentual" ? (
                <div className="relative w-[140px]">
                  <input
                    type="number"
                    step={1}
                    value={Math.round(draft.descontoValor * 1000) / 10}
                    onChange={(e) =>
                      upd({ descontoValor: (Number(e.target.value) || 0) / 100 })
                    }
                    className={inputCls + " pr-7"}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[12px]">
                    %
                  </span>
                </div>
              ) : (
                <div className="relative w-[160px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 text-[12px]">
                    R$
                  </span>
                  <input
                    type="number"
                    step={1000}
                    value={draft.descontoValor}
                    onChange={(e) => upd({ descontoValor: Number(e.target.value) || 0 })}
                    className={inputCls + " pl-7"}
                  />
                </div>
              )}
              <p className="text-[11.5px] text-ink-3 mt-1.5">
                {draft.descontoTipo === "piso"
                  ? "A prestação promocional usa este piso (só afeta clientes que batem o mínimo viável)."
                  : draft.descontoTipo === "percentual"
                    ? "Percentual descontado da prestação sugerida."
                    : "Valor fixo da prestação para quem se encaixa."}
              </p>
            </div>
          </FieldGroup>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[14px] font-semibold text-brand border-[1.5px] border-brand rounded-lg px-5 py-2.5 hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarDraft}
              disabled={status === "saving"}
              className="text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-2.5 hover:bg-brand-2 transition-colors disabled:opacity-60"
            >
              {status === "saving" ? "Salvando…" : "Salvar campanha"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[12.5px] font-semibold text-ink-2 mb-2">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer">
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
