import { ListPagination } from "@/components/list-pagination";
import { Badge, Card, EmptyState, PageHeader, TrustBadge, type Tone } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { PAGE_SIZES, parseOffset, readPageInfo } from "@/lib/pagination";
import { groupRecommendations } from "@/lib/recommendation-groups";
import type { Recommendation } from "@/lib/types";
import { RecommendationActions } from "./recommendation-actions";

const PRIORITY_TONE: Record<Recommendation["priority"], Tone> = {
  urgente: "danger",
  "élevée": "warning",
  moyenne: "surveillance",
  faible: "neutral",
};

const STATUS_LABELS: Record<Recommendation["status"], string> = {
  nouvelle: "Nouvelle",
  acceptee: "Acceptée",
  rejetee: "Rejetée",
};

function RecommendationBody({
  companyId,
  rec,
}: {
  companyId: string;
  rec: Recommendation;
}) {
  return (
    <>
      <div className="mb-1">
        <TrustBadge level="analyse" />
      </div>
      <p className="mb-1 text-sm">
        <span className="font-medium">Situation — </span>
        {rec.situation}
      </p>
      <p className="mb-1 text-sm opacity-90">
        <span className="font-medium">Analyse — </span>
        {rec.analysis}
      </p>
      <p className="mb-3 text-sm opacity-90">
        <span className="font-medium">Impact — </span>
        {rec.impact}
      </p>
      <div className="mb-1">
        <TrustBadge level="recommandation" />
      </div>
      <p className="mb-3 text-sm opacity-90">
        <span className="font-medium">Action — </span>
        {rec.action}
      </p>

      {rec.status === "nouvelle" && (
        <RecommendationActions companyId={companyId} recommendationId={rec.id} />
      )}
    </>
  );
}

export default async function CompanyRecommendationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string }>;
}) {
  const { id } = await params;
  const { offset: rawOffset } = await searchParams;

  // Liste bornée par le backend (spec §64.24) : page explicite + lecture de
  // `X-Total-Count`, pour ne pas laisser croire que tout ce qu'il y a à faire
  // tient dans ce qui est affiché.
  const limit = PAGE_SIZES.recommendations;
  const offset = parseOffset(rawOffset);

  const res = await apiFetch(
    `/companies/${id}/recommendations?limit=${limit}&offset=${offset}`
  );
  // Un échec de chargement ne doit jamais se confondre avec « aucune
  // recommandation » : ce serait affirmer qu'il n'y a rien à faire alors qu'on
  // n'a rien pu vérifier (spec §64.22).
  const recsFailed = !res.ok;
  const recommendations: Recommendation[] = res.ok ? await res.json() : [];
  const page = readPageInfo(res, recommendations.length, offset, limit);

  const entries = groupRecommendations(recommendations);

  return (
    <div>
      <PageHeader
        title="Recommandations"
        subtitle="Les signaux les plus sérieux des alertes, transformés en fiches d'action : situation, analyse, impact, et quoi faire."
      />
      {recsFailed ? (
        <Card tone="danger">
          <p className="text-sm font-medium">
            Impossible de charger les recommandations.
          </p>
          <p className="mt-1 text-sm opacity-90">
            Le serveur n&apos;a pas répondu : cet écran ne dit pas qu&apos;il
            n&apos;y a rien à faire, il n&apos;a pas pu le vérifier.{" "}
            <a href={`/entreprises/${id}/recommandations`} className="underline">
              Recharger la page
            </a>
            . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis
            signalez-la à votre administrateur en précisant l&apos;heure.
          </p>
        </Card>
      ) : recommendations.length === 0 ? (
        <EmptyState>Aucune recommandation pour l&apos;instant.</EmptyState>
      ) : (
        <>
        <ul
          className="animate-enter space-y-3"
          style={{ "--enter-delay": "0s" } as React.CSSProperties}
        >
          {entries.map((entry) =>
            entry.kind === "single" ? (
              <Card
                key={entry.recommendation.id}
                tone={PRIORITY_TONE[entry.recommendation.priority]}
                className={entry.recommendation.status !== "nouvelle" ? "opacity-60" : ""}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone={PRIORITY_TONE[entry.recommendation.priority]}>
                    Priorité {entry.recommendation.priority}
                  </Badge>
                  <span className="text-xs text-foreground-muted">
                    {STATUS_LABELS[entry.recommendation.status]}
                  </span>
                </div>
                <RecommendationBody companyId={id} rec={entry.recommendation} />
              </Card>
            ) : (
              <Card key={entry.key} tone={PRIORITY_TONE[entry.priority]}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <div>
                      <div className="mb-1">
                        <Badge tone={PRIORITY_TONE[entry.priority]}>
                          Priorité {entry.priority}
                        </Badge>
                      </div>
                      <p className="font-medium">{entry.category}</p>
                      <p className="text-sm opacity-90">
                        {entry.recommendations.length} recommandations similaires
                        pour cette catégorie.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={PRIORITY_TONE[entry.priority]}>
                        {entry.recommendations.length} recommandations
                      </Badge>
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
                  <ul className="mt-3 space-y-4 border-t border-current/15 pt-3">
                    {entry.recommendations.map((rec) => (
                      <li key={rec.id} className={rec.status !== "nouvelle" ? "opacity-60" : ""}>
                        <div className="mb-1 flex items-center justify-end">
                          <span className="text-xs text-foreground-muted">
                            {STATUS_LABELS[rec.status]}
                          </span>
                        </div>
                        <RecommendationBody companyId={id} rec={rec} />
                      </li>
                    ))}
                  </ul>
                </details>
              </Card>
            )
          )}
        </ul>
        <ListPagination
          page={page}
          basePath={`/entreprises/${id}/recommandations`}
          label="recommandations"
          note="Le regroupement par catégorie ne porte que sur les recommandations de cette page — d'autres vous attendent sur la suivante."
        />
        </>
      )}

      <p className="mt-8 text-xs text-foreground-muted">
        Générées automatiquement à partir des anomalies significatives (sévérité
        élevée ou moyenne). Créer une action fait passer la recommandation à
        « Acceptée » et la suit dans le{" "}
        <a href={`/entreprises/${id}/actions`} className="underline">
          Centre d&apos;actions
        </a>{" "}
        — pas encore de responsable assignable, faute de gestion d&apos;équipe
        dans le produit.
      </p>
    </div>
  );
}
