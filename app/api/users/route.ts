import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import {
  countAdmins,
  createUser,
  deleteUser,
  emailExists,
  listUsers,
  roleOf,
  updateUser,
} from "@/lib/auth/users-store";
import type { Role } from "@/lib/auth/users";

async function requireAdminEmail(): Promise<string | null> {
  const s = await getSession();
  return s && s.role === "admin" ? s.email : null;
}
const forbidden = () => NextResponse.json({ error: "sem permissão" }, { status: 403 });
const bad = (m: string) => NextResponse.json({ error: m }, { status: 400 });

export async function GET() {
  if (!(await requireAdminEmail())) return forbidden();
  return NextResponse.json(await listUsers());
}

export async function POST(request: Request) {
  if (!(await requireAdminEmail())) return forbidden();
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const nome = String(body.nome ?? "").trim();
  const senha = String(body.senha ?? "");
  const role: Role = body.role === "admin" ? "admin" : "vendedor";

  if (!email || !email.includes("@")) return bad("Informe um e-mail válido.");
  if (!nome) return bad("Informe o nome.");
  if (senha.length < 4) return bad("A senha precisa ter ao menos 4 caracteres.");
  if (await emailExists(email)) return NextResponse.json(
    { error: "Já existe um usuário com esse e-mail." },
    { status: 409 },
  );

  await createUser({ email, nome, role, senha });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await requireAdminEmail())) return forbidden();
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!(await emailExists(email))) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const patch: { nome?: string; role?: Role; senha?: string } = {};
  if (typeof body.nome === "string") patch.nome = body.nome;
  if (body.role === "admin" || body.role === "vendedor") patch.role = body.role;
  if (body.senha) {
    if (String(body.senha).length < 4) return bad("Senha muito curta.");
    patch.senha = String(body.senha);
  }

  // Não deixar rebaixar o último admin.
  if (patch.role === "vendedor" && (await roleOf(email)) === "admin") {
    if ((await countAdmins()) <= 1) return bad("Não é possível rebaixar o último admin.");
  }

  await updateUser(email, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) return forbidden();
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  if (email === adminEmail.toLowerCase()) return bad("Você não pode excluir a si mesmo.");
  if ((await roleOf(email)) === "admin" && (await countAdmins()) <= 1) {
    return bad("Não é possível excluir o último admin.");
  }
  await deleteUser(email);
  return NextResponse.json({ ok: true });
}
