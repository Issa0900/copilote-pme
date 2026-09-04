import React, { useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Truck, 
  Search, 
  Filter,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { InventoryItem } from '../types';
import { formatCad } from '../utils/formatters';

interface OperationsModuleProps {
  inventory: InventoryItem[];
  onTriggerReorder: (item: InventoryItem) => void;
}

export const OperationsModule: React.FC<OperationsModuleProps> = ({
  inventory,
  onTriggerReorder
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reorderedItems, setReorderedItems] = useState<string[]>([]);

  const handleReorderClick = (item: InventoryItem) => {
    setReorderedItems((prev) => [...prev, item.id]);
    onTriggerReorder(item);
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesClass = selectedClass === 'all' || item.classificationABC === selectedClass;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const criticalItems = inventory.filter(i => i.status === 'rupture_imminente');
  const reorderItems = inventory.filter(i => i.status === 'reappro');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Module Opérations & Inventaire (StockSentinel PME)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Classification ABC, calcul du stock de sécurité, point de commande (ROP) et prévention des ruptures.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 font-medium border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {criticalItems.length} rupture{criticalItems.length > 1 ? 's' : ''} imminente{criticalItems.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Stock Health Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Class A summary */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Classe A (Forte valeur & marge)</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">80% du CA</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {inventory.filter(i => i.classificationABC === 'A').length} références clés
          </div>
          <p className="text-xs text-amber-400">
            Surveillance renforcée des stocks de sécurité
          </p>
        </div>

        {/* Reorder Point Alerts */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Seuils ROP atteints</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Point de cde</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {criticalItems.length + reorderItems.length} références
          </div>
          <p className="text-xs text-slate-400">
            Nécessitent un réassort sous 7 à 14 jours
          </p>
        </div>

        {/* Lead time average */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Délai moyen fournisseur québécois</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Local</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            12.8 jours
          </div>
          <p className="text-xs text-slate-400">
            Axe Beauce, Laurentides et Centre-du-Québec
          </p>
        </div>
      </div>

      {/* Inventory Management Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Classification ABC Filters */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 mr-1 text-[11px]">Classe :</span>
            {[
              { key: 'all', label: 'Toutes' },
              { key: 'A', label: 'Classe A (Stratégique)' },
              { key: 'B', label: 'Classe B' },
              { key: 'C', label: 'Classe C' },
            ].map((cls) => (
              <button
                key={cls.key}
                onClick={() => setSelectedClass(cls.key)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  selectedClass === cls.key 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cls.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2.5">Produit / Référence SKU</th>
                <th className="pb-2.5 text-center">Classe ABC</th>
                <th className="pb-2.5 text-right">Stock Actuel</th>
                <th className="pb-2.5 text-right">Stock Sécurité</th>
                <th className="pb-2.5 text-right">Point Cde (ROP)</th>
                <th className="pb-2.5 text-right">Prix Vente</th>
                <th className="pb-2.5 text-center">Délai Fournisseur</th>
                <th className="pb-2.5 text-center">Statut Stock</th>
                <th className="pb-2.5 text-right">Action Recommandée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInventory.map((item) => {
                const isReordered = reorderedItems.includes(item.id);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3">
                      <div className="font-semibold text-slate-200">{item.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{item.sku} · {item.category}</div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.classificationABC === 'A' 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                          : item.classificationABC === 'B'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {item.classificationABC}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-100">
                      <span className={item.currentStock <= item.safetyStock ? 'text-rose-400 text-sm' : ''}>
                        {item.currentStock} unités
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-slate-400">
                      {item.safetyStock}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300 font-medium">
                      {item.reorderPoint}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      {formatCad(item.sellingPrice, true)}
                    </td>
                    <td className="py-3 text-center text-slate-400 font-mono">
                      {item.leadTimeDays} jours
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'rupture_imminente'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                          : item.status === 'reappro'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {item.status === 'rupture_imminente' ? 'Rupture imminente' : item.status === 'reappro' ? 'À commander' : 'Optimal'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {item.status !== 'optimal' && !isReordered ? (
                        <button
                          onClick={() => handleReorderClick(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Réappro. d'urgence</span>
                        </button>
                      ) : isReordered ? (
                        <span className="text-emerald-400 text-[11px] font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Bon transmis
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Niveau suffisant</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
