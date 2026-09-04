import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import { FinancialMetrics, BudgetItem } from '../types';
import { formatCad, formatPercent } from '../utils/formatters';

interface FinanceModuleProps {
  financials: FinancialMetrics;
  budgetItems: BudgetItem[];
  onOpenDecisionForBudgetItem?: (category: string) => void;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  financials,
  budgetItems,
  onOpenDecisionForBudgetItem
}) => {
  const [filterDomain, setFilterDomain] = useState<string>('all');

  // Chart data: Budget vs Real comparison
  const comparisonData = budgetItems.map((item) => ({
    name: item.category.length > 22 ? item.category.slice(0, 20) + '...' : item.category,
    fullName: item.category,
    Budget: item.budgetAmount,
    Réel: item.actualAmount,
    Écart: item.varianceAmount,
    pct: item.variancePct
  }));

  // Cashflow projection data (6 months)
  const cashflowData = [
    { month: 'M-2', Tresorerie: 84000, Entrees: 129000, Sorties: 122000 },
    { month: 'M-1', Tresorerie: 91000, Entrees: 134000, Sorties: 127000 },
    { month: 'Mois Actuel', Tresorerie: financials.cashOnHand, Entrees: financials.monthlyRevenue, Sorties: financials.monthlyRevenue - (financials.monthlyRevenue * (financials.netMarginPct / 100)) },
    { month: 'M+1 (Prév.)', Tresorerie: 98000, Entrees: 142000, Sorties: 130000 },
    { month: 'M+2 (Prév.)', Tresorerie: 104000, Entrees: 148000, Sorties: 133000 },
    { month: 'M+3 (Prév.)', Tresorerie: 112000, Entrees: 155000, Sorties: 136000 },
  ];

  const filteredItems = filterDomain === 'all' 
    ? budgetItems 
    : budgetItems.filter(b => b.domain === filterDomain);

  // Total variance calculation
  const totalBudget = budgetItems.reduce((acc, curr) => acc + curr.budgetAmount, 0);
  const totalActual = budgetItems.reduce((acc, curr) => acc + curr.actualAmount, 0);
  const totalVariance = totalActual - totalBudget;
  const totalVariancePct = (totalVariance / totalBudget) * 100;

  return (
    <div className="space-y-6">
      {/* Header of Finance Module */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Module Finance & Contrôle de Gestion (Budgex PME)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi en dollars canadiens ($ CAD) : budgetisé vs réel, écarts critiques et conformité fiscale Revenu Québec.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
          <span>Taux de marge brute :</span>
          <span className="text-emerald-400 font-bold">{financials.grossMarginPct.toFixed(1)} %</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'Affaires */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Chiffre d’affaires réel</div>
          <div className="text-2xl font-extrabold text-white">
            {formatCad(financials.monthlyRevenue)}
          </div>
          <div className="text-xs flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Budget : {formatCad(financials.budgetRevenue)}</span>
            <span className="text-rose-400 font-medium">-4.5%</span>
          </div>
        </div>

        {/* Marge Nette */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Marge nette d'exploitation</div>
          <div className="text-2xl font-extrabold text-cyan-300">
            {financials.netMarginPct.toFixed(1)} %
          </div>
          <div className="text-xs flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Résultat estimé</span>
            <span className="text-emerald-400 font-medium">
              +{formatCad(financials.monthlyRevenue * (financials.netMarginPct / 100))}
            </span>
          </div>
        </div>

        {/* Trésorerie disponible */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Trésorerie liquide en compte</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {formatCad(financials.cashOnHand)}
          </div>
          <div className="text-xs flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Burn mensuel : {formatCad(financials.burnRate)}</span>
            <span className="text-slate-200 font-semibold">{financials.runwayMonths} mois</span>
          </div>
        </div>

        {/* Masse Salariale */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Masse salariale mensuelle</div>
          <div className="text-2xl font-extrabold text-slate-200">
            {formatCad(financials.payrollMonthly)}
          </div>
          <div className="text-xs flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Ratio CA : {((financials.payrollMonthly / financials.monthlyRevenue) * 100).toFixed(1)} %</span>
            <span className="text-emerald-400 font-medium">Conforme</span>
          </div>
        </div>
      </div>

      {/* Quebec Tax & Compliance Card (Revenu Québec / ARC) */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-900/40 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  Provisions Fiscales Québec (Revenu Québec & ARC)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                  Période courante
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calcul automatique des taxes nettes sur ventes moins CTI/RTI admissibles pour éviter les chocs de trésorerie.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-slate-900/90 px-3.5 py-2 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[11px]">TPS à remettre (5%)</div>
              <div className="font-mono font-bold text-white text-sm">
                {formatCad(financials.tpsPayable)}
              </div>
            </div>

            <div className="bg-slate-900/90 px-3.5 py-2 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[11px]">TVQ à remettre (9,975%)</div>
              <div className="font-mono font-bold text-cyan-300 text-sm">
                {formatCad(financials.tvqPayable)}
              </div>
            </div>

            <div className="bg-blue-900/30 px-3.5 py-2 rounded-lg border border-blue-700/40">
              <div className="text-blue-300 text-[11px] font-medium">Total provisionné</div>
              <div className="font-mono font-bold text-emerald-400 text-sm">
                {formatCad(financials.tpsPayable + financials.tvqPayable)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget vs Actual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Budget vs Actual by expense category */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              Écarts Budgétaires par Poste (Budget vs Réel)
            </h4>
            <span className="text-xs text-slate-400">En $ CAD</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${formatCad(Number(value))}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Réel" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cashflow Trend & Projection */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              Évolution et Prévision de Trésorerie (6 mois)
            </h4>
            <span className="text-xs text-emerald-400 font-semibold">Tendance haussière</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`${formatCad(Number(value))}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="Tresorerie" name="Trésorerie nette" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Entrees" name="Entrées (CA)" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Sorties" name="Sorties (Charges)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytical Budget Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white">
              Tableau d'Analyse des Écarts Budgétaires
            </h4>
            <p className="text-xs text-slate-400">
              Détection des dérives financières avec seuils d'alertes automatiques
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 text-xs">
            {['all', 'Finance', 'Marketing', 'Opérations'].map((d) => (
              <button
                key={d}
                onClick={() => setFilterDomain(d)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  filterDomain === d 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {d === 'all' ? 'Tous les domaines' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2.5">Poste Budgétaire</th>
                <th className="pb-2.5">Domaine</th>
                <th className="pb-2.5 text-right">Budget Alloué</th>
                <th className="pb-2.5 text-right">Dépenses Réelles</th>
                <th className="pb-2.5 text-right">Écart ($ CAD)</th>
                <th className="pb-2.5 text-right">Écart (%)</th>
                <th className="pb-2.5 text-center">Statut</th>
                <th className="pb-2.5 pl-4">Explication / Conséquence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-medium text-slate-200">
                    {item.category}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 text-[10px]">
                      {item.domain}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-400">
                    {formatCad(item.budgetAmount)}
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-slate-100">
                    {formatCad(item.actualAmount)}
                  </td>
                  <td className={`py-3 text-right font-mono font-bold ${
                    item.varianceAmount > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {formatPercent(item.varianceAmount, 0).replace('%', '$')}
                  </td>
                  <td className={`py-3 text-right font-mono font-bold ${
                    item.variancePct > 10 ? 'text-rose-400' : item.variancePct > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {formatPercent(item.variancePct, 1)}
                  </td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'alerte' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.status === 'defavorable'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-slate-400 max-w-xs">
                    {item.explanation}
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
