import React, { useState } from 'react';
import { 
  Scale, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  BookOpen, 
  Clock, 
  UserCheck, 
  DollarSign, 
  AlertTriangle, 
  ShieldAlert, 
  PlusCircle,
  FileCheck2,
  Calendar
} from 'lucide-react';
import { RecommendationItem, DecisionRecord } from '../types';
import { formatCad } from '../utils/formatters';

interface DecisionCenterViewProps {
  recommendations: RecommendationItem[];
  decisionLedger: DecisionRecord[];
  onApproveDecision: (recId: string, rationale: string, decidedBy: string, role: string) => void;
  onModifyDecision: (recId: string, adjustedAction: string, rationale: string, decidedBy: string) => void;
  onRejectDecision: (recId: string, rationale: string, decidedBy: string) => void;
  activeRecommendationId?: string | null;
}

export const DecisionCenterView: React.FC<DecisionCenterViewProps> = ({
  recommendations,
  decisionLedger,
  onApproveDecision,
  onModifyDecision,
  onRejectDecision,
  activeRecommendationId
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'ledger'>('pending');
  const [selectedRecId, setSelectedRecId] = useState<string>(
    activeRecommendationId || (recommendations[0]?.id ?? '')
  );

  // Form states for arbitrage
  const [decidedBy, setDecidedBy] = useState<string>('Marc-André Côté');
  const [role, setRole] = useState<string>('Directeur Général');
  const [rationale, setRationale] = useState<string>('Approuvé en comité de gestion hebdomadaire.');
  const [modifiedActionText, setModifiedActionText] = useState<string>('');
  const [isModifying, setIsModifying] = useState<boolean>(false);

  const selectedRec = recommendations.find((r) => r.id === selectedRecId) || recommendations[0];
  const pendingRecs = recommendations.filter((r) => r.status === 'en_attente');

  const handleApprove = () => {
    if (!selectedRec) return;
    onApproveDecision(
      selectedRec.id,
      rationale || 'Approuvé sans réserve par la direction.',
      decidedBy,
      role
    );
  };

  const handleReject = () => {
    if (!selectedRec) return;
    if (!rationale) {
      alert('Veuillez fournir une justification pour le registre de gouvernance.');
      return;
    }
    onRejectDecision(selectedRec.id, rationale, decidedBy);
  };

  const handleModify = () => {
    if (!selectedRec) return;
    onModifyDecision(selectedRec.id, modifiedActionText || selectedRec.suggestedAction, rationale, decidedBy);
    setIsModifying(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            Centre de Décision & Mémoire Décisionnelle (Decision Ledger)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            L'IA analyse et recommande, l'humain arbitre, la gouvernance trace et mesure.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 text-xs bg-slate-800/90 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Décisions à arbitrer ({pendingRecs.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registre Decision Ledger ({decisionLedger.length})
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recommendations List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Recommandations générées par le moteur
            </div>

            {recommendations.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                Aucune décision en attente d’arbitrage.
              </div>
            ) : (
              recommendations.map((rec) => {
                const isSelected = selectedRec?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setSelectedRecId(rec.id);
                      setIsModifying(false);
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
                      <span className="px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {rec.domain}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        rec.urgency === 'Critique' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {rec.urgency}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-100 leading-snug">
                      {rec.title}
                    </h5>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>Gain estimé : <strong className="text-emerald-400 font-mono">+{formatCad(rec.estimatedFinancialGain)}</strong></span>
                      <span className={`font-semibold capitalize ${
                        rec.status === 'en_attente' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {rec.status === 'en_attente' ? 'À arbitrer' : rec.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Structured Arbitrage Dossier */}
          <div className="lg:col-span-7">
            {selectedRec ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span>Dossier d'arbitrage</span>
                      <span>·</span>
                      <span className="font-mono text-cyan-400">{selectedRec.id}</span>
                      <span>·</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-[10px]">
                        {selectedRec.domain}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white">
                      {selectedRec.title}
                    </h4>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Impact économique net</div>
                    <div className="text-xl font-mono font-extrabold text-emerald-400">
                      +{formatCad(selectedRec.estimatedFinancialGain)}
                    </div>
                  </div>
                </div>

                {/* Structured Rationale */}
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-400 font-semibold mb-1">Problème & Contexte :</div>
                    <p className="text-slate-200 leading-relaxed">{selectedRec.problem}</p>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-400 font-semibold mb-1">Rationale de gestion :</div>
                    <p className="text-slate-200 leading-relaxed">{selectedRec.rationale}</p>
                  </div>

                  <div className="bg-blue-950/30 p-3.5 rounded-xl border border-blue-900/40">
                    <div className="text-blue-300 font-bold mb-1">Action concrète recommandée par Gescop :</div>
                    {isModifying ? (
                      <textarea
                        value={modifiedActionText}
                        onChange={(e) => setModifiedActionText(e.target.value)}
                        className="w-full bg-slate-900 border border-blue-600 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        rows={3}
                      />
                    ) : (
                      <p className="text-slate-100 font-medium leading-relaxed">{selectedRec.suggestedAction}</p>
                    )}
                  </div>
                </div>

                {/* Manager Decision Input Form */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    Validation du Gestionnaire (Comité de Direction PME)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Nom du décideur :</label>
                      <input
                        type="text"
                        value={decidedBy}
                        onChange={(e) => setDecidedBy(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Rôle / Titre dans la PME :</label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="text-slate-400 block mb-1">
                      Justification & Notes pour le Decision Ledger (Traçabilité) :
                    </label>
                    <input
                      type="text"
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      placeholder="Ex: Validé après analyse du flux de trésorerie disponible..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  {/* Decision Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleApprove}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-700/20 active:scale-98"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approuver & Créer l'Action</span>
                    </button>

                    {!isModifying ? (
                      <button
                        onClick={() => {
                          setIsModifying(true);
                          setModifiedActionText(selectedRec.suggestedAction);
                        }}
                        className="py-2.5 px-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Ajuster</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleModify}
                        className="py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Enregistrer l'ajustement</span>
                      </button>
                    )}

                    <button
                      onClick={handleReject}
                      className="py-2.5 px-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeter / Différer</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                Sélectionnez une recommandation pour consulter son dossier d'arbitrage.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Decision Ledger Tab */
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Registre Immuable des Décisions (Decision Ledger)
              </h4>
              <p className="text-xs text-slate-400">
                Mémoire décisionnelle de l'entreprise : chaque décision prise par un humain est consignée avec sa justification.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total consignées : <span className="text-white font-bold">{decisionLedger.length}</span>
            </div>
          </div>

          <div className="space-y-3">
            {decisionLedger.map((dec) => (
              <div 
                key={dec.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {dec.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dec.decision === 'APPROUVÉE' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {dec.decision}
                    </span>
                    <h5 className="text-sm font-bold text-slate-100">
                      {dec.title}
                    </h5>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dec.decidedAt}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Décideur certifié</div>
                    <div className="text-slate-200 font-medium mt-0.5">{dec.decidedBy}</div>
                    <div className="text-slate-400 text-[11px]">{dec.role}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Justification consignée</div>
                    <div className="text-slate-300 mt-0.5">{dec.rationale}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-emerald-400 uppercase font-semibold">Résultat attendu</div>
                    <div className="text-emerald-300 font-medium mt-0.5">{dec.expectedOutcome}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
