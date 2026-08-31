import { getCases, getConfig } from "@/lib/store";
import CaseManager from "../../components/CaseManager";

export const dynamic = "force-dynamic";

export default async function AdminCasesPage() {
  const [cases, config] = await Promise.all([getCases(), getConfig()]);

  return (
    <div className="px-8 py-7 max-w-[920px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Cases e Projetos</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Transforme os debriefings da operação em provas de resultado. Os cases publicados
          aparecem para os vendedores filtrados por nicho (anonimizados como “Cliente de
          {" "}&lt;nicho&gt;”), e os CPLs reais ajudam a calibrar a projeção.
        </p>
      </div>
      <CaseManager initial={cases} nichos={config.nichos.map((n) => n.nome)} />
    </div>
  );
}
