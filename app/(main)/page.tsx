import Calculadora from "../components/Calculadora";
import { getSession } from "@/lib/auth/server";
import { getActiveCampaignsFor, getConfig, getSimulation } from "@/lib/store";
import type { SimulationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sim?: string }>;
}) {
  const session = await getSession();
  const config = await getConfig();
  const { sim } = await searchParams;
  const campaigns = session ? await getActiveCampaignsFor(session.email) : [];

  let initialSim: SimulationRecord | null = null;
  if (sim && session) {
    const rec = await getSimulation(sim);
    if (rec && (session.role === "admin" || rec.sellerEmail === session.email)) {
      initialSim = rec;
    }
  }

  return (
    <Calculadora
      config={config}
      user={{ nome: session?.nome ?? "", email: session?.email ?? "" }}
      initialSim={initialSim}
      campaigns={campaigns}
    />
  );
}
