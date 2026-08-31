import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { getCases, saveCases } from "@/lib/store";
import type { Case } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }
  return NextResponse.json(await getCases());
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }
  let list: Case[];
  try {
    list = (await request.json()) as Case[];
  } catch {
    return NextResponse.json({ error: "requisição inválida" }, { status: 400 });
  }
  if (!Array.isArray(list)) {
    return NextResponse.json({ error: "formato inválido" }, { status: 400 });
  }
  await saveCases(list);
  return NextResponse.json({ ok: true });
}
