import { NextResponse } from "next/server";
import { findUser } from "@/lib/auth/users-store";
import { COOKIE_NAME, MAX_AGE, signSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  let email = "";
  let senha = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "");
    senha = String(body.senha ?? "");
  } catch {
    return NextResponse.json({ error: "requisição inválida" }, { status: 400 });
  }

  const user = await findUser(email, senha);
  if (!user) {
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }

  const token = await signSession({
    email: user.email,
    nome: user.nome,
    role: user.role,
    iat: Date.now(),
  });

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    nome: user.nome,
    redirect: user.role === "admin" ? "/admin" : "/",
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
