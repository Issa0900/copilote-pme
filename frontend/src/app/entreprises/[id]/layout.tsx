import { logoutAction } from "@/app/connexion/actions";
import { Button, LinkButton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AlertSummaryItem, Company, Import, Recommendation } from "@/lib/types";
import { CompanyNav } from "./company-nav";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [companyRes, alertsSummaryRes, recsRes, importsRes] = await Promise.all([
    apiFetch(`/companies/${id}`),
    apiFetch(`/companies/${id}/alerts/summary`),
    apiFetch(`/companies/${id}/recommendations`),
    apiFetch(`/companies/${id}/imports`),
  ]);

  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const alertsSummary: AlertSummaryItem[] = alertsSummaryRes.ok
    ? await alertsSummaryRes.json()
    : [];
  const recommendations: Recommendation[] = recsRes.ok ? await recsRes.json() : [];
  const imports: Import[] = importsRes.ok ? await importsRes.json() : [];

  // « Dernière synchronisation » = date du dernier import réellement reçu.
  // Le produit n'a pas encore de connecteurs qui se synchronisent seuls :
  // afficher autre chose (une heure courante, un « il y a 2 min » simulé)
  // laisserait croire à une collecte automatique qui n'existe pas.
  const lastImport = imports
    .map((i) => i.uploaded_at)
    .sort()
    .at(-1);

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
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{company?.name ?? "Entreprise"}</p>
              <p className="text-xs text-foreground-muted">
                {lastImport ? (
                  <>
                    Dernières données reçues le{" "}
                    <span className="font-mono">{formatDate(lastImport)}</span>
                  </>
                ) : (
                  "Aucune donnée importée pour l'instant"
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <LinkButton href={`/entreprises/${id}/imports`} variant="primary" size="sm">
                + Ajouter des données
              </LinkButton>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Déconnexion
                </Button>
              </form>
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
