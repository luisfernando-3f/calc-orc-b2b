import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import {
  getSimulation,
  getSimulations,
  getSimulationsFor,
  setSimulationStatus,
  upsertSimulation,
} from "@/lib/store";
import type { DealStatus, SimulationRecord } from "@/lib/types";

// GET: ?id=<id> devolve um registro (com escopo de permissão); sem id, lista.
// Vendedor vê só as próprias; admin vê todas.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const rec = await getSimulation(id);
    if (!rec) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    if (session.role !== "admin" && rec.sellerEmail !== session.email) {
      return NextResponse.json({ error: "sem permissão" }, { status: 403 });
    }
    return NextResponse.json(rec);
  }

  const list =
    session.role === "admin"
      ? await getSimulations()
      : await getSimulationsFor(session.email);
  return NextResponse.json(list);
}

// POST: cria OU atualiza (upsert por id) um registro. O vendedor é derivado da
// sessão. Usado tanto pelo auto-save (Ponto de partida preenchido → rascunho)
// quanto pela exportação do PDF (marca exportado=true).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  let body: Partial<SimulationRecord>;
  try {
    body = (await request.json()) as Partial<SimulationRecord>;
  } catch {
    return NextResponse.json({ error: "requisição inválida" }, { status: 400 });
  }
  if (!body.state || !body.summary) {
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  }

  const now = new Date().toISOString();
  // Registro existente do próprio vendedor (para atualizar em vez de duplicar).
  const existing =
    body.id && typeof body.id === "string" ? await getSimulation(body.id) : null;
  const owned = existing && existing.sellerEmail === session.email ? existing : null;

  const rec: SimulationRecord = {
    id: owned ? owned.id : (typeof body.id === "string" && body.id) || crypto.randomUUID(),
    createdAt: owned ? owned.createdAt : now,
    updatedAt: now,
    // exportado é "pegajoso": uma vez true, continua true nos auto-saves seguintes.
    exportado: Boolean(body.exportado) || Boolean(owned?.exportado),
    sellerEmail: session.email,
    sellerNome: session.nome,
    cliente: body.cliente ?? "",
    preparadoPor: body.preparadoPor ?? "",
    observacoes: body.observacoes ?? "",
    state: body.state,
    prestacaoAplicada: Boolean(body.prestacaoAplicada),
    summary: body.summary,
    // preserva compartilhamento e desfecho comercial entre auto-saves
    shareToken: owned?.shareToken,
    shareExpiresAt: owned?.shareExpiresAt,
    shareViews: owned?.shareViews,
    shareLastViewedAt: owned?.shareLastViewedAt,
    status: owned?.status ?? "aberta",
  };
  await upsertSimulation(rec);
  return NextResponse.json({ ok: true, id: rec.id });
}

// PATCH: atualiza só o desfecho comercial (ganho/perdido/aberta).
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = body.status as DealStatus;
  if (!["aberta", "ganho", "perdido"].includes(status)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }
  const rec = await getSimulation(id);
  if (!rec) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (session.role !== "admin" && rec.sellerEmail !== session.email) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }
  await setSimulationStatus(id, status);
  return NextResponse.json({ ok: true });
}
