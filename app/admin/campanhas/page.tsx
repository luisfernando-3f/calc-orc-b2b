import { getCampaigns, getConfig } from "@/lib/store";
import { listVendedores } from "@/lib/auth/users-store";
import CampaignsManager from "../../components/CampaignsManager";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const [campaigns, config] = await Promise.all([getCampaigns(), getConfig()]);
  const vendedores = await listVendedores();

  return (
    <div className="px-8 py-7 max-w-[920px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Campanhas de desconto</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Lance condições comerciais especiais liberando negociações para vendedores. Quando
          um cliente se encaixa numa campanha ativa, o vendedor é avisado na calculadora e
          pode aplicar o desconto.
        </p>
      </div>
      <CampaignsManager
        initial={campaigns}
        vendedores={vendedores}
        nichos={config.nichos.map((n) => n.nome)}
      />
    </div>
  );
}
