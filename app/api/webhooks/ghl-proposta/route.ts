import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";

// Dispara para o Inbound Webhook do GHL (location SEED) ao clicar em "Gerar
// proposta". O workflow do lado do GHL casa o contato pelo telefone e faz
// upsert da oportunidade na Pipeline CLOSER (ver CONTEXT.md — integração GHL).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const webhookUrl = process.env.GHL_WEBHOOK_URL_PROPOSTA;
  if (!webhookUrl) {
    console.error("GHL_WEBHOOK_URL_PROPOSTA não configurada — envio ao GHL ignorado.");
    return NextResponse.json({ ok: false, error: "webhook não configurado" }, { status: 200 });
  }

  const body = await request.json().catch(() => ({}));
  const telefone = String(body.telefone ?? "");
  if (!telefone) {
    return NextResponse.json({ error: "telefone é obrigatório" }, { status: 400 });
  }

  const payload = {
    phone: telefone,
    nicho_especifico: String(body.nichoEspecifico ?? ""),
    nicho_outro: String(body.nichoOutro ?? ""),
    ticket_medio: Number(body.ticketMedio ?? 0),
    ciclo_venda_dias: Number(body.cicloVendaDias ?? 0),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Webhook GHL respondeu com erro:", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Falha ao enviar webhook para o GHL:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
