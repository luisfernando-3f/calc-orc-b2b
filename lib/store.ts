// Persistência em arquivos JSON (data/), mesmo padrão do dre-control. Sem banco.
// Só pode ser importado no servidor (route handlers / server components).

import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CONFIG } from "./benchmarks";
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

/* ---------------- Config (banco de dados editável) ---------------- */

/** Config atual; se o arquivo não existir, devolve o padrão (seed). */
export async function getConfig(): Promise<AppConfig> {
  await ensureDir();
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    // merge defensivo com os defaults (compat. com versões futuras)
    const nichos = (parsed.nichos ?? DEFAULT_CONFIG.nichos).map((n) => ({
      ...n,
      leadsPorVenda: n.leadsPorVenda ?? "",
    }));
    return {
      nichos,
      rateBounds: parsed.rateBounds ?? DEFAULT_CONFIG.rateBounds,
      prestacao: parsed.prestacao ?? DEFAULT_CONFIG.prestacao,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  await ensureDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

/* ---------------- Simulações (histórico) ---------------- */

export async function getSimulations(): Promise<SimulationRecord[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(SIMS_FILE, "utf-8");
    const list = JSON.parse(raw) as SimulationRecord[];
    // mais recentes primeiro (por última atualização)
    const ts = (s: SimulationRecord) => s.updatedAt ?? s.createdAt;
    return list.sort((a, b) => ts(b).localeCompare(ts(a)));
  } catch {
    return [];
  }
}

export async function getSimulationsFor(
  sellerEmail: string,
): Promise<SimulationRecord[]> {
  const all = await getSimulations();
  return all.filter((s) => s.sellerEmail === sellerEmail);
}

export async function getSimulation(
  id: string,
): Promise<SimulationRecord | null> {
  const all = await getSimulations();
  return all.find((s) => s.id === id) ?? null;
}

/** Busca por token de compartilhamento público (para o link do cliente). */
export async function getSimulationByToken(
  token: string,
): Promise<SimulationRecord | null> {
  if (!token) return null;
  const all = await getSimulations();
  return all.find((s) => s.shareToken === token) ?? null;
}

/** Registra uma abertura do link público (incrementa contador + timestamp). */
export async function registerShareView(token: string): Promise<void> {
  if (!token) return;
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
  await withLock("sims", async () => {
    const all = await getSimulations();
    const rec = all.find((s) => s.id === id);
    if (!rec) return;
    delete rec.shareToken;
    delete rec.shareExpiresAt;
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
  });
}

/** Cria ou atualiza (por id) um registro de simulação. Serializado por lock. */
export async function upsertSimulation(rec: SimulationRecord): Promise<void> {
  await withLock("sims", async () => {
    await ensureDir();
    const all = await getSimulations();
    const idx = all.findIndex((s) => s.id === rec.id);
    if (idx >= 0) all[idx] = rec;
    else all.push(rec);
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
  });
}

/* ---------------- Campanhas de desconto ---------------- */

export async function getCampaigns(): Promise<Campaign[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(CAMPAIGNS_FILE, "utf-8");
    return JSON.parse(raw) as Campaign[];
  } catch {
    return [];
  }
}

export async function saveCampaigns(list: Campaign[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** Atualiza só o desfecho comercial de uma simulação. Serializado por lock. */
export async function setSimulationStatus(
  id: string,
  status: DealStatus,
): Promise<boolean> {
  return withLock("sims", async () => {
    const all = await getSimulations();
    const rec = all.find((s) => s.id === id);
    if (!rec) return false;
    rec.status = status;
    await fs.writeFile(SIMS_FILE, JSON.stringify(all, null, 2), "utf-8");
    return true;
  });
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
  await ensureDir();
  try {
    const raw = await fs.readFile(CASES_FILE, "utf-8");
    return JSON.parse(raw) as Case[];
  } catch {
    return [];
  }
}

export async function saveCases(list: Case[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(CASES_FILE, JSON.stringify(list, null, 2), "utf-8");
}

/** Cases publicados (visão do vendedor). */
export async function getPublishedCases(): Promise<Case[]> {
  return (await getCases()).filter((c) => c.publicado);
}
