import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, EmptyState, PageHeader, SectionHeading, TrustBadge } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { amountRange, groupAlerts } from "@/lib/alert-groups";
import { ALERT_LEVEL_LABELS, ALERT_LEVEL_ORDER, ALERT_LEVEL_TONE } from "@/lib/alert-levels";
import { formatCurrency } from "@/lib/format";
import { PAGE_SIZES, parseOffset, readPageInfo } from "@/lib/pagination";
import type { Alert, Company } from "@/lib/types";

export default async function CompanyAlertsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string }>;
}) {
  const { id } = await params;
  const { offset: rawOffset } = await searchParams;

  // Liste bornée par le backend (spec §64.24). Les alertes arrivent triées de
  // la plus grave à la moins grave : une page ne masque donc jamais un signal
  // plus urgent que ceux affichés, mais elle reste une page — le total est lu
  // dans `X-Total-Count` et annoncé à l'écran.
  const limit = PAGE_SIZES.alerts;
  const offset = parseOffset(rawOffset);

  const [res, companyRes] = await Promise.all([
    apiFetch(`/companies/${id}/alerts?limit=${limit}&offset=${offset}`),
    apiFetch(`/companies/${id}`),
  ]);
  // Un échec de chargement ne doit jamais se confondre avec « aucune alerte » :
  // le produit affirmerait qu'il n'y a rien à signaler alors qu'il n'a rien pu
  // vérifier (spec §64.22). L'échec est donc capturé à part et rendu dans une
  // branche explicite, avant la branche « liste vide ».
  const alertsFailed = !res.ok;
  const alerts: Alert[] = res.ok ? await res.json() : [];
  const page = readPageInfo(res, alerts.length, offset, limit);
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const currency = company?.currency ?? "CAD";

  const grouped = ALERT_LEVEL_ORDER.map((level) => ({
    level,
    items: alerts.filter((a) => a.level === level),
  })).filter((group) => group.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Alertes"
        subtitle="Tous les signaux détectés, du plus urgent au moins urgent — une vue d'ensemble à consulter, pas encore une liste de tâches."
      />
      {alertsFailed ? (
        <Card tone="danger">
          <p className="text-sm font-medium">Impossible de charger les alertes.</p>
          <p className="mt-1 text-sm opacity-90">
            Le serveur n&apos;a pas répondu : cet écran ne dit pas qu&apos;il
            n&apos;y a aucune alerte, il n&apos;a pas pu le vérifier.{" "}
            <a href={`/entreprises/${id}/alertes`} className="underline">
              Recharger la page
            </a>
            . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis
            signalez-la à votre administrateur en précisant l&apos;heure.
          </p>
        </Card>
      ) : alerts.length === 0 ? (
        <EmptyState>Aucune alerte pour l&apos;instant.</EmptyState>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ level, items }, groupIndex) => {
            const tone = ALERT_LEVEL_TONE[level];
            const entries = groupAlerts(items);
            return (
              <div
                key={level}
                className="animate-enter"
                style={{ "--enter-delay": `${groupIndex * 0.05}s` } as React.CSSProperties}
              >
                {/* Sur une liste tronquée, ce compteur ne décrit que la page
                    affichée : le dire, plutôt que de laisser lire « 50 »
                    comme le total du niveau. */}
                <SectionHeading>
                  {ALERT_LEVEL_LABELS[level]} ({items.length}
                  {page.truncated ? " sur cette page" : ""})
                </SectionHeading>
                <ul className="space-y-2">
                  {entries.map((entry, i) =>
                    entry.kind === "single" ? (
                      <Card key={i} tone={tone}>
                        <div className="mb-1">
                          <TrustBadge level="analyse" />
                        </div>
                        <p className="font-medium">{entry.alert.title}</p>
                        <p className="text-sm opacity-90">{entry.alert.message}</p>
                      </Card>
                    ) : (
                      <Card key={entry.key} tone={tone}>
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                            <div>
                              <div className="mb-1">
                                <TrustBadge level="analyse" />
                              </div>
                              <p className="font-medium">{entry.label}</p>
                              <p className="text-sm opacity-90">
                                {(() => {
                                  const range = amountRange(entry.alerts);
                                  return range
                                    ? `Montants observés : de ${formatCurrency(range.min, currency)} à ${formatCurrency(range.max, currency)}`
                                    : entry.alerts[0].message;
                                })()}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge tone={tone}>{entry.alerts.length} alertes</Badge>
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                              >
                                <path
                                  d="M6 9L12 15L18 9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </summary>
                          <ul className="mt-3 space-y-3 border-t border-current/15 pt-3">
                            {entry.alerts.map((alert, j) => (
                              <li key={j}>
                                <p className="text-sm font-medium">{alert.title}</p>
                                <p className="text-sm opacity-90">{alert.message}</p>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </Card>
                    )
                  )}
                </ul>
              </div>
            );
          })}
          <ListPagination
            page={page}
            basePath={`/entreprises/${id}/alertes`}
            label="alertes"
            note="Les alertes sont classées de la plus grave à la moins grave : les suivantes sont moins urgentes, mais elles existent."
          />
        </div>
      )}

      <p className="mt-8 text-xs text-foreground-muted">
        Alertes calculées à la demande à partir des anomalies détectées et des
        imports (données à valider, imports échoués). Il n&apos;est pas encore
        possible de marquer une alerte comme lue ou résolue, et les
        notifications par courriel ou mobile ne sont pas encore disponibles.
        Aucune alerte « opportunité » n&apos;est encore générée pour le
        moment.
      </p>
    </div>
  );
}
