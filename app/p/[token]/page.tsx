import { notFound } from "next/navigation";
import { getConfig, getSimulationByToken } from "@/lib/store";
import { computePropostaData } from "@/lib/proposta";
import PropostaView from "../../components/PropostaView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SEED — Proposta comercial",
};

// Proposta pública — aberta pelo cliente pelo link, sem login.
export default async function PropostaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await getSimulationByToken(token);
  if (!record) notFound();

  // Link expirado → mensagem amigável (não expõe a proposta).
  if (
    record.shareExpiresAt &&
    new Date(record.shareExpiresAt).getTime() < Date.now()
  ) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-[15px] font-semibold text-ink">Proposta expirada</div>
          <p className="text-[13px] text-ink-3 mt-1.5 max-w-[360px]">
            Este link não está mais disponível. Peça ao seu contato da SEED um link
            atualizado.
          </p>
        </div>
      </div>
    );
  }

  const config = await getConfig();
  const data = computePropostaData(record, config);

  // viewToken registra a abertura; sem simId → sem botões de vendedor.
  return <PropostaView {...data} viewToken={token} />;
}
