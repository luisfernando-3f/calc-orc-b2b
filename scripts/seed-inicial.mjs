// Semeia cases + config iniciais no banco (gerado a partir dos dados de teste).
// Uso na VPS:
//   DATABASE_URL='postgres://calc_app:SENHA@127.0.0.1:5433/calc_orc_b2b' node scripts/seed-inicial.mjs
// Idempotente: pode rodar de novo (upsert por id).

import pg from 'pg';

const CASES = [
  {
    "id": "case-milagro",
    "nicho": "Nutrição Vegetal",
    "apelido": "Milagro Agro",
    "periodo": "Julho/2026",
    "destaque": "R$ 773 mil de faturamento em um único mês, ROAS de 25x e pico de R$ 594 mil em 24h.",
    "roas": 25.3,
    "faturamento": 773004,
    "vendas": 34,
    "ticketMedio": 16424,
    "cpl": 7.23,
    "cac": 899,
    "investimento": 30566,
    "publicado": true,
    "createdAt": "2026-08-29T18:02:59.317Z"
  },
  {
    "id": "case-verto",
    "nicho": "Nutrição Animal",
    "apelido": "Verto Agrícola",
    "periodo": "Agosto/2026",
    "destaque": "ROAS de 44,3x em agosto — R$ 385 mil de faturamento com apenas R$ 8,7 mil de mídia (2,26% do faturamento). 153 leads gerados.",
    "roas": 44.3,
    "faturamento": 385000,
    "cpl": 56.86,
    "publicado": true,
    "createdAt": "2026-08-29T18:02:59.320Z",
    "investimento": 8699.63
  },
  {
    "id": "case-folhito",
    "nicho": "Nutrição Vegetal",
    "apelido": "Folhito",
    "periodo": "Mar–Jul 2026",
    "destaque": "ROAS acumulado de 42x no período (com meses de pico acima de 80x), R$ 268 mil de faturamento e 7 negócios fechados — tickets de até R$ 132 mil em soja/pecuária.",
    "roas": 42.04,
    "faturamento": 268774,
    "vendas": 7,
    "ticketMedio": 40359,
    "cpl": 18.59,
    "cac": 913,
    "investimento": 6393,
    "publicado": true,
    "createdAt": "2026-08-29T18:07:29.533Z"
  }
];

const CONFIG = {
  "nichos": [
    {
      "id": "nutricao-animal",
      "nome": "Nutrição Animal",
      "cpl": 16.35,
      "base": 25,
      "total": 29,
      "leadsPorVenda": "20-40"
    },
    {
      "id": "nutricao-vegetal",
      "nome": "Nutrição Vegetal",
      "cpl": 15.95,
      "base": 26,
      "total": 28,
      "leadsPorVenda": "10-25"
    },
    {
      "id": "softwares",
      "nome": "Softwares",
      "cpl": 15.48,
      "base": 10,
      "total": 12,
      "leadsPorVenda": "90-120"
    },
    {
      "id": "servicos",
      "nome": "Serviços",
      "cpl": 49.63,
      "base": 9,
      "total": 12,
      "leadsPorVenda": "12-20",
      "ticketPadrao": 7000,
      "cicloPadrao": 45
    },
    {
      "id": "financeiro",
      "nome": "Financeiro",
      "cpl": 65.22,
      "base": 2,
      "total": 2,
      "leadsPorVenda": "100-120"
    },
    {
      "id": "maquinas",
      "nome": "Máquinas e Equipamentos",
      "cpl": 36.64,
      "base": 7,
      "total": 11,
      "leadsPorVenda": "30-50"
    }
  ],
  "rateBounds": {
    "atendido": {
      "min": 0.3,
      "sugestao": 0.6,
      "max": 0.8
    },
    "visita": {
      "min": 0.3,
      "sugestao": 0.6,
      "max": 0.8
    },
    "proposta": {
      "min": 0.5,
      "sugestao": 0.8,
      "max": 1
    },
    "venda": {
      "min": 0.2,
      "sugestao": 0.25,
      "max": 0.33
    }
  },
  "prestacao": {
    "pctIdeal": 0.1,
    "pctReduzido": 0.06,
    "piso": 24000,
    "tetoRef": 30000,
    "mesesBase": 6
  }
};

const url = process.env.DATABASE_URL;
if (!url) { console.error('ERRO: defina DATABASE_URL'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url });

async function main(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL,
      CONSTRAINT app_config_singleton CHECK (id = 1));
    CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data JSONB NOT NULL);
  `);
  await pool.query(`INSERT INTO app_config (id,data) VALUES (1,$1)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`, [JSON.stringify(CONFIG)]);
  console.log('✓ config:', CONFIG.nichos.length, 'nichos');
  for (const c of CASES) {
    await pool.query(`INSERT INTO cases (id,data) VALUES ($1,$2)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`, [c.id, JSON.stringify(c)]);
  }
  console.log('✓ cases:', CASES.map(c=>c.apelido).join(', '));
  const {rows} = await pool.query('SELECT (SELECT count(*) FROM cases) AS cases, (SELECT count(*) FROM app_config) AS config');
  console.log('No banco:', rows[0]);
  await pool.end();
}
main().catch(e=>{ console.error('FALHOU:', e.message); process.exit(1); });
