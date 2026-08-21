import { PageHeader } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
import type { CompanyOptions } from "@/lib/types";
import { CompanyForm } from "./company-form";

export default async function NouvelleEntreprisePage() {
  const res = await fetch(`${getApiUrl()}/meta/company-options`, {
    cache: "no-store",
  });
  const options: CompanyOptions = res.ok
    ? await res.json()
    : { objectives: [], revenue_ranges: [] };

  return (
    <main className="mx-auto w-full max-w-2xl p-6 sm:p-8">
      <PageHeader
        title="Créer mon entreprise"
        subtitle="Ces informations orientent les recommandations du système. Un compte est créé en même temps pour y accéder."
      />
      <CompanyForm options={options} />
    </main>
  );
}
