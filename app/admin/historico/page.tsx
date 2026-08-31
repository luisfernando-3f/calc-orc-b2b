import { getSimulations } from "@/lib/store";
import HistoricoTable from "../../components/HistoricoTable";

export const dynamic = "force-dynamic";

export default async function AdminHistoricoPage() {
  const records = await getSimulations();

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Histórico geral</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Todas as simulações de todos os vendedores — rascunhos (salvos ao preencher o
          ponto de partida) e exportadas. Clique em “Reabrir” para inspecionar.
        </p>
      </div>
      <HistoricoTable records={records} showSeller />
    </div>
  );
}
