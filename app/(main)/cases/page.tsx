import { getPublishedCases } from "@/lib/store";
import CasesShowcase from "../../components/CasesShowcase";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await getPublishedCases();
  const nichos = [...new Set(cases.map((c) => c.nicho))].sort();

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Cases e Projetos</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Resultados reais entregues pela SEED — use na call como prova, de preferência do
          mesmo nicho do seu prospect.
        </p>
      </div>
      <CasesShowcase cases={cases} nichos={nichos} />
    </div>
  );
}
