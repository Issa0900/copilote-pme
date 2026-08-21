import Link from "next/link";

import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
import type { Company, CompanyOptions } from "@/lib/types";

export default async function EntreprisesPage() {
  const [companiesRes, optionsRes] = await Promise.all([
    fetch(`${getApiUrl()}/companies`, { cache: "no-store" }),
    fetch(`${getApiUrl()}/meta/company-options`, { cache: "no-store" }),
  ]);
  const companies: Company[] = companiesRes.ok ? await companiesRes.json() : [];
  const options: CompanyOptions | null = optionsRes.ok
    ? await optionsRes.json()
    : null;
  const objectiveLabels = new Map(
    (options?.objectives ?? []).map((o) => [o.value, o.label])
  );

  return (
    <main className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <PageHeader
        title="Mes entreprises"
        actions={
          <LinkButton href="/entreprises/nouvelle" variant="primary">
            + Nouvelle entreprise
          </LinkButton>
        }
      />

      {companies.length === 0 ? (
        <EmptyState>Aucune entreprise pour l&apos;instant.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {companies.map((company) => (
            <Card key={company.id}>
              <Link
                href={`/entreprises/${company.id}`}
                className="font-medium hover:underline"
              >
                {company.name}
              </Link>
              <p className="mt-1 text-sm text-foreground-muted">
                {company.sector} · {company.location} ·{" "}
                <span className="font-mono">{company.employees}</span> employés
              </p>
              {company.objectives && company.objectives.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {company.objectives.map((value) => (
                    <Badge key={value} tone="accent">
                      {objectiveLabels.get(value) ?? value}
                    </Badge>
                  ))}
                </div>
              )}
              <Link
                href={`/entreprises/${company.id}/imports`}
                className="mt-3 inline-block text-sm text-accent hover:underline"
              >
                Importer des données →
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </main>
  );
}
