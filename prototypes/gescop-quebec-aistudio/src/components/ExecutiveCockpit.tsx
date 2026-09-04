import React from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Lightbulb, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  Layers, 
  Clock, 
  ChevronRight,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { 
  AnomalyItem, 
  DiagnosticItem, 
  RecommendationItem, 
  ActionTask, 
  FinancialMetrics, 
  MarketingMetrics, 
  InventoryItem 
} from '../types';
import { formatCad, formatPercentPlain } from '../utils/formatters';

interface ExecutiveCockpitProps {
  financials: FinancialMetrics;
  marketing: MarketingMetrics;
  inventory: InventoryItem[];
  anomalies: AnomalyItem[];
  diagnostics: DiagnosticItem[];
  recommendations: RecommendationItem[];
  recentActions: ActionTask[];
  onSelectRecommendation: (recId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const ExecutiveCockpit: React.FC<ExecutiveCockpitProps> = ({
  financials,
  marketing,
  inventory,
  anomalies,
  diagnostics,
  recommendations,
  recentActions,
  onSelectRecommendation,
  onNavigateToTab
}) => {
  // Count out of stock risks
  const criticalStockCount = inventory.filter(i => i.status === 'rupture_imminente').length;
  const pendingRecommendations = recommendations.filter(r => r.status === 'en_attente');

  return (
    <div className="space-y-6">
      {/* Introduction banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            Cockpit Exécutif Gescop — Boucle de Pilotage Vivante
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Centre de décision transversale en 5 zones : de la détection de l'écart jusqu'à la vérification du résultat mesuré.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Dernière réévaluation : à l’instant</span>
        </div>
      </div>

      {/* ZONE 1: Santé & Signaux Vitaux Express */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Zone 1 · Signaux Vitaux & Cap Stratégique
          </span>
          <button 
            onClick={() => onNavigateToTab('finance')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            Détails financiers <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Revenue */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-[11px] text-slate-400">Chiffre d’affaires mensuel</div>
            <div className="text-xl font-bold text-white mt-1">
              {formatCad(financials.monthlyRevenue)}
            </div>
            <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3" />
              <span>-4.5% vs budget ({formatCad(financials.budgetRevenue)})</span>
            </div>
          </div>

          {/* Marge Brute */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-[11px] text-slate-400">Marge brute</div>
            <div className="text-xl font-bold text-white mt-1">
              {financials.grossMarginPct.toFixed(1)} %
            </div>
            <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Cible québécoise : {financials.targetGrossMarginPct.toFixed(1)} %</span>
            </div>
          </div>

          {/* Trésorerie & Runway */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-[11px] text-slate-400">Trésorerie disponible</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {formatCad(financials.cashOnHand)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Runway : <span className="text-slate-200 font-medium">{financials.runwayMonths} mois</span>
            </div>
          </div>

          {/* CAC vs LTV */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-[11px] text-slate-400">Coût d’Acquisition (CAC)</div>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {formatCad(marketing.cac, true)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              LTV : <span className="text-slate-200 font-medium">{formatCad(marketing.ltv)}</span> (Ratio {marketing.ltvCacRatio}x)
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Zone 2 (Ce qui change) & Zone 3 (Pourquoi / Diagnostic) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ZONE 2: Ce qui change (Anomalies détectées) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h4 className="text-sm font-bold text-white">Zone 2 · Ce qui change</h4>
              <span className="text-xs text-slate-400">({anomalies.length} signaux actifs)</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-medium border border-rose-500/20">
              Anomaly Engine
            </span>
          </div>

          <div className="space-y-3">
            {anomalies.map((ano) => (
              <div 
                key={ano.id}
                className={`p-3.5 rounded-xl border transition ${
                  ano.severity === 'critique' 
                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50' 
                    : ano.severity === 'important'
                    ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-slate-800/40 border-slate-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      ano.severity === 'critique' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                    }`} />
                    <span className="text-xs font-bold text-slate-200">{ano.title}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {ano.domain}
                  </span>
                </div>

                <div className="mt-2 text-xs font-mono text-cyan-300 bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800">
                  {ano.metricObserved}
                </div>

                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {ano.impactSummary}
                </p>

                <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Détecté : {ano.detectedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ZONE 3: Pourquoi (Diagnostics transversaux) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h4 className="text-sm font-bold text-white">Zone 3 · Pourquoi (Diagnostic Transversal)</h4>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/20">
              Diagnostic Engine
            </span>
          </div>

          <div className="space-y-3.5">
            {diagnostics.map((diag) => (
              <div 
                key={diag.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Diagnostic lié ({diag.domain})
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Priorité : <span className="text-amber-400 font-bold">{diag.calculatedPriority}/100</span>
                  </span>
                </div>

                {/* Fact -> Correlation -> Hypothesis */}
                <div className="space-y-1.5 text-xs">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 font-medium">1. Fait mesuré : </span>
                    <span className="text-slate-200">{diag.factObserved}</span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 font-medium">2. Corrélation : </span>
                    <span className="text-slate-200">{diag.correlation}</span>
                  </div>

                  <div className="bg-blue-950/30 p-2.5 rounded border border-blue-800/40">
                    <span className="text-blue-300 font-bold">3. Cause racine (Hypothèse) : </span>
                    <span className="text-slate-100">{diag.rootHypothesis}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Impact économique estimé :</span>
                  <span className="font-bold text-rose-400">{diag.estimatedFinancialImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ZONE 4: Que faire (Recommandations avec Arbitrage Humain) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Zone 4 · Que faire (Recommandations Gescop)</h4>
              <p className="text-xs text-slate-400">
                Options d'arbitrage structurées prêtes pour la décision du gestionnaire
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('decisions')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <span>Ouvrir le Centre de Décision ({pendingRecommendations.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.slice(0, 3).map((rec) => (
            <div 
              key={rec.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                rec.status === 'en_attente' 
                  ? 'bg-slate-800/60 border-slate-700 hover:border-blue-500/50' 
                  : 'bg-slate-900/40 border-slate-800 opacity-80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {rec.domain}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    rec.urgency === 'Critique' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {rec.urgency}
                  </span>
                </div>

                <h5 className="text-sm font-bold text-white leading-snug">
                  {rec.title}
                </h5>

                <p className="text-xs text-slate-400 line-clamp-3">
                  {rec.suggestedAction}
                </p>

                <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gain financier estimé :</span>
                    <span className="font-bold text-emerald-400">+{formatCad(rec.estimatedFinancialGain)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Délai cible :</span>
                    <span className="text-slate-200">{rec.deadlineDays} jours</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Responsable :</span>
                    <span className="text-slate-200">{rec.requiredRole}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                {rec.status === 'en_attente' ? (
                  <button
                    onClick={() => onSelectRecommendation(rec.id)}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <span>Arbitrer cette décision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-full py-1.5 text-center text-xs text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Décision {rec.status}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ZONE 5: Résultats mesurés récents (Boucle fermée par l'Outcome Engine) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h4 className="text-sm font-bold text-white">Zone 5 · Résultats Mesurés (Fermeture de boucle)</h4>
          </div>
          <button
            onClick={() => onNavigateToTab('actions')}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            Registre complet des résultats <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentActions.map((act) => (
            <div 
              key={act.id}
              className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{act.title}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Objectif Atteint
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Attendu</div>
                  <div className="text-slate-300 mt-0.5">{act.expectedResult}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">Réel mesuré</div>
                  <div className="text-emerald-300 font-medium mt-0.5">{act.actualResult}</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Responsable : {act.assignedTo}</span>
                <span>Mesuré le : {act.measuredAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
