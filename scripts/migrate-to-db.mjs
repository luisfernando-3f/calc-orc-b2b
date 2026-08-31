// Migra os dados de data/*.json para o PostgreSQL.
//
// Uso (na VPS, dentro da pasta do projeto):
//   DATABASE_URL='postgres://calc_app:SENHA@127.0.0.1:5433/calc_orc_b2b' \
//     node scripts/migrate-to-db.mjs [pasta-com-os-json]
//
// Idempotente: pode rodar mais de uma vez (usa upsert por id/email).
// Não apaga nada que já esteja no banco.

import { promises as fs } from "fs";
import path from "path";
import pg from "pg";

const DATA_DIR = path.resolve(process.argv[2] || "data");
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("ERRO: defina DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf-8"));
  } catch {
    return null;
  }
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY, nome TEXT NOT NULL, role TEXT NOT NULL,
      senha_hash TEXT NOT NULL, senha_padrao BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS app_config (
      id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL,
      CONSTRAINT app_config_singleton CHECK (id = 1)
    );
    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY, seller_email TEXT NOT NULL, share_token TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS simulations_seller_idx ON simulations (seller_email);
    CREATE INDEX IF NOT EXISTS simulations_updated_idx ON simulations (updated_at DESC);
    CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data JSONB NOT NULL);
  `);
}

async function main() {
  console.log("Lendo JSONs de:", DATA_DIR);
  await ensureSchema();
  console.log("Schema garantido.");

  // ---- usuários (preserva os hashes de senha) ----
  const users = await readJson("users.json");
  if (Array.isArray(users)) {
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (email, nome, role, senha_hash, senha_padrao)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email) DO UPDATE SET
           nome = EXCLUDED.nome, role = EXCLUDED.role,
           senha_hash = EXCLUDED.senha_hash, senha_padrao = EXCLUDED.senha_padrao`,
        [
          String(u.email).toLowerCase(),
          u.nome,
          u.role,
          u.senhaHash,
          Boolean(u.senhaPadrao),
        ],
      );
    }
    console.log(`✓ usuários: ${users.length}`);
  } else console.log("- users.json ausente (pulado)");

  // ---- config ----
  const config = await readJson("config.json");
  if (config) {
    await pool.query(
      `INSERT INTO app_config (id, data) VALUES (1,$1)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [JSON.stringify(config)],
    );
    console.log(`✓ config: ${config.nichos?.length ?? 0} nichos`);
  } else console.log("- config.json ausente (pulado)");

  // ---- simulações ----
  const sims = await readJson("simulations.json");
  if (Array.isArray(sims)) {
    for (const s of sims) {
      await pool.query(
        `INSERT INTO simulations (id, seller_email, share_token, created_at, updated_at, data)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET
           seller_email = EXCLUDED.seller_email, share_token = EXCLUDED.share_token,
           updated_at = EXCLUDED.updated_at, data = EXCLUDED.data`,
        [
          s.id,
          s.sellerEmail,
          s.shareToken ?? null,
          s.createdAt,
          s.updatedAt ?? s.createdAt,
          JSON.stringify(s),
        ],
      );
    }
    console.log(`✓ simulações: ${sims.length}`);
  } else console.log("- simulations.json ausente (pulado)");

  // ---- campanhas ----
  const camps = await readJson("campaigns.json");
  if (Array.isArray(camps)) {
    for (const c of camps) {
      await pool.query(
        `INSERT INTO campaigns (id, data) VALUES ($1,$2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [c.id, JSON.stringify(c)],
      );
    }
    console.log(`✓ campanhas: ${camps.length}`);
  } else console.log("- campaigns.json ausente (pulado)");

  // ---- cases ----
  const cases = await readJson("cases.json");
  if (Array.isArray(cases)) {
    for (const c of cases) {
      await pool.query(
        `INSERT INTO cases (id, data) VALUES ($1,$2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [c.id, JSON.stringify(c)],
      );
    }
    console.log(`✓ cases: ${cases.length}`);
  } else console.log("- cases.json ausente (pulado)");

  // ---- conferência ----
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM users)       AS usuarios,
      (SELECT count(*) FROM app_config)  AS config,
      (SELECT count(*) FROM simulations) AS simulacoes,
      (SELECT count(*) FROM campaigns)   AS campanhas,
      (SELECT count(*) FROM cases)       AS cases
  `);
  console.log("\nNo banco agora:", rows[0]);
  await pool.end();
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
