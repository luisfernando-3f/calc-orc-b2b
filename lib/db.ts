// Conexão com o PostgreSQL + criação do schema (idempotente).
// Server-only. Se DATABASE_URL não estiver definida, o app cai no modo
// arquivo (data/*.json) — ver store.ts.

import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function dbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

/**
 * Cria as tabelas se não existirem. Guarda o registro completo em JSONB
 * (mantém os tipos do app) + colunas indexadas para filtro/ordenação.
 */
export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS users (
          email       TEXT PRIMARY KEY,
          nome        TEXT NOT NULL,
          role        TEXT NOT NULL,
          senha_hash  TEXT NOT NULL,
          senha_padrao BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS app_config (
          id      INT PRIMARY KEY DEFAULT 1,
          data    JSONB NOT NULL,
          CONSTRAINT app_config_singleton CHECK (id = 1)
        );

        CREATE TABLE IF NOT EXISTS simulations (
          id            TEXT PRIMARY KEY,
          seller_email  TEXT NOT NULL,
          share_token   TEXT UNIQUE,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          data          JSONB NOT NULL
        );
        CREATE INDEX IF NOT EXISTS simulations_seller_idx ON simulations (seller_email);
        CREATE INDEX IF NOT EXISTS simulations_updated_idx ON simulations (updated_at DESC);

        CREATE TABLE IF NOT EXISTS campaigns (
          id      TEXT PRIMARY KEY,
          data    JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cases (
          id      TEXT PRIMARY KEY,
          data    JSONB NOT NULL
        );
      `);
    })();
  }
  return schemaReady;
}

/** Query com schema garantido. */
export async function q<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
