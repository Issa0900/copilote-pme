import React from 'react';
import { 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  MapPin,
  Hash,
  Scale
} from 'lucide-react';
import { CompanyProfile, HealthScoreBreakdown } from '../types';

interface HealthScoreHeroProps {
  profile: CompanyProfile;
  health: HealthScoreBreakdown;
  criticalAnomalyCount: number;
  pendingDecisionCount: number;
  onNavigateToDecisions: () => void;
  onNavigateToCockpit: () => void;
}

export const HealthScoreHero: React.FC<HealthScoreHeroProps> = ({
  profile,
  health,
  criticalAnomalyCount,
  pendingDecisionCount,
  onNavigateToDecisions,
  onNavigateToCockpit
}) => {
  // Score color calculation
  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (val >= 65) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  const getScoreBarBg = (val: number) => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 65) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-[#0d1525] to-[#0c121e] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left column: Company info & Quick Status */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-medium border border-blue-500/30 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {profile.city} ({profile.region})
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <Hash className="w-3 h-3 text-slate-500" />
              NEQ : <span className="font-mono text-slate-300">{profile.neq}</span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{profile.sector}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">{profile.employeeCount} employés</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {profile.name}
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Boucle décisionnelle active : les données des ventes, achats et trésorerie sont analysées en temps réel selon les repères économiques du Québec.
          </p>

          {/* Quick interactive alerts summary */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {criticalAnomalyCount > 0 ? (
              <button
                onClick={onNavigateToCockpit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{criticalAnomalyCount} anomalie{criticalAnomalyCount > 1 ? 's' : ''} critique{criticalAnomalyCount > 1 ? 's' : ''} détectée{criticalAnomalyCount > 1 ? 's' : ''}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aucune anomalie bloquante</span>
              </span>
            )}

            {pendingDecisionCount > 0 && (
              <button
                onClick={onNavigateToDecisions}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>{pendingDecisionCount} décision{pendingDecisionCount > 1 ? 's' : ''} humaine{pendingDecisionCount > 1 ? 's' : ''} requise{pendingDecisionCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right column: The PME Health Score & Breakdown */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 shrink-0">
          {/* Main Dial */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              Score Santé PME
            </div>
            <div className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center ${getScoreColor(health.overall)} shadow-lg`}>
              <span className="text-3xl font-extrabold tracking-tight">
                {health.overall}
              </span>
              <span className="text-[10px] opacity-70 font-medium -mt-1">/ 100</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px]">
              {health.trend === 'baisse' ? (
                <span className="text-rose-400 flex items-center gap-0.5 font-medium">
                  <TrendingDown className="w-3 h-3" /> {health.changePoints} pts (30 j)
                </span>
              ) : health.trend === 'hausse' ? (
                <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                  <TrendingUp className="w-3 h-3" /> +{health.changePoints} pts (30 j)
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Stable</span>
              )}
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="w-full sm:w-56 space-y-2.5 text-xs">
            {/* Finance */}
            <div>
              <div className="flex justify-between items-center mb-1 text-slate-300">
                <span className="text-slate-400">Finance & Trésorerie</span>
                <span className="font-semibold">{health.finance}/100</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${getScoreBarBg(health.finance)} transition-all duration-500`}
                  style={{ width: `${health.finance}%` }}
                />
              </div>
            </div>

            {/* Marketing */}
            <div>
              <div className="flex justify-between items-center mb-1 text-slate-300">
                <span className="text-slate-400">Commercial & Ventes</span>
                <span className="font-semibold">{health.marketing}/100</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${getScoreBarBg(health.marketing)} transition-all duration-500`}
                  style={{ width: `${health.marketing}%` }}
                />
              </div>
            </div>

            {/* Operations */}
            <div>
              <div className="flex justify-between items-center mb-1 text-slate-300">
                <span className="text-slate-400">Opérations & Stocks</span>
                <span className="font-semibold">{health.operations}/100</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${getScoreBarBg(health.operations)} transition-all duration-500`}
                  style={{ width: `${health.operations}%` }}
                />
              </div>
            </div>

            {/* Governance */}
            <div>
              <div className="flex justify-between items-center mb-1 text-slate-300">
                <span className="text-slate-400">Gouvernance & Clôture</span>
                <span className="font-semibold">{health.governance}/100</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full ${getScoreBarBg(health.governance)} transition-all duration-500`}
                  style={{ width: `${health.governance}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
