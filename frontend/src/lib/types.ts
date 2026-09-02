export type CompanyOption = {
  value: string;
  label: string;
};

export type CompanyOptions = {
  objectives: CompanyOption[];
  revenue_ranges: string[];
  currencies: string[];
};

export type Import = {
  id: string;
  company_id: string;
  source_type: string;
  profile: string;
  file_name: string;
  uploaded_at: string;
  status: string;
  quality_score: number | null;
  rows_processed: number;
  rows_quarantined: number;
  error_message: string | null;
};

export type Transaction = {
  id: string;
  company_id: string;
  import_id: string;
  date: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  status: string;
  quarantine_reasons: string[] | null;
  /** Valeurs brutes des colonnes du fichier source pour cette ligne, telles
   * que lues avant normalisation — la preuve derrière `quarantine_reasons`. */
  raw_data: Record<string, string | null> | null;
};

export type CompanyKpis = {
  revenue_total: number;
  expenses_total: number;
  net_result: number;
  /** Marge nette en pourcentage, calculée et arrondie (1 décimale) par le
   * backend — à afficher telle quelle, jamais recalculée côté frontend
   * (spec §64.29). `null` quand il n'y a aucun revenu sur la période : une
   * marge n'a alors pas de sens, et surtout pas la valeur 0. */
  net_margin_pct: number | null;
  transactions_count: number;
  average_sale: number | null;
  quarantined_count: number;
  period_start: string | null;
  period_end: string | null;
};

export type Anomaly = {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  category: string | null;
  transaction_id: string | null;
  detected_at: string | null;

  /** « Quoi / Pourquoi / Impact / Action » — `message` porte le quoi. */
  why: string | null;
  /** Écart chiffré imputable à l'anomalie (positif = surcoût/hausse). */
  impact_amount: number | null;
  action: string | null;
};

export type AlertLevel =
  | "critique"
  | "important"
  | "surveillance"
  | "opportunite"
  | "information";

export type Alert = {
  level: AlertLevel;
  title: string;
  message: string;
  source: string;
  source_id: string | null;
  category: string | null;
  /** Quoi/Pourquoi/Impact/Action — non `null` pour une alerte venant d'une
   * anomalie, `null` pour une alerte venant d'un import (son `message` porte
   * déjà tout le raisonnement disponible pour cette source). */
  why: string | null;
  impact_amount: number | null;
  action: string | null;
};

export type AlertSummaryItem = {
  level: AlertLevel;
  count: number;
};

export type RecommendationStatus = "nouvelle" | "acceptee" | "rejetee";

export type Recommendation = {
  id: string;
  company_id: string;
  type: string;
  category: string | null;
  situation: string;
  analysis: string;
  impact: string;
  action: string;
  priority: "urgente" | "élevée" | "moyenne" | "faible";
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
};

export type Report = {
  id: string;
  company_id: string;
  type: string;
  period: string;
  generated_at: string;
  summary: string;
  content: {
    resume: {
      etat_general: string;
      evenements_importants: string[];
    };
    performance: {
      revenus: number;
      depenses: number;
      resultat_net: number;
      transactions_validees: number;
      panier_moyen: number | null;
    };
    risques: {
      situation: string;
      priority: string;
      analysis: string;
      impact: string;
      action: string;
    }[];
    opportunites: { items: string[]; note: string };
    actualites: { items: string[]; note: string };
    actions: string[];
    automatisations: { items: string[]; note: string };
    anomalies_count: number;
  };
};

export type DailyKpiPoint = {
  date: string;
  net: number;
  revenue: number;
  /** Positif : montant dépensé sur la journée (même convention que `expenses_total`). */
  expenses: number;
};

export type KpiComparison = {
  current: CompanyKpis;
  /** null en vue « tout l'historique » : aucune période précédente comparable. */
  previous: CompanyKpis | null;
};

export type VarianceContributor = {
  category: string;
  current: number;
  previous: number;
  delta: number;
  /** Part du mouvement total. Peut dépasser 100 % ou être négative quand des
   * catégories se compensent — c'est l'information utile, pas une erreur. */
  share_of_change_pct: number;
};

export type KpiVariance = {
  metric: "revenue" | "expenses";
  current: number;
  previous: number;
  delta: number;
  delta_pct: number | null;
  contributors: VarianceContributor[];
};

export type HealthDimension = {
  key: string;
  label: string;
  score: number;
  explanation: string;
};

export type HealthStatus = "excellent" | "sain" | "stable" | "vigilance" | "risque" | "critique";

export type HealthScore = {
  score: number;
  label: string;
  status: HealthStatus;
  summary: string;
  improving_count: number;
  watch_count: number;
  dimensions: HealthDimension[];
};

export type CategoryBreakdownItem = {
  category: string;
  total: number;
};

export type Company = {
  id: string;
  name: string;
  sector: string;
  location: string;
  employees: number;
  business_model: string | null;
  products: string | null;
  services: string | null;
  customers: string | null;
  suppliers: string | null;
  revenue_range: string | null;
  tools_used: string | null;
  objectives: string[] | null;
  /** Code ISO 4217 (spec §64.3) — à passer à `formatCurrency`, jamais à
   * recalculer ou deviner côté écran. */
  currency: string;
  created_at: string;
  updated_at: string;

  /** Seuils de pilotage réglables dans l'écran Paramètres. */
  target_margin_pct: number;
  revenue_target: number | null;
  expense_budget: number | null;
  health_healthy_threshold: number;
};
