// Mapeia a tag "nicho: <slug>" que o GHL grava no contato para o nome do
// nicho macro usado no benchmark da calculadora (config.nichos[].nome).
// Manter em sincronia manualmente se as tags do GHL mudarem.
const TAG_TO_NICHO_MACRO: Record<string, string> = {
  "nutricao-animal": "Nutrição Animal",
  "nutricao-vegetal": "Nutrição Vegetal",
  softwares: "Softwares",
  servicos: "Serviços",
  finseg: "Financeiro",
  financeiro: "Financeiro",
  maquinas: "Máquinas e Equipamentos",
};

export function nichoMacroFromTags(tags: string[]): string {
  for (const tag of tags) {
    const m = tag.match(/^nicho:\s*(.+)$/i);
    if (m) {
      const slug = m[1].trim().toLowerCase();
      if (TAG_TO_NICHO_MACRO[slug]) return TAG_TO_NICHO_MACRO[slug];
    }
  }
  return "";
}
