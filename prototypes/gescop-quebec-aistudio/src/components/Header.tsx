import React from 'react';
import { 
  Building2, 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  ChevronDown,
  Percent,
  Layers
} from 'lucide-react';
import { CompanyProfile } from '../types';

interface HeaderProps {
  currentCompany: CompanyProfile;
  companyKeys: string[];
  selectedKey: string;
  onSelectCompany: (key: string) => void;
  onOpenAiAdvisor: () => void;
  onSyncConnectors: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentCompany,
  companyKeys,
  selectedKey,
  onSelectCompany,
  onOpenAiAdvisor,
  onSyncConnectors,
  isSyncing
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#090e17]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner: Quebec Contextual Economic Ticker */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border-b border-slate-800/80 px-4 py-1.5 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ⚜️ Québec · Canada
            </span>
            <span className="text-slate-400 hidden sm:inline">Repères de gestion PME :</span>
          </div>

          <div className="flex items-center flex-wrap gap-4 text-[11px]">
            <div className="flex items-center gap-1.5" title="Taux directeur cible de la Banque du Canada">
              <span className="text-slate-400">Taux BDC :</span>
              <span className="font-semibold text-emerald-400">2,75 %</span>
            </div>
            <div className="flex items-center gap-1.5" title="Indice des prix à la consommation (IPC) au Québec">
              <span className="text-slate-400">IPC Québec :</span>
              <span className="font-semibold text-cyan-300">2,3 %</span>
            </div>
            <div className="flex items-center gap-1.5" title="Régime fiscal combiné TPS (5%) + TVQ (9.975%)">
              <span className="text-slate-400">Taxes combinées :</span>
              <span className="font-semibold text-slate-200">14,975 %</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Conforme Loi 25 QC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Layers className="w-5 h-5 text-white" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-900 border border-blue-300 text-[8px] font-bold text-cyan-200">
              QC
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                GESCOP
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium border border-blue-500/20">
                  Gouvernance PME
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Couche intelligente de pilotage, décisions & mesure de résultats
            </p>
          </div>
        </div>

        {/* Company Selector & Actions */}
        <div className="flex items-center gap-3">
          {/* Company Switcher dropdown */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm transition">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs text-slate-400 font-normal">Entreprise active</div>
                <select
                  aria-label="Sélectionner l'entreprise québécoise active"
                  value={selectedKey}
                  onChange={(e) => onSelectCompany(e.target.value)}
                  className="bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer pr-5"
                >
                  <option value="boutique-boreale" className="bg-slate-900 text-white">
                    Boutique Boréale Inc. (Montréal - Détail & Web)
                  </option>
                  <option value="microbrasserie-fjord" className="bg-slate-900 text-white">
                    Microbrasserie du Fjord (Saguenay - Agroalimentaire)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Sync Button */}
          <button
            onClick={onSyncConnectors}
            disabled={isSyncing}
            title="Synchroniser les connecteurs (Acomba, Lightspeed, Shopify)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchro flux QC'}</span>
          </button>

          {/* AI Strategic Advisor Button */}
          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/25 border border-blue-400/40 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="hidden md:inline">Diagnostic IA Gescop</span>
            <span className="md:hidden">IA</span>
          </button>
        </div>
      </div>
    </header>
  );
};
