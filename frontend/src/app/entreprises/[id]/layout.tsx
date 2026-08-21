import { logoutAction } from "@/app/connexion/actions";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Company } from "@/lib/types";
import { CompanyNav } from "./company-nav";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch(`/companies/${id}`);
  const company: Company | null = res.ok ? await res.json() : null;

  return (
    <main className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        {company ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              {company.sector} · {company.location}
            </p>
          </div>
        ) : (
          <div />
        )}

        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Déconnexion
          </Button>
        </form>
      </div>

      <CompanyNav companyId={id} />

      {children}
    </main>
  );
}
