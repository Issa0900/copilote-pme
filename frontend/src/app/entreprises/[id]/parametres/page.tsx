import { EmptyState, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Company, CompanyOptions } from "@/lib/types";
import { CompanySettingsForm } from "./company-settings-form";

export default async function CompanySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [companyRes, optionsRes] = await Promise.all([
    apiFetch(`/companies/${id}`),
    apiFetch(`/meta/company-options`),
  ]);

  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const options: CompanyOptions = optionsRes.ok
    ? await optionsRes.json()
    : { objectives: [], revenue_ranges: [] };

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Les informations de votre entreprise, utilisées pour orienter les recommandations du système."
      />
      {company ? (
        <CompanySettingsForm company={company} options={options} />
      ) : (
        <EmptyState>Impossible de charger les informations de l&apos;entreprise.</EmptyState>
      )}
    </div>
  );
}
