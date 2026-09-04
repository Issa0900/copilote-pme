export type DomainType = 'Finance' | 'Marketing' | 'Opérations' | 'Gouvernance' | 'RH';
export type SeverityLevel = 'normal' | 'a_surveiller' | 'important' | 'critique';
export type UrgencyLevel = 'Critique' | 'Haute' | 'Moyenne' | 'Faible';
export type DecisionStatus = 'en_attente' | 'validee' | 'modifiee' | 'rejetee';
export type ActionStatus = 'a_faire' | 'en_cours' | 'termine' | 'en_mesure';
export type OutcomeStatus = 'en_attente' | 'atteint' | 'partiel' | 'echec';

export interface CompanyProfile {
  id: string;
  name: string;
  neq: string; // Numéro d'entreprise du Québec
  city: string;
  region: string;
  sector: string;
  employeeCount: number;
  connectors: string[];
  foundedYear: number;
}

export interface HealthScoreBreakdown {
  overall: number; // 0-100
  finance: number;
  marketing: number;
  operations: number;
  governance: number;
  trend: 'hausse' | 'stable' | 'baisse';
  changePoints: number;
}

export interface FinancialMetrics {
  monthlyRevenue: number;
  budgetRevenue: number;
  cogs: number; // Coût des marchandises vendues
  grossMarginPct: number;
  targetGrossMarginPct: number;
  netMarginPct: number;
  cashOnHand: number;
  burnRate: number;
  runwayMonths: number;
  payrollMonthly: number;
  tpsPayable: number; // TPS 5%
  tvqPayable: number; // TVQ 9.975%
}

export interface BudgetItem {
  id: string;
  category: string;
  domain: DomainType;
  budgetAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePct: number;
  status: 'favorable' | 'defavorable' | 'alerte';
  explanation: string;
}

export interface MarketingMetrics {
  monthlyVisitors: number;
  leads: number;
  customersAcquired: number;
  conversionRate: number;
  averageOrderValue: number;
  cac: number; // Coût d'acquisition client
  targetCac: number;
  ltv: number; // Customer Lifetime Value
  ltvCacRatio: number;
  marketingSpend: number;
  marketingBudget: number;
  campaigns: {
    name: string;
    channel: 'Meta Ads' | 'Google Search' | 'Influenceurs QC' | 'Infolettre';
    spend: number;
    conversions: number;
    cpa: number;
    status: 'optimal' | 'sous_performant' | 'a_reajuster';
  }[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  classificationABC: 'A' | 'B' | 'C';
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  unitCost: number;
  sellingPrice: number;
  leadTimeDays: number;
  status: 'optimal' | 'reappro' | 'rupture_imminente';
}

export interface AnomalyItem {
  id: string;
  title: string;
  domain: DomainType;
  severity: SeverityLevel;
  detectedAt: string;
  metricObserved: string;
  impactSummary: string;
}

export interface DiagnosticItem {
  id: string;
  anomalyId: string;
  domain: DomainType;
  factObserved: string;
  correlation: string;
  rootHypothesis: string;
  estimatedFinancialImpact: string;
  calculatedPriority: number; // Impact x Urgence x Probabilité (ex: 88/100)
}

export interface RecommendationItem {
  id: string;
  diagnosticId: string;
  domain: DomainType;
  title: string;
  problem: string;
  rationale: string;
  suggestedAction: string;
  estimatedFinancialGain: number; // $ CAD
  requiredRole: string;
  urgency: UrgencyLevel;
  deadlineDays: number;
  status: DecisionStatus;
}

export interface DecisionRecord {
  id: string;
  recommendationId: string;
  title: string;
  decision: 'APPROUVÉE' | 'MODIFIÉE' | 'REJETÉE' | 'REPORTÉE';
  decidedBy: string;
  role: string;
  decidedAt: string;
  rationale: string;
  actionSummary: string;
  targetMetric: string;
  expectedOutcome: string;
  actionId?: string;
}

export interface ActionTask {
  id: string;
  decisionId: string;
  title: string;
  domain: DomainType;
  assignedTo: string;
  dueDate: string;
  status: ActionStatus;
  expectedResult: string;
  costEstimate: number;
  actualResult?: string;
  outcomeStatus: OutcomeStatus;
  outcomeNotes?: string;
  measuredAt?: string;
}

export interface DataConnector {
  id: string;
  name: string;
  category: 'Comptabilité' | 'Point de Vente' | 'Commerce Électronique' | 'Marketing';
  logoType: 'acomba' | 'lightspeed' | 'shopify' | 'quickbooks' | 'square';
  status: 'connecte' | 'synchronise' | 'inactif';
  lastSync: string;
  itemsProcessed: number;
  description: string;
}
