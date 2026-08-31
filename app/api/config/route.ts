import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getConfig, saveConfig } from "@/lib/store";
import type { AppConfig } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  return NextResponse.json(await getConfig());
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }
  let cfg: AppConfig;
  try {
    cfg = (await request.json()) as AppConfig;
  } catch {
    return NextResponse.json({ error: "requisição inválida" }, { status: 400 });
  }
  // validação mínima
  if (!cfg?.nichos || !cfg?.rateBounds || !cfg?.prestacao) {
    return NextResponse.json({ error: "config incompleta" }, { status: 400 });
  }
  await saveConfig(cfg);
  return NextResponse.json({ ok: true });
}
