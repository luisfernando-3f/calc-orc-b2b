"use client";

/**
 * Painel de Notas flutuante — fixo na lateral direita, acompanha o scroll, para
 * o vendedor anotar a qualquer momento durante a call. Colapsável (estado
 * controlado pela Calculadora, que recua o conteúdo quando aberto). O conteúdo
 * vai para o PDF (seção de observações). Não aparece na impressão.
 */
export default function NotasPanel({
  value,
  onChange,
  aberta,
  onAbertaChange,
}: {
  value: string;
  onChange: (v: string) => void;
  aberta: boolean;
  onAbertaChange: (v: boolean) => void;
}) {
  if (!aberta) {
    return (
      <button
        type="button"
        onClick={() => onAbertaChange(true)}
        title="Abrir notas"
        aria-label="Abrir notas"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-brand text-white rounded-l-lg px-2.5 py-4 shadow-[0_8px_30px_rgba(28,31,36,0.18)] hover:bg-brand-2 transition-colors no-print"
      >
        <span className="text-[13px] font-semibold" style={{ writingMode: "vertical-rl" }}>
          Notas
        </span>
        {value.trim() && (
          <span className="h-1.5 w-1.5 rounded-full bg-pos absolute top-2 right-2" />
        )}
      </button>
    );
  }

  return (
    <aside className="fixed right-5 top-6 bottom-6 z-40 w-[300px] max-w-[calc(100vw-32px)] flex flex-col bg-surface border border-line rounded-[var(--radius)] shadow-[0_8px_30px_rgba(28,31,36,0.14)] no-print">
      <div className="flex items-center justify-between px-4 h-11 border-b border-line shrink-0">
        <span className="text-[13px] font-semibold text-ink flex items-center gap-2">
          <span className="text-ink-3 text-[14px]">✎</span> Notas
        </span>
        <button
          type="button"
          onClick={() => onAbertaChange(false)}
          title="Minimizar"
          aria-label="Minimizar notas"
          className="text-ink-3 hover:text-ink text-[18px] leading-none px-1"
        >
          ›
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Anote aqui qualquer informação da call — a qualquer momento…"
        className="flex-1 w-full resize-none px-4 py-3 text-[13.5px] text-ink bg-surface focus:outline-none rounded-b-[var(--radius)] leading-relaxed"
      />
    </aside>
  );
}
