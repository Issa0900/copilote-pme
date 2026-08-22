import { logoutAction } from "@/app/connexion/actions";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { AlertSummaryItem, Company, Recommendation } from "@/lib/types";
import { CompanyNav } from "./company-nav";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [companyRes, alertsSummaryRes, recsRes] = await Promise.all([
    apiFetch(`/companies/${id}`),
    apiFetch(`/companies/${id}/alerts/summary`),
    apiFetch(`/companies/${id}/recommendations`),
  ]);

  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const alertsSummary: AlertSummaryItem[] = alertsSummaryRes.ok
    ? await alertsSummaryRes.json()
    : [];
  const recommendations: Recommendation[] = recsRes.ok ? await recsRes.json() : [];

  const urgentAlerts = alertsSummary
    .filter((a) => a.level === "critique" || a.level === "important")
    .reduce((sum, a) => sum + a.count, 0);
  const pendingRecs = recommendations.filter((r) => r.status === "nouvelle").length;

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <CompanyNav
        companyId={id}
        company={company}
        alertCount={urgentAlerts}
        recommendationCount={pendingRecs}
      />

      <main className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex justify-end">
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
