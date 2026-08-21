import Link from "next/link";

import { CategoryBreakdown } from "@/components/category-breakdown";
import { NetTrendChart } from "@/components/net-trend-chart";
import { Badge, Card, EmptyState, LinkButton, SectionHeading, StatTile } from "@/components/ui";
import { getApiUrl } from "@/lib/api";
import { ALERT_LEVEL_LABELS, ALERT_LEVEL_TONE } from "@/lib/alert-levels";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  AlertSummaryItem,
  Anomaly,
  CategoryBreakdownItem,
  CompanyKpis,
  DailyKpiPoint,
  Recommendation,
} from "@/lib/types";

const SEVERITY_LABELS: Record<Anomaly["severity"], string> = {
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

const SEVERITY_TONE: Record<Anomaly["severity"], "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = getApiUrl();

  const [kpisRes, anomaliesRes, timeseriesRes, categoriesRes, alertsSummaryRes, recsRes] =
    await Promise.all([
      fetch(`${api}/companies/${id}/kpis`, { cache: "no-store" }),
      fetch(`${api}/companies/${id}/anomalies`, { cache: "no-store" }),
      fetch(`${api}/companies/${id}/kpis/timeseries`, { cache: "no-store" }),
      fetch(`${api}/companies/${id}/kpis/categories`, { cache: "no-store" }),
      fetch(`${api}/companies/${id}/alerts/summary`, { cache: "no-store" }),
      fetch(`${api}/companies/${id}/recommendations`, { cache: "no-store" }),
    ]);

  const kpis: CompanyKpis | null = kpisRes.ok ? await kpisRes.json() : null;
  const anomalies: Anomaly[] = anomaliesRes.ok ? await anomaliesRes.json() : [];
  const timeseries: DailyKpiPoint[] = timeseriesRes.ok ? await timeseriesRes.json() : [];
  const categories: CategoryBreakdownItem[] = categoriesRes.ok
    ? await categoriesRes.json()
    : [];
  const alertsSummary: AlertSummaryItem[] = alertsSummaryRes.ok
    ? await alertsSummaryRes.json()
    : [];
  const recommendations: Recommendation[] = recsRes.ok ? await recsRes.json() : [];

  const urgentAlerts = alertsSummary
    .filter((a) => a.level === "critique" || a.level === "important")
    .reduce((sum, a) => sum + a.count, 0);
  const nonZeroAlerts = alertsSummary.filter((a) => a.count > 0);
  const pendingRecs = recommendations.filter((r) => r.status === "nouvelle").length;

  if (!kpis || kpis.transactions_count === 0) {
    return (
      <EmptyState>
        <p className="mb-3">
          Aucune donnée validée pour l&apos;instant. Importez un fichier pour voir
          apparaître vos KPI.
        </p>
        <LinkButton href={`/entreprises/${id}/imports`} variant="primary" size="sm">
          Importer des données
        </LinkButton>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/entreprises/${id}/alertes`}>
          <Card tone={urgentAlerts > 0 ? "danger" : "neutral"} className="h-full">
            <p className="text-xs opacity-80">Alertes à traiter</p>
            <p className="mt-1 font-mono text-xl font-semibold">{urgentAlerts}</p>
            {nonZeroAlerts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nonZeroAlerts.map(({ level, count }) => (
                  <Badge key={level} tone={ALERT_LEVEL_TONE[level]}>
                    {ALERT_LEVEL_LABELS[level]} · <span className="font-mono">{count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </Link>
        <Link href={`/entreprises/${id}/recommandations`}>
          <Card tone={pendingRecs > 0 ? "warning" : "neutral"} className="h-full">
            <p className="text-xs opacity-80">Recommandations en attente</p>
            <p className="mt-1 font-mono text-xl font-semibold">{pendingRecs}</p>
          </Card>
        </Link>
      </div>

      <div>
        <SectionHeading>
          FAIT — calculé directement à partir des données validées
          {kpis.period_start && kpis.period_end && (
            <>
              {" "}
              (
              <span className="font-mono">
                {formatDate(kpis.period_start)} – {formatDate(kpis.period_end)}
              </span>
              )
            </>
          )}
        </SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Revenus" value={formatCurrency(kpis.revenue_total)} />
          <StatTile label="Dépenses" value={formatCurrency(kpis.expenses_total)} />
          <StatTile
            label="Résultat net"
            value={formatCurrency(kpis.net_result)}
            tone={kpis.net_result >= 0 ? "success" : "danger"}
          />
          <StatTile
            label="Transactions validées"
            value={String(kpis.transactions_count)}
          />
          <StatTile
            label="Panier moyen"
            value={
              kpis.average_sale !== null ? formatCurrency(kpis.average_sale) : "—"
            }
          />
          <StatTile
            label="En quarantaine"
            value={String(kpis.quarantined_count)}
            tone={kpis.quarantined_count > 0 ? "warning" : undefined}
          />
        </div>
      </div>

      {timeseries.length > 1 && (
        <div>
          <SectionHeading>Résultat net par jour</SectionHeading>
          <Card>
            <NetTrendChart data={timeseries} />
          </Card>
        </div>
      )}

      {categories.length > 0 && (
        <div>
          <SectionHeading>Répartition par catégorie</SectionHeading>
          <Card>
            <CategoryBreakdown items={categories} />
          </Card>
        </div>
      )}

      <div>
        <SectionHeading>
          ANALYSE — écarts statistiques détectés par le système, à valider
        </SectionHeading>
        {anomalies.length === 0 ? (
          <EmptyState>
            Aucune anomalie détectée (ou pas encore assez de données pour une
            détection fiable).
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {anomalies.map((anomaly, i) => (
              <Card key={i} tone={SEVERITY_TONE[anomaly.severity]}>
                <span className="mr-2 inline-block rounded bg-surface/60 px-1.5 py-0.5 text-xs font-medium">
                  {SEVERITY_LABELS[anomaly.severity]}
                </span>
                <span className="text-sm">{anomaly.message}</span>
              </Card>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-foreground-muted">
        Le score de santé global multi-dimensions (finance, ventes, trésorerie,
        risques, croissance...) et l&apos;analyse causale (« cause probable »)
        nécessitent les modules IA et de radar externe, prévus plus loin sur la
        feuille de route.
      </p>
    </div>
  );
}
