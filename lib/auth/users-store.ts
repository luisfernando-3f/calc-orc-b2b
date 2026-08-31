// Persistência e autenticação de usuários (server-only). data/users.json.

import { promises as fs } from "fs";
import path from "path";
import { withLock } from "../lock";
import { hashSenha, verifySenha } from "./hash";
import { DEFAULT_USERS, type Role, type StoredUser, type User } from "./users";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function readRaw(): Promise<StoredUser[] | null> {
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, "utf-8")) as StoredUser[];
  } catch {
    return null;
  }
}
async function writeRaw(list: StoredUser[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** Usuários com hash; semeia data/users.json a partir de DEFAULT_USERS na 1ª vez. */
export async function getUsers(): Promise<StoredUser[]> {
  const existing = await readRaw();
  if (existing) return existing;
  const seeded: StoredUser[] = [];
  for (const u of DEFAULT_USERS) {
    seeded.push({
      email: u.email,
      nome: u.nome,
      role: u.role,
      senhaHash: await hashSenha(u.senha),
      senhaPadrao: true,
    });
  }
  await writeRaw(seeded);
  return seeded;
}

export async function listUsers(): Promise<User[]> {
  return (await getUsers()).map(({ email, nome, role, senhaPadrao }) => ({
    email,
    nome,
    role,
    senhaPadrao,
  }));
}

/** Quantos usuários ainda estão com a senha inicial. */
export async function countSenhaPadrao(): Promise<number> {
  return (await getUsers()).filter((u) => u.senhaPadrao).length;
}

export async function listVendedores(): Promise<{ email: string; nome: string }[]> {
  return (await getUsers())
    .filter((u) => u.role === "vendedor")
    .map((u) => ({ email: u.email, nome: u.nome }));
}

export async function findUser(email: string, senha: string): Promise<User | null> {
  const e = email.trim().toLowerCase();
  const u = (await getUsers()).find((x) => x.email.toLowerCase() === e);
  if (!u) return null;
  const ok = await verifySenha(senha, u.senhaHash);
  return ok ? { email: u.email, nome: u.nome, role: u.role } : null;
}

export async function emailExists(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  return (await getUsers()).some((u) => u.email.toLowerCase() === e);
}

export async function countAdmins(): Promise<number> {
  return (await getUsers()).filter((u) => u.role === "admin").length;
}

export async function roleOf(email: string): Promise<Role | null> {
  const e = email.trim().toLowerCase();
  return (await getUsers()).find((u) => u.email.toLowerCase() === e)?.role ?? null;
}

export async function createUser(input: {
  email: string;
  nome: string;
  role: Role;
  senha: string;
}): Promise<void> {
  const senhaHash = await hashSenha(input.senha);
  await withLock("users", async () => {
    const list = await getUsers();
    list.push({
      email: input.email.trim().toLowerCase(),
      nome: input.nome.trim(),
      role: input.role,
      senhaHash,
      senhaPadrao: false,
    });
    await writeRaw(list);
  });
}

export async function updateUser(
  email: string,
  patch: { nome?: string; role?: Role; senha?: string },
): Promise<void> {
  const senhaHash = patch.senha ? await hashSenha(patch.senha) : null;
  await withLock("users", async () => {
    const list = await getUsers();
    const e = email.trim().toLowerCase();
    const u = list.find((x) => x.email.toLowerCase() === e);
    if (!u) return;
    if (patch.nome !== undefined) u.nome = patch.nome.trim();
    if (patch.role !== undefined) u.role = patch.role;
    if (senhaHash) {
      u.senhaHash = senhaHash;
      u.senhaPadrao = false; // trocou a senha → não é mais a padrão
    }
    await writeRaw(list);
  });
}

export async function deleteUser(email: string): Promise<void> {
  await withLock("users", async () => {
    const list = await getUsers();
    const e = email.trim().toLowerCase();
    await writeRaw(list.filter((u) => u.email.toLowerCase() !== e));
  });
}
