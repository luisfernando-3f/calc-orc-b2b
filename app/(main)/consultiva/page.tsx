import { getConfig } from "@/lib/store";
import { fmtBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConsultivaPage() {
  const { nichos } = await getConfig();

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-2 mb-2">
          Referência de mercado
        </div>
        <h1 className="text-[30px] font-bold text-ink leading-tight">
          Tabela Consultiva
        </h1>
        <p className="text-[13.5px] text-ink-3 mt-2">
          CPL médio e leads por venda por nicho — referência para orientar a call.
        </p>
      </div>

      {/* Tabela */}
      <div className="rounded-[var(--radius)] overflow-hidden border border-line shadow-[var(--shadow)]">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="bg-brand text-white text-left">
              <th className="py-3.5 px-5 font-semibold text-[12px] uppercase tracking-wide">
                Nicho
              </th>
              <th className="py-3.5 px-5 font-semibold text-[12px] uppercase tracking-wide">
                CPL médio
              </th>
              <th className="py-3.5 px-5 font-semibold text-[12px] uppercase tracking-wide">
                Leads por venda
              </th>
            </tr>
          </thead>
          <tbody>
            {nichos.map((n, i) => (
              <tr
                key={n.id}
                className={`border-t border-line ${
                  i % 2 === 1 ? "bg-surface-alt/50" : "bg-surface"
                }`}
              >
                <td className="py-3.5 px-5 font-semibold text-ink">{n.nome || "—"}</td>
                <td className="py-3.5 px-5 tabular text-ink-2">
                  {n.cpl > 0 ? fmtBRL(n.cpl, true) : "—"}
                </td>
                <td className="py-3.5 px-5 tabular text-ink-2">
                  {n.leadsPorVenda?.trim() ? n.leadsPorVenda : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11.5px] text-ink-3 mt-4 text-center leading-relaxed">
        Valores de referência da carteira SEED, mantidos pelo administrador. Não são
        garantia de resultado — servem para orientar a conversa com o cliente.
      </p>
    </div>
  );
}
