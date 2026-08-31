import { getSession } from "@/lib/auth/server";
import { getSimulationsFor } from "@/lib/store";
import { computeDash } from "@/lib/dashboard";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import DashboardView from "../../components/DashboardView";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const session = await getSession();
  const records = session ? await getSimulationsFor(session.email) : [];
  const d = computeDash(records);

  return (
    <DashboardView
      titulo="Meu painel"
      subtitulo={`Resumo das suas simulações${session?.nome ? `, ${session.nome}` : ""}.`}
      vazio={records.length === 0}
      kpis={[
        { label: "Propostas geradas", value: fmtNum(d.comProposta) },
        { label: "Valor proposto", value: fmtBRL(d.valorPropostoTotal), primary: true },
        { label: "Ganhos", value: fmtNum(d.ganhos) },
        { label: "Valor ganho", value: fmtBRL(d.valorGanho) },
        { label: "Conversão", value: fmtPct(d.taxaConversao) },
        { label: "Ticket médio", value: fmtBRL(d.ticketMedio) },
      ]}
      porNicho={d.porNicho}
    />
  );
}
