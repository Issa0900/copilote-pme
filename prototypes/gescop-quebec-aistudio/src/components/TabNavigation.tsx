import React from 'react';
import { 
  LayoutDashboard, 
  DollarSign, 
  Target, 
  Package, 
  Scale, 
  CheckSquare, 
  Database
} from 'lucide-react';

export type TabKey = 'cockpit' | 'finance' | 'marketing' | 'operations' | 'decisions' | 'actions' | 'connectors';

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  pendingDecisionsCount: number;
  actionsInProgressCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  pendingDecisionsCount,
  actionsInProgressCount
}) => {
  const tabs = [
    {
      id: 'cockpit' as TabKey,
      label: 'Cockpit Exécutif',
      subtitle: '5 zones de pilotage',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'finance' as TabKey,
      label: 'Finance & Contrôle',
      subtitle: 'Budgex & TVQ/TPS',
      icon: DollarSign,
      badge: null
    },
    {
      id: 'marketing' as TabKey,
      label: 'Ventes & Marketing',
      subtitle: 'CAC, LTV & Campagnes',
      icon: Target,
      badge: null
    },
    {
      id: 'operations' as TabKey,
      label: 'Opérations & Stocks',
      subtitle: 'StockSentinel & ROP',
      icon: Package,
      badge: null
    },
    {
      id: 'decisions' as TabKey,
      label: 'Centre de Décision',
      subtitle: 'Arbitrage & Registre',
      icon: Scale,
      badge: pendingDecisionsCount > 0 ? pendingDecisionsCount : null,
      badgeColor: 'bg-amber-500 text-black font-bold'
    },
    {
      id: 'actions' as TabKey,
      label: 'Actions & Résultats',
      subtitle: 'Outcome Engine',
      icon: CheckSquare,
      badge: actionsInProgressCount > 0 ? actionsInProgressCount : null,
      badgeColor: 'bg-blue-500 text-white'
    },
    {
      id: 'connectors' as TabKey,
      label: 'Connecteurs QC',
      subtitle: 'Acomba, Lightspeed...',
      icon: Database,
      badge: null
    }
  ];

  return (
    <nav className="border-b border-slate-800 bg-[#090e17] overflow-x-auto py-1">
      <div className="max-w-7xl mx-auto px-4 flex space-x-1 min-w-max">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition relative cursor-pointer ${
                isActive
                  ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                  <span>{t.label}</span>
                  {t.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono leading-none ${t.badgeColor || 'bg-slate-700 text-white'}`}>
                      {t.badge}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {t.subtitle}
                </div>
              </div>

              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
