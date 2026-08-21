import { Badge, Card, EmptyState, type Tone } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
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

export default async function CompanyRecommendationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`${getApiUrl()}/companies/${id}/recommendations`, {
    cache: "no-store",
  });
  const recommendations: Recommendation[] = res.ok ? await res.json() : [];

  return (
    <div>
      {recommendations.length === 0 ? (
        <EmptyState>Aucune recommandation pour l&apos;instant.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              tone={PRIORITY_TONE[rec.priority]}
              className={rec.status !== "nouvelle" ? "opacity-60" : ""}
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge tone={PRIORITY_TONE[rec.priority]}>
                  Priorité {rec.priority}
                </Badge>
                <span className="text-xs text-foreground-muted">
                  {STATUS_LABELS[rec.status]}
                </span>
              </div>

              <p className="mb-1 text-sm">
                <span className="font-medium">Situation — </span>
                {rec.situation}
              </p>
              <p className="mb-1 text-sm opacity-90">
                <span className="font-medium">Analyse — </span>
                {rec.analysis}
              </p>
              <p className="mb-1 text-sm opacity-90">
                <span className="font-medium">Impact — </span>
                {rec.impact}
              </p>
              <p className="mb-3 text-sm opacity-90">
                <span className="font-medium">Action — </span>
                {rec.action}
              </p>

              {rec.status === "nouvelle" && (
                <RecommendationActions companyId={id} recommendationId={rec.id} />
              )}
            </Card>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-foreground-muted">
        Générées automatiquement à partir des anomalies significatives (sévérité
        élevée ou moyenne). Accepter/rejeter met à jour le statut, mais ne crée
        pas encore de tâche assignée (Module 20, non implémenté).
      </p>
    </div>
  );
}
