import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { nichoMacroFromTags } from "@/lib/ghlMacroNicho";

// Pipeline "02 - Pipeline CLOSER" / estágio "Reunião agendada" — leads prontos
// pra call de vendas, usados para pré-preencher a calculadora.
const PIPELINE_CLOSER_ID = "BUR0ElaJhjR9TvLZwMeD";
const STAGE_REUNIAO_AGENDADA_ID = "98699748-b3eb-4bd6-aedb-fdba6d650beb";
const FIELD_ID_SUBNICHO = "I3ztYS1QBgGZl6UrPQxY";
const FIELD_ID_SUBNICHO_OUTRO = "aO6KYLcr6YCKJkezHnXL";

interface GhlOpportunity {
  id: string;
  contactId: string;
  customFields?: { id: string; fieldValueString?: string }[];
  contact?: { name?: string; companyName?: string; phone?: string; tags?: string[] };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID_SEED;
  if (!token || !locationId) {
    return NextResponse.json({ error: "GHL não configurado" }, { status: 200 });
  }

  const url = new URL("https://services.leadconnectorhq.com/opportunities/search");
  url.searchParams.set("locationId", locationId);
  url.searchParams.set("pipelineId", PIPELINE_CLOSER_ID);
  url.searchParams.set("pipelineStageId", STAGE_REUNIAO_AGENDADA_ID);
  url.searchParams.set("limit", "100");

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("GHL search-opportunity falhou:", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "falha ao consultar o GHL" }, { status: 502 });
    }
    const data = (await res.json()) as { opportunities?: GhlOpportunity[] };
    const leads = (data.opportunities ?? []).map((op) => {
      const cf = (id: string) =>
        op.customFields?.find((f) => f.id === id)?.fieldValueString ?? "";
      const nome = op.contact?.name ?? "";
      const empresa = op.contact?.companyName ?? "";
      return {
        opportunityId: op.id,
        contactId: op.contactId,
        cliente: empresa ? `${nome} - ${empresa}` : nome,
        telefone: op.contact?.phone ?? "",
        nicho: nichoMacroFromTags(op.contact?.tags ?? []),
        nichoEspecifico: cf(FIELD_ID_SUBNICHO),
        nichoOutro: cf(FIELD_ID_SUBNICHO_OUTRO),
      };
    });
    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Erro ao consultar o GHL:", err);
    return NextResponse.json({ error: "falha ao consultar o GHL" }, { status: 502 });
  }
}
