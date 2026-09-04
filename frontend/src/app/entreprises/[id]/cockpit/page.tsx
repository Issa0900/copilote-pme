// Cockpit décisionnel — la boucle Détecter → Comprendre → Décider → Agir →
// Mesurer (spec §64.27) sur un seul écran.
//
// Le tableau de bord répond à « où j'en suis » ; ce cockpit répond à « qu'est-ce
// qui a bougé, pourquoi, que puis-je décider, et qu'est-ce que mes décisions
// précédentes ont donné ». Les cinq zones ci-dessous sont les cinq maillons de
// cette chaîne, dans l'ordre, et chacune est alimentée par une route réelle :
//
//   1. Signaux vitaux        -> /kpis/comparison  + /health-score
//   2. Ce qui change         -> /anomalies
//   3. Pourquoi              -> /kpis/variance
//   4. Que décider           -> /recommendations  (+ arbitrage en place)
//   5. Ce que ça a donné     -> /actions          (mesure avant/après)
//
// Aucune donnée n'est fabriquée ici, et aucun chiffre n'est recalculé côté
// écran (spec §64.29). Une zone sans donnée le dit ; une zone dont la route
// échoue le dit aussi, distinctement — un échec de chargement ne doit jamais
// se déguiser en « rien à signaler » (spec §64.22).
//
// Ce que ce cockpit ne montre PAS, volontairement : stocks et points de
// commande, entonnoir marketing (CAC, LTV, campagnes), budget vs réel, TPS/TVQ.
// Ces blocs existent dans la maquette d'origine auditée
// (docs/audit-prototype-gescop-quebec.md) mais aucune donnée du produit ne les
// alimente : les afficher supposerait de les inventer. Le pied d'écran l'énonce
// plutôt que de laisser un blanc inexpliqué.
import Link from "next/link";

import { ActionMeasurement } from "@/components/action-measurement";
import { AnomalyCard } from "@/components/anomaly-card";
import {
  ExpenseIcon,
  NetResultIcon,
  RevenueIcon,
} from "@/components/icons";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  SectionHeading,
  StatTile,
  TrustBadge,
  type Tone,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { PAGE_SIZES } from "@/lib/pagination";
import type {
  Action,
  Anomaly,
  Company,
  CompanyKpis,
  HealthScore,
  KpiComparison,
  KpiVariance,
  Recommendation,
} from "@/lib/types";
import { PeriodFilter } from "../period-filter";
import { RecommendationActions } from "../recommandations/recommendation-actions";

const RANGE_DAYS: Record<string, number> = { "7j": 7, "30j": 30, "90j": 90 };

/** Nombre de fiches montrées par zone. Un cockpit qui déverse trente lignes
 * ne fait pas décider : le PRD §47 borne les priorités à trois, on garde la
 * même discipline sur chaque maillon, avec un lien vers l'écran complet. */
const MAX_PER_ZONE = 3;

const PRIORITY_TONE: Record<Recommendation["priority"], Tone> = {
  urgente: "danger",
  "élevée": "warning",
  moyenne: "surveillance",
  faible: "neutral",
};

const STATUS_TONE: Record<HealthScore["status"], Tone> = {
  excellent: "success",
  sain: "success",
  stable: "info",
  vigilance: "surveillance",
  risque: "warning",
  critique: "danger",
};

const STATUS_LABELS: Record<HealthScore["status"], string> = {
  excellent: "Excellente",
  sain: "Saine",
  stable: "Stable",
  vigilance: "Vigilance",
  risque: "Risque",
  critique: "Critique",
};

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function computeRange(range: string): { start: string; end: string } | null {
  const days = RANGE_DAYS[range];
  if (!days) return null;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
}

/** Bandeau d'échec d'une zone. Dire « la route n'a pas répondu » plutôt que
 * d'afficher une liste vide, qui affirmerait qu'il n'y a rien à signaler. */
function ZoneError({ what }: { what: string }) {
  return (
    <Card tone="danger">
      <p className="text-sm">
        Impossible de charger {what}. Cet écran ne dit pas qu&apos;il n&apos;y a
        rien à signaler : il n&apos;a pas pu le vérifier.
      </p>
    </Card>
  );
}

/** Zone 3 — l'analyse d'écarts, sous la forme « quelles catégories portent le
 * mouvement ». C'est le seul « pourquoi » que le produit sait établir sur des
 * chiffres : une part de mouvement, pas une cause métier. Le modèle n'a ni
 * fournisseur ni produit, donc on parle de catégories qui portent l'écart,
 * jamais de ce qui l'a provoqué. */
function VarianceBlock({
  variance,
  currency,
  label,
  direction,
}: {
  variance: KpiVariance;
  currency: string;
  label: string;
  /** Sens de lecture : sur les dépenses, une hausse est mauvaise. */
  direction: "up-good" | "up-bad";
}) {
  const rising = variance.delta > 0;
  const good = direction === "up-good" ? rising : !rising;
  const contributors = variance.contributors.slice(0, MAX_PER_ZONE);

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className={`font-mono text-sm ${good ? "text-success" : "text-danger"}`}>
          {variance.delta > 0 ? "+" : ""}
          {formatCurrency(variance.delta, currency)}
          {variance.delta_pct !== null && (
            <span className="ml-1.5 opacity-80">
              ({variance.delta_pct > 0 ? "+" : ""}
              {variance.delta_pct.toFixed(1)} %)
            </span>
          )}
        </span>
      </div>

      {contributors.length === 0 ? (
        <p className="text-xs text-foreground-muted">
          Aucune catégorie ne se détache : le mouvement est réparti.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {contributors.map((c) => (
            <li key={c.category} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="font-medium">{c.category}</span>
              <span className="font-mono opacity-90">
                {c.delta > 0 ? "+" : ""}
                {formatCurrency(c.delta, currency)}
              </span>
              <span className="text-foreground-muted">
                — {c.share_of_change_pct.toFixed(0)} % du mouvement
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function CompanyCockpitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  // Même convention que le tableau de bord : 30 jours par défaut, `tout` pour
  // l'historique complet. Sans plage, l'API ne peut pas calculer de période
  // précédente — l'analyse d'écarts n'est alors pas appelée du tout plutôt que
  // comparée à une période inventée.
  const range =
    rawRange && RANGE_DAYS[rawRange] ? rawRange : rawRange === "tout" ? "tout" : "30j";
  const dateRange = computeRange(range);
  const dateQuery = dateRange
    ? `?start_date=${dateRange.start}&end_date=${dateRange.end}`
    : "";

  const [
    comparisonRes,
    healthRes,
    anomaliesRes,
    recsRes,
    actionsRes,
    companyRes,
    varianceRes,
  ] = await Promise.all([
    apiFetch(`/companies/${id}/kpis/comparison${dateQuery}`),
    apiFetch(`/companies/${id}/health-score${dateQuery}`),
    apiFetch(`/companies/${id}/anomalies${dateQuery}`),
    apiFetch(`/companies/${id}/recommendations?limit=${PAGE_SIZES.recommendations}`),
    apiFetch(`/companies/${id}/actions?limit=${PAGE_SIZES.actions}`),
    apiFetch(`/companies/${id}`),
    dateRange
      ? apiFetch(
          `/companies/${id}/kpis/variance?start_date=${dateRange.start}&end_date=${dateRange.end}`
        )
      : Promise.resolve(null),
  ]);

  const comparison: KpiComparison | null = comparisonRes.ok
    ? await comparisonRes.json()
    : null;
  const kpis: CompanyKpis | null = comparison?.current ?? null;
  const health: HealthScore | null = healthRes.ok ? await healthRes.json() : null;
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  // Devise de l'entreprise (spec §64.3/§64.6) : CAD n'est ici qu'un repli si
  // l'entreprise n'a pas pu être chargée, jamais une devise supposée.
  const currency = company?.currency ?? "CAD";
  const targetMarginPct = company?.target_margin_pct ?? null;

  const anomaliesFailed = !anomaliesRes.ok;
  const anomalies: Anomaly[] = anomaliesRes.ok ? await anomaliesRes.json() : [];
  const recsFailed = !recsRes.ok;
  const recommendations: Recommendation[] = recsRes.ok ? await recsRes.json() : [];
  const actionsFailed = !actionsRes.ok;
  const actions: Action[] = actionsRes.ok ? await actionsRes.json() : [];
  const variances: KpiVariance[] = varianceRes?.ok ? await varianceRes.json() : [];
  const revenueVariance = variances.find((v) => v.metric === "revenue") ?? null;
  const expenseVariance = variances.find((v) => v.metric === "expenses") ?? null;

  const pendingRecs = recommendations.filter((r) => r.status === "nouvelle");
  const measuredActions = actions.filter((a) => a.result_pct !== null);
  // L'axe pertinent dans cette zone est la mesure, pas le statut : une action
  // peut être terminée sans que sa fenêtre de suivi soit écoulée, et une
  // action encore en cours peut déjà être mesurée. Compter « en cours » au
  // sens du statut ferait dire « 1 action encore en cours » juste sous la
  // mesure de cette action-là, comme s'il en existait une autre.
  const awaitingMeasure = actions.filter((a) => a.result_pct === null);
  const severityRank: Record<Anomaly["severity"], number> = { high: 0, medium: 1, low: 2 };
  const topAnomalies = [...anomalies]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, MAX_PER_ZONE);

  if (!kpis || (kpis.transactions_count === 0 && !dateRange)) {
    return (
      <div>
        <PageHeader title="Cockpit décisionnel" />
        <EmptyState>
          <p className="mb-3">
            Aucune donnée validée pour l&apos;instant. La boucle décisionnelle
            part des transactions : sans import, il n&apos;y a rien à détecter.
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
        <PageHeader
          title="Cockpit décisionnel"
          actions={<PeriodFilter active={range} />}
        />
        <EmptyState>
          Aucune transaction validée sur cette période.{" "}
          <Link href={`/entreprises/${id}/cockpit?range=tout`} className="underline">
            Voir tout l&apos;historique
          </Link>
          .
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cockpit décisionnel"
        subtitle="Ce qui a bougé, pourquoi, ce que vous pouvez décider maintenant, et ce que vos décisions précédentes ont produit — sur un seul écran."
        actions={<PeriodFilter active={range} />}
      />

      {/* ---- 1. Signaux vitaux ------------------------------------------ */}
      <section>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="fait" />
            <span className="normal-case tracking-normal">
              1. Signaux vitaux — calculé à partir des données validées
            </span>
          </span>
        </SectionHeading>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Chiffre d'affaires"
            value={formatCurrency(kpis.revenue_total, currency)}
            icon={<RevenueIcon />}
          />
          <StatTile
            label="Dépenses"
            value={formatCurrency(kpis.expenses_total, currency)}
            icon={<ExpenseIcon />}
          />
          <StatTile
            label="Résultat net"
            value={formatCurrency(kpis.net_result, currency)}
            tone={kpis.net_result >= 0 ? "success" : "danger"}
            icon={<NetResultIcon />}
          />
          {/* `net_margin_pct` vaut `null` — et non 0 — quand il n'y a aucun
              revenu sur la période : une marge sans revenu n'existe pas. */}
          <StatTile
            label="Marge nette"
            value={
              kpis.net_margin_pct === null
                ? "—"
                : `${kpis.net_margin_pct.toFixed(1)} %`
            }
            tone={
              kpis.net_margin_pct === null
                ? undefined
                : kpis.net_margin_pct >= 0
                  ? "success"
                  : "danger"
            }
          />
        </div>

        {health && (
          <Card className="mt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-mono text-2xl font-semibold">{health.score}</span>
              <span className="font-mono text-sm text-foreground-muted">/ 100</span>
              <Badge tone={STATUS_TONE[health.status]}>
                {STATUS_LABELS[health.status]}
              </Badge>
              <Link
                href={`/entreprises/${id}?range=${range}`}
                className="ml-auto text-xs text-foreground-muted underline hover:text-foreground"
              >
                Détail des 5 dimensions
              </Link>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{health.summary}</p>
          </Card>
        )}
      </section>

      {/* ---- 2. Ce qui change -------------------------------------------- */}
      <section>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="analyse" />
            <span className="normal-case tracking-normal">
              2. Ce qui change — anomalies détectées sur la période
            </span>
          </span>
        </SectionHeading>

        {anomaliesFailed ? (
          <ZoneError what="les anomalies" />
        ) : topAnomalies.length === 0 ? (
          <EmptyState>
            Aucune anomalie détectée sur cette période.
          </EmptyState>
        ) : (
          <>
            <div className="space-y-3">
              {topAnomalies.map((anomaly, i) => (
                <AnomalyCard
                  key={`${anomaly.type}-${anomaly.category ?? "global"}-${i}`}
                  anomaly={anomaly}
                  currency={currency}
                />
              ))}
            </div>
            {anomalies.length > topAnomalies.length && (
              <p className="mt-2 text-xs text-foreground-muted">
                {anomalies.length - topAnomalies.length} autre
                {anomalies.length - topAnomalies.length > 1 ? "s" : ""} signal
                {anomalies.length - topAnomalies.length > 1 ? "aux" : ""} sur{" "}
                <Link href={`/entreprises/${id}/alertes`} className="underline">
                  l&apos;écran Alertes
                </Link>
                .
              </p>
            )}
          </>
        )}
      </section>

      {/* ---- 3. Pourquoi -------------------------------------------------- */}
      <section>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="analyse" />
            <span className="normal-case tracking-normal">
              3. Pourquoi — quelles catégories portent le mouvement
            </span>
          </span>
        </SectionHeading>

        {!dateRange ? (
          <EmptyState>
            L&apos;analyse d&apos;écarts compare deux périodes de même durée.
            Choisissez 7, 30 ou 90 jours pour la voir.
          </EmptyState>
        ) : !varianceRes?.ok ? (
          <ZoneError what="l'analyse d'écarts" />
        ) : !revenueVariance && !expenseVariance ? (
          <EmptyState>Pas de période précédente comparable.</EmptyState>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {revenueVariance && (
                <VarianceBlock
                  variance={revenueVariance}
                  currency={currency}
                  label="Chiffre d'affaires"
                  direction="up-good"
                />
              )}
              {expenseVariance && (
                <VarianceBlock
                  variance={expenseVariance}
                  currency={currency}
                  label="Dépenses"
                  direction="up-bad"
                />
              )}
            </div>
            {/* Une part de mouvement peut dépasser 100 % ou être négative quand
                des catégories se compensent : c'est l'information utile (« la
                hausse est masquée par une baisse ailleurs »), pas une erreur
                d'arrondi. Le dire, sinon le lecteur croit à un bug. */}
            <p className="mt-2 text-xs text-foreground-muted">
              Une part supérieure à 100 % ou négative signifie que des catégories
              se compensent : la hausse de l&apos;une est masquée par la baisse
              d&apos;une autre. Ces catégories portent l&apos;écart — elles ne
              l&apos;expliquent pas : le produit ne relie pas encore une
              transaction à un fournisseur ou à un produit.
            </p>
          </>
        )}
      </section>

      {/* ---- 4. Que décider ----------------------------------------------- */}
      <section>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="recommandation" />
            <span className="normal-case tracking-normal">
              4. Que décider — arbitrage en attente
            </span>
          </span>
        </SectionHeading>

        {recsFailed ? (
          <ZoneError what="les recommandations" />
        ) : pendingRecs.length === 0 ? (
          <EmptyState>
            Aucune recommandation en attente d&apos;arbitrage.
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-3">
              {pendingRecs.slice(0, MAX_PER_ZONE).map((rec) => (
                <li key={rec.id}>
                  <Card tone={PRIORITY_TONE[rec.priority]}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone={PRIORITY_TONE[rec.priority]}>
                        Priorité {rec.priority}
                      </Badge>
                      {rec.category && <Badge tone="neutral">{rec.category}</Badge>}
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
                    <p className="mb-3 text-sm opacity-90">
                      <span className="font-medium">Action — </span>
                      {rec.action}
                    </p>
                    <RecommendationActions companyId={id} recommendationId={rec.id} />
                  </Card>
                </li>
              ))}
            </ul>
            {pendingRecs.length > MAX_PER_ZONE && (
              <p className="mt-2 text-xs text-foreground-muted">
                {pendingRecs.length - MAX_PER_ZONE} autre
                {pendingRecs.length - MAX_PER_ZONE > 1 ? "s" : ""} en attente sur{" "}
                <Link href={`/entreprises/${id}/recommandations`} className="underline">
                  l&apos;écran Recommandations
                </Link>
                .
              </p>
            )}
          </>
        )}
      </section>

      {/* ---- 5. Ce que ça a donné ----------------------------------------- */}
      <section>
        <SectionHeading>
          <span className="flex flex-wrap items-center gap-2">
            <TrustBadge level="fait" />
            <span className="normal-case tracking-normal">
              5. Ce que ça a donné — mesure avant/après des actions
            </span>
          </span>
        </SectionHeading>

        {actionsFailed ? (
          <ZoneError what="les actions" />
        ) : actions.length === 0 ? (
          <EmptyState>
            Aucune action lancée. Une recommandation arbitrée ci-dessus devient
            une action suivie et mesurée.
          </EmptyState>
        ) : measuredActions.length === 0 ? (
          <EmptyState>
            {awaitingMeasure.length} action{awaitingMeasure.length > 1 ? "s" : ""}{" "}
            lancée{awaitingMeasure.length > 1 ? "s" : ""}, aucune mesurée pour
            l&apos;instant : la comparaison avant/après n&apos;est calculée
            qu&apos;une fois la fenêtre de suivi écoulée.
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-3">
              {measuredActions.slice(0, MAX_PER_ZONE).map((action) => (
                <li key={action.id}>
                  <Card>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{action.title}</span>
                      <span className="ml-auto text-xs text-foreground-muted">
                        {action.metric_category
                          ? `Catégorie suivie : ${action.metric_category}`
                          : "Mesure : marge nette"}
                      </span>
                    </div>
                    <ActionMeasurement
                      action={action}
                      currency={currency}
                      targetMarginPct={targetMarginPct}
                    />
                  </Card>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-foreground-muted">
              {awaitingMeasure.length > 0 && (
                <>
                  {awaitingMeasure.length} autre
                  {awaitingMeasure.length > 1 ? "s" : ""} en attente de mesure.{" "}
                </>
              )}
              <Link href={`/entreprises/${id}/actions`} className="underline">
                Centre d&apos;actions
              </Link>
              .
            </p>
          </>
        )}
      </section>

      {/* ---- Ce que cet écran ne montre pas -------------------------------- */}
      <section>
        <Card>
          <SectionHeading>Ce que ce cockpit ne montre pas</SectionHeading>
          <p className="text-sm leading-relaxed opacity-90">
            Pas de stocks ni de points de commande, pas d&apos;entonnoir
            marketing (CAC, LTV, campagnes), pas de comparaison budget/réel, pas
            de provisions TPS/TVQ. Ces blocs n&apos;ont aujourd&apos;hui aucune
            source de données dans le produit : les afficher supposerait de les
            inventer. Ils reviendront quand l&apos;ingestion saura les alimenter.
          </p>
        </Card>
      </section>
    </div>
  );
}
