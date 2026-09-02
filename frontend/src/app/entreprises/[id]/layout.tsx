import { logoutAction } from "@/app/connexion/actions";
import { Button, LinkButton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Action, AlertSummaryItem, Company, Import, Recommendation } from "@/lib/types";
import { CompanyNav } from "./company-nav";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [companyRes, alertsSummaryRes, recsRes, importsRes, actionsRes] = await Promise.all([
    apiFetch(`/companies/${id}`),
    apiFetch(`/companies/${id}/alerts/summary`),
    apiFetch(`/companies/${id}/recommendations`),
    apiFetch(`/companies/${id}/imports`),
    apiFetch(`/companies/${id}/actions`),
  ]);

  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const alertsSummaryFailed = !alertsSummaryRes.ok;
  const alertsSummary: AlertSummaryItem[] = alertsSummaryRes.ok
    ? await alertsSummaryRes.json()
    : [];
  const recsFailed = !recsRes.ok;
  const recommendations: Recommendation[] = recsRes.ok ? await recsRes.json() : [];
  const importsFailed = !importsRes.ok;
  const imports: Import[] = importsRes.ok ? await importsRes.json() : [];
  const actionsFailed = !actionsRes.ok;
  const actions: Action[] = actionsRes.ok ? await actionsRes.json() : [];

  // « Dernière synchronisation » = date du dernier import réellement reçu.
  // Le produit n'a pas encore de connecteurs qui se synchronisent seuls :
  // afficher autre chose (une heure courante, un « il y a 2 min » simulé)
  // laisserait croire à une collecte automatique qui n'existe pas.
  // Si la liste des imports n'a pas pu être chargée, on ne peut pas affirmer
  // « aucune donnée importée » : on le dit, plutôt que de faire passer une
  // panne pour une entreprise sans données (spec §64.22).
  const lastImport = importsFailed
    ? null
    : (imports
        .map((i) => i.uploaded_at)
        .sort()
        .at(-1) ?? null);

  // Un échec de fetch ne doit jamais se déguiser en « 0 » : un compteur à 0
  // affirmerait qu'il n'y a rien à traiter alors qu'on n'a pas pu vérifier, et
  // ce sur toutes les pages de l'entreprise. On met donc le compteur à `null`
  // et le badge disparaît (même règle qu'au tableau de bord). Afficher une
  // carte d'erreur dans la barre de navigation serait disproportionné : les
  // écrans concernés (Alertes, Recommandations) portent déjà leur propre
  // message d'échec explicite.
  const urgentAlerts = alertsSummaryFailed
    ? null
    : alertsSummary
        .filter((a) => a.level === "critique" || a.level === "important")
        .reduce((sum, a) => sum + a.count, 0);
  const pendingRecs = recsFailed
    ? null
    : recommendations.filter((r) => r.status === "nouvelle").length;
  const openActions = actionsFailed
    ? null
    : actions.filter((a) => a.status === "a_faire" || a.status === "en_cours").length;

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <CompanyNav
        companyId={id}
        company={company}
        alertCount={urgentAlerts}
        recommendationCount={pendingRecs}
        actionCount={openActions}
      />

      <main className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{company?.name ?? "Entreprise"}</p>
              <p className="text-xs text-foreground-muted">
                {importsFailed
                  ? "Date des dernières données indisponible"
                  : lastImport ? (
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
