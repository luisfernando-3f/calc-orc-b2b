import { NextResponse } from "next/server";
import { registerShareView } from "@/lib/store";

// Público (sem login): o cliente abriu o link → registra a visualização.
export async function POST(request: Request) {
  const token = String((await request.json().catch(() => ({})))?.token ?? "");
  if (token) await registerShareView(token);
  return NextResponse.json({ ok: true });
}
