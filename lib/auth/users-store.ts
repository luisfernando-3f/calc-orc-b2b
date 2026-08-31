// Persistência e autenticação de usuários (server-only).
// PostgreSQL quando DATABASE_URL está definida; senão, data/users.json.

import { promises as fs } from "fs";
import path from "path";
import { dbEnabled, q } from "../db";
import { withLock } from "../lock";
import { hashSenha, verifySenha } from "./hash";
import { DEFAULT_USERS, type Role, type StoredUser, type User } from "./users";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

type UserRow = {
  email: string;
  nome: string;
  role: Role;
  senha_hash: string;
  senha_padrao: boolean;
};
const rowToUser = (r: UserRow): StoredUser => ({
  email: r.email,
  nome: r.nome,
  role: r.role,
  senhaHash: r.senha_hash,
  senhaPadrao: r.senha_padrao,
});

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

/** Usuários com hash; semeia a partir de DEFAULT_USERS na 1ª vez. */
export async function getUsers(): Promise<StoredUser[]> {
  if (dbEnabled()) {
    const rows = await q<UserRow>("SELECT * FROM users ORDER BY nome");
    if (rows.length) return rows.map(rowToUser);
    // semeia os usuários iniciais (senha padrão, já com hash)
    for (const u of DEFAULT_USERS) {
      await q(
        `INSERT INTO users (email, nome, role, senha_hash, senha_padrao)
         VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (email) DO NOTHING`,
        [u.email, u.nome, u.role, await hashSenha(u.senha)],
      );
    }
    const seeded = await q<UserRow>("SELECT * FROM users ORDER BY nome");
    return seeded.map(rowToUser);
  }
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
  if (dbEnabled()) {
    await q(
      `INSERT INTO users (email, nome, role, senha_hash, senha_padrao)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [input.email.trim().toLowerCase(), input.nome.trim(), input.role, senhaHash],
    );
    return;
  }
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
  if (dbEnabled()) {
    const e = email.trim().toLowerCase();
    if (patch.nome !== undefined) {
      await q("UPDATE users SET nome = $2 WHERE email = $1", [e, patch.nome.trim()]);
    }
    if (patch.role !== undefined) {
      await q("UPDATE users SET role = $2 WHERE email = $1", [e, patch.role]);
    }
    if (senhaHash) {
      await q(
        "UPDATE users SET senha_hash = $2, senha_padrao = FALSE WHERE email = $1",
        [e, senhaHash],
      );
    }
    return;
  }
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
  if (dbEnabled()) {
    await q("DELETE FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    return;
  }
  await withLock("users", async () => {
    const list = await getUsers();
    const e = email.trim().toLowerCase();
    await writeRaw(list.filter((u) => u.email.toLowerCase() !== e));
  });
}
