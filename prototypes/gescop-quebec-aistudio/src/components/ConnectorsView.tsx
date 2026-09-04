import React, { useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Upload, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  Check, 
  Sparkles,
  Server
} from 'lucide-react';
import { DataConnector } from '../types';

interface ConnectorsViewProps {
  connectors: DataConnector[];
  onSyncAll: () => void;
  isSyncing: boolean;
  onCustomFileUploaded: (fileName: string, rowCount: number) => void;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  connectors,
  onSyncAll,
  isSyncing,
  onCustomFileUploaded
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);

  const handleSimulatedFileUpload = (name: string, count: number) => {
    setUploadedFile({ name, count });
    onCustomFileUploaded(name, count);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Connecteurs de Données & Normalisation (Data Platform)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronisation sécurisée avec les outils québécois de gestion (Acomba, Lightspeed, Shopify).
          </p>
        </div>

        <button
          onClick={onSyncAll}
          disabled={isSyncing}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronisation en cours...' : 'Tout synchroniser'}</span>
        </button>
      </div>

      {/* Active Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connectors.map((conn) => (
          <div 
            key={conn.id}
            className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-cyan-400">
                  {conn.logoType === 'acomba' && 'AC'}
                  {conn.logoType === 'lightspeed' && 'LS'}
                  {conn.logoType === 'shopify' && 'SH'}
                  {conn.logoType === 'square' && 'SQ'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{conn.name}</h4>
                  <div className="text-[11px] text-slate-400">{conn.category}</div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Connecté
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {conn.description}
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{conn.itemsProcessed.toLocaleString('fr-CA')} écritures synchronisées</span>
              <span className="font-mono text-slate-500">{conn.lastSync}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Custom File Importer (CSV / XLSX / PDF structuré) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Ingestion Manuelle : Import CSV / Excel PME
            </h4>
            <p className="text-xs text-slate-400">
              Importez vos grands livres, rapports de caisse ou inventaires pour déclencher le diagnostic Gescop.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Modèle commun Gescop
          </span>
        </div>

        {/* Drag & Drop Area */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleSimulatedFileUpload('grand_livre_ventes_acomba_2025.csv', 1840);
          }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
            dragActive 
              ? 'border-cyan-400 bg-cyan-950/20' 
              : 'border-slate-700/80 bg-slate-950/40 hover:border-slate-600'
          }`}
          onClick={() => handleSimulatedFileUpload('grand_livre_ventes_acomba_2025.csv', 1840)}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Glissez-déposez un fichier de données ou <span className="text-blue-400 underline">parcourez</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Formats acceptés : CSV, XLSX, XLS, TSV exportés depuis votre logiciel comptable québécois
              </p>
            </div>
          </div>
        </div>

        {uploadedFile && (
          <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white">{uploadedFile.name}</span>
                <span className="text-slate-400 ml-2">({uploadedFile.count} lignes normalisées avec succès)</span>
              </div>
            </div>
            <span className="text-emerald-400 font-mono font-bold">Injecté dans le moteur</span>
          </div>
        )}

        {/* Data Architecture explanation */}
        <div className="pt-2 text-xs text-slate-400 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Hébergement sécurisé au Canada · Respect strict de la Loi 25 québécoise sur la protection des données d'entreprise</span>
          </div>
          <div className="font-mono text-slate-500">
            Pipeline : RAW DATA → NORMALISATION → MOTEUR KPI
          </div>
        </div>
      </div>
    </div>
  );
};
