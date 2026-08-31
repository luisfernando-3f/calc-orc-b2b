import { getCampaigns, getSimulations } from "@/lib/store";
import { countSenhaPadrao, listVendedores } from "@/lib/auth/users-store";
import { computeDash, computePorVendedor } from "@/lib/dashboard";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import DashboardView from "../components/DashboardView";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [sims, campaigns, vendedores, senhasPadrao] = await Promise.all([
    getSimulations(),
    getCampaigns(),
    listVendedores(),
    countSenhaPadrao(),
  ]);
  const d = computeDash(sims);
  const porVendedor = computePorVendedor(sims);
  const campanhasAtivas = campaigns.filter((c) => c.ativa).length;

  const avisos: string[] = [];
  if (senhasPadrao > 0) {
    avisos.push(
      `${senhasPadrao} acesso(s) ainda usam a senha inicial "1234" — troque em Vendedores.`,
    );
  }
  if (!process.env.AUTH_SECRET) {
    avisos.push(
      "AUTH_SECRET não definido — em produção, defina um segredo forte no .env (ver DEPLOY.md).",
    );
  }

  return (
    <DashboardView
      titulo="Painel"
      subtitulo="Visão geral da operação comercial — todos os vendedores."
      vazio={sims.length === 0}
      avisos={avisos}
      kpis={[
        { label: "Propostas geradas", value: fmtNum(d.comProposta) },
        { label: "Valor proposto", value: fmtBRL(d.valorPropostoTotal), primary: true },
        { label: "Ganhos", value: fmtNum(d.ganhos) },
        { label: "Valor ganho", value: fmtBRL(d.valorGanho) },
        { label: "Conversão", value: fmtPct(d.taxaConversao) },
        { label: "Ticket médio", value: fmtBRL(d.ticketMedio) },
        { label: "Vendedores", value: fmtNum(vendedores.length) },
        { label: "Campanhas ativas", value: fmtNum(campanhasAtivas) },
      ]}
      porNicho={d.porNicho}
      porVendedor={porVendedor}
    />
  );
}
