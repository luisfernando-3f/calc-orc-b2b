import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getSimulation, revokeShare, upsertSimulation } from "@/lib/store";

const VALIDADE_DIAS = 30;

// POST { id } → garante um token de compartilhamento e o devolve. Só o dono da
// simulação (ou admin) pode gerar. O token abre a proposta pública em /p/<token>.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  let id = "";
  try {
    id = String((await request.json())?.id ?? "");
  } catch {
    return NextResponse.json({ error: "requisição inválida" }, { status: 400 });
  }

  const rec = await getSimulation(id);
  if (!rec) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }
  if (session.role !== "admin" && rec.sellerEmail !== session.email) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  const expirado =
    rec.shareExpiresAt && new Date(rec.shareExpiresAt).getTime() < Date.now();
  const novaValidade = new Date(
    Date.now() + VALIDADE_DIAS * 24 * 60 * 60 * 1000,
  ).toISOString();
  if (!rec.shareToken || expirado) {
    // gera token novo + validade
    rec.shareToken = crypto.randomUUID().replace(/-/g, "");
    rec.shareExpiresAt = novaValidade;
    await upsertSimulation(rec);
  } else if (!rec.shareExpiresAt) {
    // token já existe mas sem validade (legado) → define
    rec.shareExpiresAt = novaValidade;
    await upsertSimulation(rec);
  }
  return NextResponse.json({
    token: rec.shareToken,
    expiraEm: rec.shareExpiresAt,
  });
}

// DELETE { id } → revoga o link público (dono ou admin).
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const id = String((await request.json().catch(() => ({})))?.id ?? "");
  const rec = await getSimulation(id);
  if (!rec) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  if (session.role !== "admin" && rec.sellerEmail !== session.email) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }
  await revokeShare(id);
  return NextResponse.json({ ok: true });
}
