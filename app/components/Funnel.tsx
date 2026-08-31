"use client";

import { fmtNum } from "@/lib/format";

export interface FunnelStage {
  label: string;
  value: number;
}

/**
 * "Meio funil": bloco centralizado, cada barra alinhada à esquerda e afinando
 * para a direita conforme o valor cai (CONTEXT.md §11). Tingido pela cor do
 * cenário ativo.
 */
export default function Funnel({
  stages,
  color,
}: {
  stages: FunnelStage[];
  color: string; // css var, ex.: "var(--sc-real)"
}) {
  const max = stages[0]?.value || 1;
  return (
    <div className="max-w-[560px] mx-auto flex flex-col gap-2.5">
      {stages.map((s, i) => {
        const pct = Math.max(12, Math.round((s.value / max) * 100));
        const isLast = i === stages.length - 1;
        return (
          <div key={s.label}>
            <div className="flex justify-between items-baseline text-[12.5px] font-semibold text-ink-2 mb-1">
              <span>{s.label}</span>
              <span className="tabular text-ink">{fmtNum(s.value, 1)}</span>
            </div>
            <div className="bg-surface-alt rounded-r-lg h-9 overflow-hidden">
              <div
                className="h-full rounded-r-lg min-w-[64px] flex items-center pl-3.5 text-white tabular font-semibold text-[13px] transition-[width] duration-300 ease-out"
                style={{
                  width: `${pct}%`,
                  background: isLast
                    ? color
                    : `color-mix(in srgb, ${color} ${58 + i * 8}%, white)`,
                }}
              >
                {fmtNum(s.value, 1)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
