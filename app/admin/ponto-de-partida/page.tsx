import { getCases, getConfig } from "@/lib/store";
import { cplRealPorNicho } from "@/lib/cases";
import ConfigEditor from "../../components/ConfigEditor";

export const dynamic = "force-dynamic";

export default async function PontoDePartidaPage() {
  const [config, cases] = await Promise.all([getConfig(), getCases()]);
  const cplReal = cplRealPorNicho(cases);
  return (
    <div className="px-8 py-7 max-w-[900px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Ponto de partida</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Banco de dados da calculadora — nichos e CPL, faixas de conversão e a regra da
          prestação. O que você salvar aqui vale imediatamente para todos os vendedores.
        </p>
      </div>
      <ConfigEditor initial={config} cplReal={cplReal} />
    </div>
  );
}
