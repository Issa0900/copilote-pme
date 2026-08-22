import Link from "next/link";

import { CategoryBreakdown } from "@/components/category-breakdown";
import {
  AlertIcon,
  BasketIcon,
  ExpenseIcon,
  NetResultIcon,
  QuarantineIcon,
  RecommendationIcon,
  RevenueIcon,
  TransactionsIcon,
} from "@/components/icons";
import { NetTrendChart } from "@/components/net-trend-chart";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  SectionHeading,
  StatTile,
  TrustBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
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
import { PeriodFilter } from "./period-filter";

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

const RANGE_DAYS: Record<string, number> = { "7j": 7, "30j": 30, "90j": 90 };

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Plage calculée sur le calendrier réel (contrairement à la fenêtre récente
 * interne du détecteur d'anomalies, ancrée elle sur la donnée) — c'est un
 * choix de navigation explicite de l'utilisateur. `null` = pas de filtre
 * (comportement historique, tout l'historique). */
function computeRange(range: string): { start: string; end: string } | null {
  const days = RANGE_DAYS[range];
  if (!days) return null;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
}

export default async function CompanyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  const range = rawRange && RANGE_DAYS[rawRange] ? rawRange : "";
  const dateRange = computeRange(range);
  const dateQuery = dateRange ? `?start_date=${dateRange.start}&end_date=${dateRange.end}` : "";

  const [kpisRes, anomaliesRes, timeseriesRes, categoriesRes, alertsSummaryRes, recsRes] =
    await Promise.all([
      apiFetch(`/companies/${id}/kpis${dateQuery}`),
      apiFetch(`/companies/${id}/anomalies`),
      apiFetch(`/companies/${id}/kpis/timeseries${dateQuery}`),
      apiFetch(`/companies/${id}/kpis/categories${dateQuery}`),
      apiFetch(`/companies/${id}/alerts/summary`),
      apiFetch(`/companies/${id}/recommendations`),
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

  if (!kpis || (kpis.transactions_count === 0 && !dateRange)) {
    return (
      <div>
        <PageHeader title="Tableau de bord" />
        <EmptyState>
          <p className="mb-3">
            Aucune donnée validée pour l&apos;instant. Importez un fichier pour voir
            apparaître vos KPI.
          </p>
          <LinkButton href={`/entreprises/${id}/imports`} variant="primary" size="sm">
            Importer des données
          </LinkButton>
        </EmptyState>
      </div>
    );
  }

  if (kpis.transactions_count === 0 && dateRange) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tableau de bord" actions={<PeriodFilter active={range} />} />
        <EmptyState>
          Aucune transaction validée sur cette période.{" "}
          <Link href={`/entreprises/${id}`} className="underline">
            Voir tout l&apos;historique
          </Link>
          .
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <div
        className="animate-enter"
        style={{ "--enter-delay": "0s" } as React.CSSProperties}
      >
        <PageHeader title="Tableau de bord" actions={<PeriodFilter active={range} />} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-8">
        <div
          className="animate-enter grid grid-cols-2 gap-3"
          style={{ "--enter-delay": "0s" } as React.CSSProperties}
        >
          <Link href={`/entreprises/${id}/alertes`}>
            <Card interactive tone={urgentAlerts > 0 ? "danger" : "neutral"} className="h-full">
              <p className="flex items-center gap-1.5 text-xs opacity-80">
                <AlertIcon className="h-4 w-4" />
                Alertes à traiter
              </p>
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
            <Card interactive tone={pendingRecs > 0 ? "warning" : "neutral"} className="h-full">
              <p className="flex items-center gap-1.5 text-xs opacity-80">
                <RecommendationIcon className="h-4 w-4" />
                Recommandations en attente
              </p>
              <p className="mt-1 font-mono text-xl font-semibold">{pendingRecs}</p>
            </Card>
          </Link>
        </div>

        <div className="animate-enter" style={{ "--enter-delay": "0.05s" } as React.CSSProperties}>
          <SectionHeading>
            <span className="flex flex-wrap items-center gap-2">
              <TrustBadge level="fait" />
              <span className="normal-case tracking-normal">
                Calculé directement à partir des données validées
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
              </span>
            </span>
          </SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Revenus"
              value={formatCurrency(kpis.revenue_total)}
              icon={<RevenueIcon className="h-4 w-4" />}
            />
            <StatTile
              label="Dépenses"
              value={formatCurrency(kpis.expenses_total)}
              icon={<ExpenseIcon className="h-4 w-4" />}
            />
            <StatTile
              label="Résultat net"
              value={formatCurrency(kpis.net_result)}
              tone={kpis.net_result >= 0 ? "success" : "danger"}
              icon={<NetResultIcon className="h-4 w-4" />}
              chart={
                timeseries.length > 1 ? (
                  <NetTrendChart data={timeseries} compact />
                ) : undefined
              }
            />
            <StatTile
              label="Transactions validées"
              value={String(kpis.transactions_count)}
              icon={<TransactionsIcon className="h-4 w-4" />}
            />
            <StatTile
              label="Panier moyen"
              value={
                kpis.average_sale !== null ? formatCurrency(kpis.average_sale) : "—"
              }
              icon={<BasketIcon className="h-4 w-4" />}
            />
            <StatTile
              label="En attente de vérification"
              value={String(kpis.quarantined_count)}
              tone={kpis.quarantined_count > 0 ? "warning" : undefined}
              icon={<QuarantineIcon className="h-4 w-4" />}
            />
          </div>
        </div>

        {timeseries.length > 1 && (
          <div className="animate-enter" style={{ "--enter-delay": "0.1s" } as React.CSSProperties}>
            <SectionHeading>Résultat net par jour</SectionHeading>
            <Card>
              <NetTrendChart data={timeseries} />
            </Card>
          </div>
        )}

        <p className="text-xs text-foreground-muted">
          Le score de santé global multi-dimensions (finance, ventes, trésorerie,
          risques, croissance...) et l&apos;analyse causale (« cause probable »)
          nécessitent les modules IA et de radar externe, prévus plus loin sur la
          feuille de route.
        </p>
      </div>

      <div className="space-y-8">
        {categories.length > 0 && (
          <div className="animate-enter" style={{ "--enter-delay": "0.15s" } as React.CSSProperties}>
            <SectionHeading>Répartition par catégorie</SectionHeading>
            <Card>
              <CategoryBreakdown items={categories} />
            </Card>
          </div>
        )}

        <div className="animate-enter" style={{ "--enter-delay": "0.2s" } as React.CSSProperties}>
          <SectionHeading>
            <span className="flex flex-wrap items-center gap-2">
              <TrustBadge level="analyse" />
              <span className="normal-case tracking-normal">
                Écarts statistiques détectés par le système, à valider
              </span>
            </span>
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
                  <span className="mr-2 inline-block rounded-full bg-surface/60 px-2 py-0.5 text-xs font-medium">
                    {SEVERITY_LABELS[anomaly.severity]}
                  </span>
                  <span className="text-sm">{anomaly.message}</span>
                </Card>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
