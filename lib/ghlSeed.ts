// IDs fixos da location SEED no GHL, usados tanto para ler leads (seletor
// "Dados do CRM") quanto para escrever de volta (webhook de "Gerar
// proposta"). Ver CONTEXT.md — integração GHL.
export const PIPELINE_CLOSER_ID = "BUR0ElaJhjR9TvLZwMeD";
export const STAGE_REUNIAO_AGENDADA_ID = "98699748-b3eb-4bd6-aedb-fdba6d650beb";
export const FIELD_ID_SUBNICHO = "I3ztYS1QBgGZl6UrPQxY";
export const FIELD_ID_SUBNICHO_OUTRO = "aO6KYLcr6YCKJkezHnXL";
export const FIELD_ID_TICKET_MEDIO = "tpF2EQCJvjVjNQOkmsQz";
export const FIELD_ID_CICLO_VENDA_DIAS = "LdzDhA8AIUPa3sP7bjGu";

// A API pública do GHL não é consistente entre endpoints: alguns querem o
// parâmetro de location em camelCase, outros em snake_case. Cada valor aqui
// foi confirmado testando direto contra a API — não confiar no dryRun do
// MCP pra isso (ele nem sempre reflete o formato real da requisição).
export const GHL_API_BASE = "https://services.leadconnectorhq.com";
export const GHL_API_VERSION = "2021-07-28";

export function ghlHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
  };
}
