export type CompanyOption = {
  value: string;
  label: string;
};

export type CompanyOptions = {
  objectives: CompanyOption[];
  revenue_ranges: string[];
};

export type Import = {
  id: string;
  company_id: string;
  source_type: string;
  file_name: string;
  uploaded_at: string;
  status: string;
  quality_score: number | null;
  rows_processed: number;
  rows_quarantined: number;
  error_message: string | null;
};

export type CompanyKpis = {
  revenue_total: number;
  expenses_total: number;
  net_result: number;
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
    risques: { situation: string; priority: string }[];
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
  created_at: string;
  updated_at: string;
};
