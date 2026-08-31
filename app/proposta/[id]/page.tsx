import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { getConfig, getSimulation } from "@/lib/store";
import { computePropostaData } from "@/lib/proposta";
import PropostaView from "../../components/PropostaView";

export const dynamic = "force-dynamic";

export default async function PropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const record = await getSimulation(id);
  if (!record) notFound();
  if (session.role !== "admin" && record.sellerEmail !== session.email) notFound();

  const config = await getConfig();
  const data = computePropostaData(record, config);

  return (
    <PropostaView
      {...data}
      simId={record.id}
      shareToken={record.shareToken ?? null}
      shareViews={record.shareViews}
      shareLastViewedAt={record.shareLastViewedAt ?? null}
      shareExpiresAt={record.shareExpiresAt ?? null}
    />
  );
}
