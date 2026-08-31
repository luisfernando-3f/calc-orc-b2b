import { getSession } from "@/lib/auth/server";
import { getSimulationsFor } from "@/lib/store";
import HistoricoTable from "../../components/HistoricoTable";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const session = await getSession();
  const records = session ? await getSimulationsFor(session.email) : [];

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-8">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink">Meu histórico</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Salvas automaticamente assim que o ponto de partida é preenchido (rascunho) e
          marcadas como exportadas ao gerar o PDF. Clique em “Reabrir” para continuar.
        </p>
      </div>
      <HistoricoTable records={records} showSeller={false} />
    </div>
  );
}
