// Persistência: PostgreSQL quando DATABASE_URL está definida; senão, arquivos
// JSON em data/ (modo original, útil em dev). A API pública é a mesma nos dois
// modos — nenhum outro arquivo precisa saber qual está em uso.
// Só pode ser importado no servidor (route handlers / server components).

import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CONFIG } from "./benchmarks";
import { dbEnabled, q } from "./db";
import { withLock } from "./lock";
import type {
  AppConfig,
  Campaign,
  Case,
  DealStatus,
  SimulationRecord,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const SIMS_FILE = path.join(DATA_DIR, "simulations.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");
const CASES_FILE = path.join(DATA_DIR, "cases.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Normaliza a config lida (merge defensivo com os defaults). */
function normalizeConfig(parsed: Partial<AppConfig>): AppConfig {
  const nichos = (parsed.nichos ?? DEFAULT_CONFIG.nichos).map((n) => ({
    ...n,
    leadsPorVenda: n.leadsPorVenda ?? "",
  }));
  return {
    nichos,
    rateBounds: parsed.rateBounds ?? DEFAULT_CONFIG.rateBounds,
    prestacao: parsed.prestacao ?? DEFAULT_CONFIG.prestacao,
  };
}

/* ---------------- Config (parâmetros editáveis pelo admin) ---------------- */

export async function getConfig(): Promise<AppConfig> {
  if (dbEnabled()) {
    const rows = await q<{ data: Partial<AppConfig> }>(
      "SELECT data FROM app_config WHERE id = 1",
    );
    return rows.length ? normalizeConfig(rows[0].data) : DEFAULT_CONFIG;
  }
  await ensureDir();
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    return normalizeConfig(JSON.parse(raw) as Partial<AppConfig>);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  if (dbEnabled()) {
    await q(
      `INSERT INTO app_config (id, data) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [JSON.stringify(cfg)],
    );
    return;
  }
  await ensureDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

/* ---------------- Simulações (histórico) ---------------- */

export async function getSimulations(): Promise<SimulationRecord[]> {
  if (dbEnabled()) {
    const rows = await q<{ data: SimulationRecord }>(
      "SELECT data FROM simulations ORDER BY updated_at DESC",
    );
    return rows.map((r) => r.data);
  }
  await ensureDir();
  try {
    const raw = await fs.readFile(SIMS_FILE, "utf-8");
    const list = JSON.parse(raw) as SimulationRecord[];
    const ts = (s: SimulationRecord) => s.updatedAt ?? s.createdAt;
    return list.sort((a, b) => ts(b).localeCompare(ts(a)));
  } catch {
    return [];
  }
}

export async function getSimulationsFor(
  sellerEmail: string,
): Promise<SimulationRecord[]> {
  if (dbEnabled()) {
    const rows = await q<{ data: SimulationRecord }>(
      "SELECT data FROM simulations WHERE seller_email = $1 ORDER BY updated_at DESC",
      [sellerEmail],
    );
    return rows.map((r) => r.data);
  }
  const all = await getSimulations();
  return all.filter((s) => s.sellerEmail === sellerEmail);
}

export async function getSimulation(
  id: string,
): Promise<SimulationRecord | null> {
  if (dbEnabled()) {
    const rows = await q<{ data: SimulationRecord }>(
      "SELECT data FROM simulations WHERE id = $1",
      [id],
    );
    return rows.length ? rows[0].data : null;
  }
  const all = await getSimulations();
  return all.find((s) => s.id === id) ?? null;
}

/** Busca por token de compartilhamento público (para o link do cliente). */
export async function getSimulationByToken(
  token: string,
): Promise<SimulationRecord | null> {
  if (!token) return null;
  if (dbEnabled()) {
    const rows = await q<{ data: SimulationRecord }>(
      "SELECT data FROM simulations WHERE share_token = $1",
      [token],
    );
    return rows.length ? rows[0].data : null;
  }
  const all = await getSimulations();
  return all.find((s) => s.shareToken === token) ?? null;
}

/** Cria ou atualiza (por id) um registro de simulação. */
export async function upsertSimulation(rec: SimulationRecord): Promise<void> {
  if (dbEnabled()) {
    await q(
      `INSERT INTO simulations (id, seller_email, share_token, created_at, updated_at, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         seller_email = EXCLUDED.seller_email,
         share_token  = EXCLUDED.share_token,
         updated_at   = EXCLUDED.updated_at,
         data         = EXCLUDED.data`,
      [
        rec.id,
        rec.sellerEmail,
        rec.shareToken ?? null,
        rec.createdAt,
        rec.updatedAt ?? rec.createdAt,
        JSON.stringify(rec),
      ],
    );
    return;
  }
  await withLock("sims", async () => {
    await ensureDir();
    const all = await getSimulations();
    const idx = all.findIndex((s) => s.id === rec.id);
    if (idx >= 0) all[idx] = rec;
    else all.push(rec);
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
  });
}

/** Registra uma abertura do link público (incrementa contador + timestamp). */
export async function registerShareView(token: string): Promise<void> {
  if (!token) return;
  if (dbEnabled()) {
    // incremento atômico dentro do JSONB (sem race entre visitantes)
    await q(
      `UPDATE simulations SET data = jsonb_set(
         jsonb_set(data, '{shareViews}',
           to_jsonb(COALESCE((data->>'shareViews')::int, 0) + 1)),
         '{shareLastViewedAt}', to_jsonb($2::text))
       WHERE share_token = $1`,
      [token, new Date().toISOString()],
    );
    return;
  }
  await withLock("sims", async () => {
    const all = await getSimulations();
    const rec = all.find((s) => s.shareToken === token);
    if (!rec) return;
    rec.shareViews = (rec.shareViews || 0) + 1;
    rec.shareLastViewedAt = new Date().toISOString();
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
  });
}

/** Revoga o link público (limpa token e validade). */
export async function revokeShare(id: string): Promise<void> {
  if (dbEnabled()) {
    await q(
      `UPDATE simulations
         SET share_token = NULL,
             data = (data - 'shareToken' - 'shareExpiresAt')
       WHERE id = $1`,
      [id],
    );
    return;
  }
  await withLock("sims", async () => {
    const all = await getSimulations();
    const rec = all.find((s) => s.id === id);
    if (!rec) return;
    delete rec.shareToken;
    delete rec.shareExpiresAt;
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
  });
}

/** Atualiza só o desfecho comercial de uma simulação. */
export async function setSimulationStatus(
  id: string,
  status: DealStatus,
): Promise<boolean> {
  if (dbEnabled()) {
    const rows = await q<{ id: string }>(
      `UPDATE simulations
         SET data = jsonb_set(data, '{status}', to_jsonb($2::text))
       WHERE id = $1 RETURNING id`,
      [id, status],
    );
    return rows.length > 0;
  }
  return withLock("sims", async () => {
    const all = await getSimulations();
    const rec = all.find((s) => s.id === id);
    if (!rec) return false;
    rec.status = status;
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
    return true;
  });
}

/* ---------------- Campanhas de desconto ---------------- */

export async function getCampaigns(): Promise<Campaign[]> {
  if (dbEnabled()) {
    const rows = await q<{ data: Campaign }>(
      "SELECT data FROM campaigns ORDER BY data->>'createdAt' DESC",
    );
    return rows.map((r) => r.data);
  }
  await ensureDir();
  try {
    const raw = await fs.readFile(CAMPAIGNS_FILE, "utf-8");
    return JSON.parse(raw) as Campaign[];
  } catch {
    return [];
  }
}

export async function saveCampaigns(list: Campaign[]): Promise<void> {
  if (dbEnabled()) {
    // substitui o conjunto (a UI envia a lista inteira)
    const ids = list.map((c) => c.id);
    await q(
      ids.length
        ? `DELETE FROM campaigns WHERE NOT (id = ANY($1::text[]))`
        : `DELETE FROM campaigns`,
      ids.length ? [ids] : [],
    );
    for (const c of list) {
      await q(
        `INSERT INTO campaigns (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [c.id, JSON.stringify(c)],
      );
    }
    return;
  }
  await ensureDir();
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** Campanhas ativas que valem para um vendedor (por e-mail). */
export async function getActiveCampaignsFor(email: string): Promise<Campaign[]> {
  const all = await getCampaigns();
  return all.filter(
    (c) => c.ativa && (c.alvoTodos || c.vendedores.includes(email)),
  );
}

/* ---------------- Cases e Projetos ---------------- */

export async function getCases(): Promise<Case[]> {
  if (dbEnabled()) {
    const rows = await q<{ data: Case }>(
      "SELECT data FROM cases ORDER BY data->>'createdAt' DESC",
    );
    return rows.map((r) => r.data);
  }
  await ensureDir();
  try {
    const raw = await fs.readFile(CASES_FILE, "utf-8");
    return JSON.parse(raw) as Case[];
  } catch {
    return [];
  }
}

export async function saveCases(list: Case[]): Promise<void> {
  if (dbEnabled()) {
    const ids = list.map((c) => c.id);
    await q(
      ids.length
        ? `DELETE FROM cases WHERE NOT (id = ANY($1::text[]))`
        : `DELETE FROM cases`,
      ids.length ? [ids] : [],
    );
    for (const c of list) {
      await q(
        `INSERT INTO cases (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [c.id, JSON.stringify(c)],
      );
    }
    return;
  }
  await ensureDir();
  await fs.writeFile(CASES_FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** Cases publicados (visão do vendedor). */
export async function getPublishedCases(): Promise<Case[]> {
  return (await getCases()).filter((c) => c.publicado);
}
