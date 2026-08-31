import Link from "next/link";
import { fmtBRL, fmtMeses, fmtMult } from "@/lib/format";
import type { SimulationRecord } from "@/lib/types";
import StatusSelect from "./StatusSelect";

const MODE_LABEL = { investimento: "Investimento", meta: "Meta" } as const;
const SC_LABEL = {
  pessimista: "Pessimista",
  realista: "Realista",
  otimista: "Otimista",
} as const;

export default function HistoricoTable({
  records,
  showSeller,
}: {
  records: SimulationRecord[];
  showSeller: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-[var(--radius)] p-10 text-center text-ink-3 text-[14px]">
        Nenhuma simulação no histórico ainda. Elas aparecem aqui quando um PDF é gerado.
      </div>
    );
  }

  const th =
    "py-2.5 px-3 text-left font-bold text-[11.5px] uppercase tracking-wide text-ink-3 border-b-2 border-line whitespace-nowrap";
  const td = "py-2.5 px-3 text-left align-middle border-b border-line";

  return (
    <div className="bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr>
            <th className={th}>Data</th>
            {showSeller && <th className={th}>Vendedor</th>}
            <th className={th}>Cliente</th>
            <th className={th}>Status</th>
            <th className={th}>Nicho</th>
            <th className={th}>Modo</th>
            <th className={th}>Cenário</th>
            <th className={`${th} text-right`}>Valor / mês</th>
            <th className={`${th} text-right`}>ROI</th>
            <th className={`${th} text-right`}>Payback</th>
            <th className={`${th} text-right`}>Prestação</th>
            <th className={th}>Situação</th>
            <th className={`${th} text-right`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-surface-alt/50">
              <td className={`${td} tabular whitespace-nowrap`}>
                {new Date(r.createdAt).toLocaleDateString("pt-BR")}
              </td>
              {showSeller && <td className={td}>{r.sellerNome}</td>}
              <td className={`${td} font-medium text-ink`}>{r.cliente || "—"}</td>
              <td className={td}>
                <span
                  className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                    r.exportado !== false
                      ? "bg-pos-bg text-pos"
                      : "bg-surface-alt text-ink-3"
                  }`}
                >
                  {r.exportado !== false ? "Exportado" : "Rascunho"}
                </span>
              </td>
              <td className={td}>{r.summary.nicho || "—"}</td>
              <td className={td}>{MODE_LABEL[r.summary.mode]}</td>
              <td className={td}>{SC_LABEL[r.summary.scenario]}</td>
              <td className={`${td} tabular text-right`}>
                {fmtBRL(r.summary.valorPrincipal)}
              </td>
              <td className={`${td} tabular text-right`}>{fmtMult(r.summary.roi)}</td>
              <td className={`${td} tabular text-right`}>
                {r.summary.payback !== null ? fmtMeses(r.summary.payback) : "n/d"}
              </td>
              <td className={`${td} tabular text-right`}>
                {r.summary.prestacaoFee !== null ? fmtBRL(r.summary.prestacaoFee) : "—"}
              </td>
              <td className={td}>
                <StatusSelect id={r.id} status={r.status ?? "aberta"} />
              </td>
              <td className={`${td} text-right whitespace-nowrap`}>
                <Link
                  href={`/?sim=${r.id}`}
                  className="text-[12.5px] font-semibold text-brand hover:underline"
                >
                  Reabrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
