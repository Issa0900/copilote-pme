import Link from "next/link";

import { CategoryBreakdown } from "@/components/category-breakdown";
import {
  BasketIcon,
  ExpenseIcon,
  NetResultIcon,
  RevenueIcon,
  TransactionsIcon,
} from "@/components/icons";
import { AnomalyCard } from "@/components/anomaly-card";
import { HealthPanel } from "@/components/health-panel";
import { KpiCard } from "@/components/kpi-card";
import { NetTrendChart } from "@/components/net-trend-chart";
import {
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  SectionHeading,
  TrustBadge,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAGE_SIZES, readPageInfo } from "@/lib/pagination";
import type {
  AlertSummaryItem,
  Anomaly,
  CategoryBreakdownItem,
  Company,
  CompanyKpis,
  DailyKpiPoint,
  HealthScore,
  KpiComparison,
  KpiVariance,
  Recommendation,
} from "@/lib/types";
import { PeriodFilter } from "./period-filter";

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

/** Les objectifs saisis dans les Paramètres sont annuels. Les comparer tels
 * quels aux revenus de 30 jours afficherait un « 8 % atteint » démoralisant et
 * faux : on ramène donc la cible à la durée réellement affichée. Sur
 * l'historique complet (durée inconnue côté écran), aucun objectif n'est
 * montré plutôt qu'un pourcentage bancal. */
function prorateTarget(target: number | null | undefined, range: string): number | null {
  if (target == null || target <= 0) return null;
  const days = RANGE_DAYS[range];
  if (!days) return null;
  return (target / 365) * days;
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
  // Période par défaut : 30 jours. Sans plage, l'API ne peut pas calculer de
  // période précédente comparable — toutes les cartes KPI afficheraient alors
  // « pas de comparaison possible », ce qui donne l'impression d'un écran
  // cassé dès l'arrivée. `?range=tout` reste accessible pour l'historique
  // complet, explicitement choisi.
  const range = rawRange && RANGE_DAYS[rawRange] ? rawRange : rawRange === "tout" ? "tout" : "30j";
  const dateRange = computeRange(range);
  const dateQuery = dateRange ? `?start_date=${dateRange.start}&end_date=${dateRange.end}` : "";

  const [
    comparisonRes,
    healthRes,
    anomaliesRes,
    timeseriesRes,
    categoriesRes,
    alertsSummaryRes,
    recsRes,
    companyRes,
    varianceRes,
  ] = await Promise.all([
    apiFetch(`/companies/${id}/kpis/comparison${dateQuery}`),
    apiFetch(`/companies/${id}/health-score${dateQuery}`),
    apiFetch(`/companies/${id}/anomalies${dateQuery}`),
    apiFetch(`/companies/${id}/kpis/timeseries${dateQuery}`),
    apiFetch(`/companies/${id}/kpis/categories${dateQuery}`),
    apiFetch(`/companies/${id}/alerts/summary`),
    apiFetch(`/companies/${id}/recommendations?limit=${PAGE_SIZES.recommendations}`),
    apiFetch(`/companies/${id}`),
    // L'analyse d'écarts suppose deux périodes comparables : sans plage de
    // dates, il n'y a rien à comparer et la route n'est pas appelée.
    dateRange
      ? apiFetch(
          `/companies/${id}/kpis/variance?start_date=${dateRange.start}&end_date=${dateRange.end}`
        )
      : Promise.resolve(null),
  ]);

  const comparison: KpiComparison | null = comparisonRes.ok
    ? await comparisonRes.json()
    : null;
  const health: HealthScore | null = healthRes.ok ? await healthRes.json() : null;
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const variances: KpiVariance[] = varianceRes?.ok ? await varianceRes.json() : [];
  const revenueVariance = variances.find((v) => v.metric === "revenue") ?? null;
  const expenseVariance = variances.find((v) => v.metric === "expenses") ?? null;
  const kpis: CompanyKpis | null = comparison?.current ?? null;
  const prev: CompanyKpis | null = comparison?.previous ?? null;
  // Devise de l'entreprise (spec §64.3/§64.6/§64.8) : tout montant affiché
  // sur cet écran doit être formaté avec elle, jamais avec un CAD supposé —
  // CAD n'est ici qu'un repli si l'entreprise n'a pas pu être chargée.
  const currency = company?.currency ?? "CAD";
  const anomaliesFailed = !anomaliesRes.ok;
  const anomalies: Anomaly[] = anomaliesRes.ok ? await anomaliesRes.json() : [];
  const timeseries: DailyKpiPoint[] = timeseriesRes.ok ? await timeseriesRes.json() : [];
  const categories: CategoryBreakdownItem[] = categoriesRes.ok
    ? await categoriesRes.json()
    : [];
  const alertsSummaryFailed = !alertsSummaryRes.ok;
  const alertsSummary: AlertSummaryItem[] = alertsSummaryRes.ok
    ? await alertsSummaryRes.json()
    : [];
  const recsFailed = !recsRes.ok;
  const recommendations: Recommendation[] = recsRes.ok ? await recsRes.json() : [];
  // Le backend borne cette liste (spec §64.24) : le compteur ci-dessous est
  // donc calculé sur une page, pas sur la totalité. Quand il en manque, le
  // chiffre est présenté comme un minimum (« 100+ ») plutôt que comme le
  // décompte exact.
  const recsPage = readPageInfo(
    recsRes,
    recommendations.length,
    0,
    PAGE_SIZES.recommendations
  );

  // Un échec de fetch ne doit jamais se déguiser en « 0 » — ça affirmerait
  // silencieusement qu'il n'y a rien à signaler alors qu'on n'a simplement
  // pas pu vérifier. On retire donc le compteur plutôt que d'afficher un 0
  // trompeur (voir le rendu des liens Alertes/Recommandations plus bas).
  const urgentAlerts = alertsSummaryFailed
    ? null
    : alertsSummary
        .filter((a) => a.level === "critique" || a.level === "important")
        .reduce((sum, a) => sum + a.count, 0);
  const pendingRecs = recsFailed
    ? null
    : recommendations.filter((r) => r.status === "nouvelle").length;

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

      {/* 1. KPI essentiels — première chose à l'écran : les chiffres que le
          dirigeant vient chercher, avec leur variation réelle. */}
      <div>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="fait" />
            <span className="normal-case tracking-normal">
              Calculé à partir des données validées
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Revenus"
            value={formatCurrency(kpis.revenue_total, currency)}
            icon={<RevenueIcon className="h-4 w-4" />}
            current={kpis.revenue_total}
            previous={prev?.revenue_total}
            series={timeseries.map((p) => p.revenue)}
            target={prorateTarget(company?.revenue_target, range)}
            targetLabel="Objectif période"
            formatTarget={(v) => formatCurrency(v, currency)}
            variance={revenueVariance}
            currency={currency}
            enterDelay="0s"
          />
          <KpiCard
            label="Dépenses"
            value={formatCurrency(kpis.expenses_total, currency)}
            icon={<ExpenseIcon className="h-4 w-4" />}
            current={kpis.expenses_total}
            previous={prev?.expenses_total}
            direction="up-bad"
            series={timeseries.map((p) => p.expenses)}
            target={prorateTarget(company?.expense_budget, range)}
            targetLabel="Budget période"
            formatTarget={(v) => formatCurrency(v, currency)}
            variance={expenseVariance}
            currency={currency}
            enterDelay="0.04s"
          />
          <KpiCard
            label="Résultat net"
            value={formatCurrency(kpis.net_result, currency)}
            icon={<NetResultIcon className="h-4 w-4" />}
            current={kpis.net_result}
            previous={prev?.net_result}
            series={timeseries.map((p) => p.net)}
            enterDelay="0.08s"
          />
          <KpiCard
            label="Marge nette"
            // Marge fournie par le backend (`net_margin_pct`), affichée telle
            // quelle : aucun calcul financier ne doit être fait côté frontend
            // (spec §64.29). `null` = aucun revenu sur la période, donc marge
            // non calculable — on montre « — », jamais « 0 % », qui serait un
            // chiffre faux présenté comme un fait.
            value={
              kpis.net_margin_pct !== null ? `${kpis.net_margin_pct} %` : "—"
            }
            icon={<NetResultIcon className="h-4 w-4" />}
            unit="percentage-points"
            current={kpis.net_margin_pct ?? undefined}
            previous={prev?.net_margin_pct ?? undefined}
            enterDelay="0.12s"
          />
          <KpiCard
            label="Panier moyen"
            value={kpis.average_sale !== null ? formatCurrency(kpis.average_sale, currency) : "—"}
            icon={<BasketIcon className="h-4 w-4" />}
            current={kpis.average_sale ?? undefined}
            previous={prev?.average_sale}
            // Le modèle de données n'a pas de notion de commande : ce chiffre
            // est le CA divisé par le nombre de lignes positives, ce qui n'est
            // pas le panier moyen du spec §14. On l'affiche donc comme une
            // estimation assumée plutôt que comme un fait (PRD §44).
            trust="hypothese"
            note="Estimation : faute de notion de commande dans les données importées, chaque ligne à montant positif compte pour une vente — remboursements et dépôts inclus, et paniers de nature différente confondus."
            enterDelay="0.16s"
          />
          <KpiCard
            label="Transactions"
            value={String(kpis.transactions_count)}
            icon={<TransactionsIcon className="h-4 w-4" />}
            current={kpis.transactions_count}
            previous={prev?.transactions_count}
            enterDelay="0.2s"
          />
        </div>
      </div>

      {/* 2. Situation globale + score de santé, juste sous les chiffres :
          l'interprétation vient après les faits qu'elle commente. */}
      {health && (
        <div className="mt-8">
          <HealthPanel health={health} />
        </div>
      )}

      {/* 3. Évolution + répartition, côte à côte. */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[3fr_2fr]">
        {timeseries.length > 1 && (
          <div className="animate-enter" style={{ "--enter-delay": "0.1s" } as React.CSSProperties}>
            <SectionHeading>Évolution financière</SectionHeading>
            <Card>
              <NetTrendChart data={timeseries} currency={currency} />
            </Card>
          </div>
        )}

        {categories.length > 0 && (
          <div className="animate-enter" style={{ "--enter-delay": "0.15s" } as React.CSSProperties}>
            <SectionHeading>Répartition des dépenses par catégorie</SectionHeading>
            <Card>
              <CategoryBreakdown items={categories} currency={currency} />
            </Card>
          </div>
        )}
      </div>

      {/* 4. Priorités, en fin d'écran : trois au maximum (PRD section 47 —
          « une idée dominante et trois priorités »). Le reste est accessible
          depuis le centre d'alertes plutôt qu'empilé ici. */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <SectionHeading>
            <span className="flex flex-wrap items-center gap-2">
              <TrustBadge level="analyse" />
              <span className="normal-case tracking-normal">
                Priorités — écarts détectés, à valider
              </span>
            </span>
          </SectionHeading>
          <div className="mb-3 flex gap-2 text-xs">
            <Link
              href={`/entreprises/${id}/alertes`}
              className="text-foreground-muted hover:text-foreground"
            >
              Alertes
              {urgentAlerts !== null && urgentAlerts > 0 && (
                <span className="font-mono"> · {urgentAlerts}</span>
              )}
            </Link>
            <span className="text-border">|</span>
            <Link
              href={`/entreprises/${id}/recommandations`}
              className="text-foreground-muted hover:text-foreground"
            >
              Recommandations
              {pendingRecs !== null && pendingRecs > 0 && (
                <span
                  className="font-mono"
                  title={
                    recsPage.truncated
                      ? "Au moins ce nombre de recommandations nouvelles : la liste complète n'a pas pu être comptée depuis cet écran."
                      : undefined
                  }
                >
                  {" "}
                  · {pendingRecs}
                  {recsPage.truncated ? "+" : ""}
                </span>
              )}
            </Link>
          </div>
        </div>

        {anomaliesFailed ? (
          <Card tone="danger">
            <p className="text-sm text-danger">
              Impossible de charger les anomalies pour le moment. Réessayez dans
              quelques instants.
            </p>
          </Card>
        ) : anomalies.length === 0 ? (
          <EmptyState>
            Aucune anomalie détectée (ou pas encore assez de données pour une
            détection fiable).
          </EmptyState>
        ) : (
          <>
            <ul className="grid gap-3 lg:grid-cols-3">
              {anomalies.slice(0, 3).map((anomaly, i) => (
                <li key={i}>
                  <AnomalyCard anomaly={anomaly} currency={currency} enterDelay={`${0.1 + i * 0.04}s`} />
                </li>
              ))}
            </ul>
            {anomalies.length > 3 && (
              <p className="mt-3 text-xs text-foreground-muted">
                <span className="font-mono">{anomalies.length - 3}</span> autre(s)
                écart(s) détecté(s).{" "}
                <Link
                  href={`/entreprises/${id}/alertes`}
                  className="text-accent hover:underline"
                >
                  Tout voir dans les alertes
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      {kpis.quarantined_count > 0 && (
        <p className="mt-6 text-xs text-foreground-muted">
          <span className="font-mono">{kpis.quarantined_count}</span> ligne(s) en
          attente de vérification, exclue(s) de ces calculs.{" "}
          <Link href={`/entreprises/${id}/imports`} className="text-accent hover:underline">
            Voir les imports
          </Link>
        </p>
      )}
    </div>
  );
}
