// Tipos de usuário + seed inicial. A lógica de autenticação (com hash) e a
// persistência ficam em users-store.ts (server-only). Os usuários agora são
// gerenciados pelo admin e persistidos em data/users.json.

export type Role = "admin" | "vendedor";

export interface User {
  email: string;
  nome: string;
  role: Role;
  senhaPadrao?: boolean; // true = ainda usa a senha inicial "1234"
}

/** Usuário como guardado no disco (senha com hash). */
export interface StoredUser extends User {
  senhaHash: string;
}

/**
 * Usuários iniciais (seed). As senhas em texto existem SÓ para o primeiro seed;
 * ao ler pela primeira vez, viram hash em data/users.json. Depois disso, o admin
 * cria/gerencia usuários pela interface. Troque estas senhas padrão.
 */
export const DEFAULT_USERS: (User & { senha: string })[] = [
  {
    email: "luisfernando@3fventure.com.br",
    nome: "Luís Fernando",
    role: "admin",
    senha: "1234",
  },
  {
    email: "juliano@3fventure.com.br",
    nome: "Juliano",
    role: "vendedor",
    senha: "1234",
  },
];
