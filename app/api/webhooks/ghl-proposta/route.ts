import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import {
  FIELD_ID_CICLO_VENDA_DIAS,
  FIELD_ID_SUBNICHO,
  FIELD_ID_SUBNICHO_OUTRO,
  FIELD_ID_TICKET_MEDIO,
  GHL_API_BASE,
  PIPELINE_CLOSER_ID,
  ghlHeaders,
} from "@/lib/ghlSeed";

// Ao clicar em "Gerar proposta": acha o contato pelo telefone, acha a
// oportunidade dele na Pipeline CLOSER e grava nicho específico, ticket
// médio e ciclo de venda direto via API do GHL.
//
// Antes isso passava por um Inbound Webhook + workflow do GHL, mas o
// mecanismo de merge-field do workflow corrompe acento (testado e
// confirmado) — a escrita direta pela API não tem esse problema.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID_SEED;
  if (!token || !locationId) {
    console.error("GHL_API_TOKEN/GHL_LOCATION_ID_SEED não configurados — envio ao GHL ignorado.");
    return NextResponse.json({ ok: false, error: "GHL não configurado" }, { status: 200 });
  }

  const body = await request.json().catch(() => ({}));
  const telefone = String(body.telefone ?? "");
  if (!telefone) {
    return NextResponse.json({ error: "telefone é obrigatório" }, { status: 400 });
  }

  try {
    // 1. Achar o contato pelo telefone.
    const contactUrl = new URL(`${GHL_API_BASE}/contacts/search/duplicate`);
    contactUrl.searchParams.set("locationId", locationId);
    contactUrl.searchParams.set("number", telefone);
    const contactRes = await fetch(contactUrl, { headers: ghlHeaders(token) });
    if (!contactRes.ok) {
      console.error(
        "GHL: contato não encontrado para o telefone",
        telefone,
        contactRes.status,
        await contactRes.text().catch(() => ""),
      );
      return NextResponse.json({ ok: false, error: "contato não encontrado" }, { status: 200 });
    }
    const contactData = (await contactRes.json()) as { contact?: { id?: string } };
    const contactId = contactData.contact?.id;
    if (!contactId) {
      console.error("GHL: resposta de busca de contato sem id para", telefone);
      return NextResponse.json({ ok: false, error: "contato não encontrado" }, { status: 200 });
    }

    // 2. Achar a oportunidade desse contato na Pipeline CLOSER.
    const oppSearchUrl = new URL(`${GHL_API_BASE}/opportunities/search`);
    oppSearchUrl.searchParams.set("location_id", locationId);
    oppSearchUrl.searchParams.set("contact_id", contactId);
    oppSearchUrl.searchParams.set("pipeline_id", PIPELINE_CLOSER_ID);
    const oppSearchRes = await fetch(oppSearchUrl, { headers: ghlHeaders(token) });
    if (!oppSearchRes.ok) {
      console.error(
        "GHL: falha ao buscar oportunidade do contato",
        contactId,
        oppSearchRes.status,
        await oppSearchRes.text().catch(() => ""),
      );
      return NextResponse.json({ ok: false, error: "falha ao buscar oportunidade" }, { status: 200 });
    }
    const oppSearchData = (await oppSearchRes.json()) as { opportunities?: { id: string }[] };
    const opportunityId = oppSearchData.opportunities?.[0]?.id;
    if (!opportunityId) {
      console.error("GHL: contato", contactId, "sem oportunidade aberta na Pipeline CLOSER");
      return NextResponse.json({ ok: false, error: "oportunidade não encontrada" }, { status: 200 });
    }

    // 3. Gravar os campos direto na oportunidade.
    const updateRes = await fetch(`${GHL_API_BASE}/opportunities/${opportunityId}`, {
      method: "PUT",
      headers: { ...ghlHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        customFields: [
          { id: FIELD_ID_SUBNICHO, fieldValue: String(body.nichoEspecifico ?? "") },
          { id: FIELD_ID_SUBNICHO_OUTRO, fieldValue: String(body.nichoOutro ?? "") },
          { id: FIELD_ID_TICKET_MEDIO, fieldValue: Number(body.ticketMedio ?? 0) },
          { id: FIELD_ID_CICLO_VENDA_DIAS, fieldValue: Number(body.cicloVendaDias ?? 0) },
        ],
      }),
    });
    if (!updateRes.ok) {
      console.error(
        "GHL: falha ao atualizar oportunidade",
        opportunityId,
        updateRes.status,
        await updateRes.text().catch(() => ""),
      );
      return NextResponse.json({ ok: false, error: "falha ao atualizar oportunidade" }, { status: 200 });
    }

    return NextResponse.json({ ok: true, opportunityId });
  } catch (err) {
    console.error("Erro ao sincronizar proposta com o GHL:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
