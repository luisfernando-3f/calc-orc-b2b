// Normalização de telefone para E.164 (padrão que o GHL usa para casar o
// contato no Inbound Webhook). Aceita o que o vendedor digitar (com ou sem
// máscara, com ou sem +55/55) e sempre devolve "+55DDDNÚMERO" ou "" se vazio.
export function normalizePhoneBR(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const semPrefixo = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return `+55${semPrefixo}`;
}
