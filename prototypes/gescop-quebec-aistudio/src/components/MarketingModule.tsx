import React from 'react';
import { 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  AlertCircle, 
  ArrowRight,
  MousePointerClick,
  Sparkles
} from 'lucide-react';
import { MarketingMetrics } from '../types';
import { formatCad } from '../utils/formatters';

interface MarketingModuleProps {
  marketing: MarketingMetrics;
  onNavigateToDecisions?: () => void;
}

export const MarketingModule: React.FC<MarketingModuleProps> = ({
  marketing,
  onNavigateToDecisions
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Module Commercial & Marketing (PlanMarketing.ai / PersonaLab)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilotage de l'acquisition client, rentabilité des campagnes publicitaires et diagnostic de conversion.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
          <span>Ratio LTV / CAC :</span>
          <span className="text-emerald-400 font-bold">{marketing.ltvCacRatio}x</span>
          <span className="text-slate-500">(Cible &gt; 3.0x)</span>
        </div>
      </div>

      {/* KPI Funnel & Unit Economics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Visitors */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-blue-400" />
            Visiteurs mensuels
          </div>
          <div className="text-2xl font-bold text-white">
            {marketing.monthlyVisitors.toLocaleString('fr-CA')}
          </div>
          <div className="text-xs text-slate-400">
            Taux de rebond : <span className="text-slate-200">42%</span>
          </div>
        </div>

        {/* Taux de conversion */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
            Taux de conversion e-commerce
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {marketing.conversionRate} %
          </div>
          <div className="text-xs text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>-0.45 pt (Baisse constatée)</span>
          </div>
        </div>

        {/* Panier Moyen */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Panier moyen (AOV)
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCad(marketing.averageOrderValue, true)}
          </div>
          <div className="text-xs text-emerald-400">
            +12.40 $ vs l’an dernier
          </div>
        </div>

        {/* CAC Réel vs Cible */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Coût d’Acquisition (CAC)
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {formatCad(marketing.cac, true)}
          </div>
          <div className="text-xs text-slate-400">
            Cible maximale : <span className="text-slate-200">{formatCad(marketing.targetCac)}</span>
          </div>
        </div>
      </div>

      {/* Cross-functional Diagnostic Card (Example from Gescop Specs) */}
      <div className="bg-gradient-to-r from-amber-950/20 via-slate-900 to-rose-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Diagnostic Croisé Gescop : Chute de Rentabilité Marketing
            </h4>
          </div>
          <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            Corrélation Marketing ↔ Stocks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold">1. Signal amont</div>
            <div className="font-semibold text-rose-300 mt-1">CPA Meta en hausse (+59%)</div>
            <p className="text-slate-400 text-[11px] mt-1">
              Les publicités continuent de tourner à plein régime sur l'ensemble du catalogue.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold">2. Point de friction</div>
            <div className="font-semibold text-amber-300 mt-1">Taux de conversion en baisse</div>
            <p className="text-slate-400 text-[11px] mt-1">
              Les prospects visitent les fiches produits mais quittent sans finaliser le panier d'achat.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase font-bold">3. Cause réelle (Inventaire)</div>
            <div className="font-semibold text-cyan-300 mt-1">Rupture des tailles M et L</div>
            <p className="text-slate-400 text-[11px] mt-1">
              StockSentinel détecte seulement 4 manteaux restants (tailles XL/XS), rejetant 70% de la demande.
            </p>
          </div>

          <div className="bg-blue-950/40 p-3 rounded-lg border border-blue-800/50 flex flex-col justify-between">
            <div>
              <div className="text-blue-300 text-[10px] uppercase font-bold">4. Action préconisée</div>
              <div className="font-semibold text-white mt-1">Réallouer 4 000 $ CAD</div>
              <p className="text-slate-300 text-[11px] mt-1">
                Vers Google Ads (produits en stock) et suspendre les adsets des manteaux épuisés.
              </p>
            </div>
            {onNavigateToDecisions && (
              <button
                onClick={onNavigateToDecisions}
                className="mt-2 text-xs text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Décider maintenant</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white">
              Performance des Campagnes Publicitaires Actives
            </h4>
            <p className="text-xs text-slate-400">
              Évaluation du coût par acquisition (CPA) par canal d'acquisition
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Dépenses totales : <span className="font-mono text-white font-bold">{formatCad(marketing.marketingSpend)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2.5">Campagne</th>
                <th className="pb-2.5">Canal</th>
                <th className="pb-2.5 text-right">Dépenses engagées</th>
                <th className="pb-2.5 text-right">Conversions</th>
                <th className="pb-2.5 text-right">CPA Réel</th>
                <th className="pb-2.5 text-center">Diagnostic Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {marketing.campaigns.map((camp, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-medium text-slate-200">
                    {camp.name}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                      {camp.channel}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-300">
                    {formatCad(camp.spend)}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-300">
                    {camp.conversions}
                  </td>
                  <td className={`py-3 text-right font-mono font-bold ${
                    camp.cpa > 30 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {formatCad(camp.cpa, true)}
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      camp.status === 'optimal'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {camp.status === 'optimal' ? 'Rentable' : 'À réajuster'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
