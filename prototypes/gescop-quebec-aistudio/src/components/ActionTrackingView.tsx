import React, { useState } from 'react';
import { 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Award, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { ActionTask, ActionStatus, OutcomeStatus } from '../types';

interface ActionTrackingViewProps {
  actions: ActionTask[];
  onUpdateActionStatus: (actionId: string, newStatus: ActionStatus) => void;
  onRecordOutcome: (actionId: string, actualResult: string, outcomeStatus: OutcomeStatus, notes: string) => void;
}

export const ActionTrackingView: React.FC<ActionTrackingViewProps> = ({
  actions,
  onUpdateActionStatus,
  onRecordOutcome
}) => {
  const [measuringActionId, setMeasuringActionId] = useState<string | null>(null);
  const [actualResultInput, setActualResultInput] = useState<string>('');
  const [outcomeStatusInput, setOutcomeStatusInput] = useState<OutcomeStatus>('atteint');
  const [outcomeNotesInput, setOutcomeNotesInput] = useState<string>('');

  const handleOpenMeasureModal = (action: ActionTask) => {
    setMeasuringActionId(action.id);
    setActualResultInput(action.actualResult || '');
    setOutcomeStatusInput(action.outcomeStatus !== 'en_attente' ? action.outcomeStatus : 'atteint');
    setOutcomeNotesInput(action.outcomeNotes || '');
  };

  const handleSaveMeasure = () => {
    if (!measuringActionId) return;
    onRecordOutcome(measuringActionId, actualResultInput, outcomeStatusInput, outcomeNotesInput);
    setMeasuringActionId(null);
  };

  const completedWithOutcomeCount = actions.filter(a => a.outcomeStatus !== 'en_attente').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-400" />
            Suivi des Actions & Boucle de Résultats (Outcome Engine)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Exécution des décisions prises et fermeture de la boucle : Résultat attendu vs Résultat réel mesuré.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            {completedWithOutcomeCount} résultat{completedWithOutcomeCount > 1 ? 's' : ''} mesuré{completedWithOutcomeCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Actions List / Kanban */}
      <div className="space-y-4">
        {actions.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            Aucune action active. Approuvez une recommandation dans le Centre de Décision pour générer une action.
          </div>
        ) : (
          actions.map((act) => {
            const isMeasuring = measuringActionId === act.id;

            return (
              <div 
                key={act.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {act.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      {act.domain}
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {act.title}
                    </h4>
                  </div>

                  {/* Status Dropdown / Pill */}
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Statut d'avancement de l'action"
                      value={act.status}
                      onChange={(e) => onUpdateActionStatus(act.id, e.target.value as ActionStatus)}
                      className="bg-slate-800 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="a_faire">À faire</option>
                      <option value="en_cours">En cours</option>
                      <option value="termine">Terminé</option>
                      <option value="en_mesure">En mesure</option>
                    </select>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Responsable & Échéance</div>
                    <div className="text-slate-200 font-medium mt-0.5">{act.assignedTo}</div>
                    <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Échéance : {act.dueDate}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Résultat Attendu</div>
                    <div className="text-slate-200 mt-0.5">{act.expectedResult}</div>
                  </div>

                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Résultat Réel Mesuré</div>
                    {act.actualResult ? (
                      <div>
                        <div className="text-emerald-300 font-medium mt-0.5">{act.actualResult}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {act.outcomeStatus}
                          </span>
                          <span className="text-[10px] text-slate-500">le {act.measuredAt}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic mt-0.5">
                        Non mesuré à ce jour
                      </div>
                    )}
                  </div>
                </div>

                {/* Measure Button or Inline Measure Form */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-400">
                    Origine : Décision liée <span className="font-mono text-cyan-400">{act.decisionId}</span>
                  </div>

                  {!isMeasuring ? (
                    <button
                      onClick={() => handleOpenMeasureModal(act)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{act.actualResult ? 'Modifier la mesure' : 'Mesurer le résultat (Outcome Engine)'}</span>
                    </button>
                  ) : (
                    <div className="w-full bg-slate-800/80 p-4 rounded-xl border border-emerald-500/40 space-y-3">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        Saisie du Résultat Réel (Fermeture de boucle Gescop)
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">Constat chiffré ou opérationnel :</label>
                          <input
                            type="text"
                            value={actualResultInput}
                            onChange={(e) => setActualResultInput(e.target.value)}
                            placeholder="Ex: Économie de 850 $ CAD vérifiée sur le relevé Acomba..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Évaluation de l'objectif :</label>
                          <select
                            value={outcomeStatusInput}
                            onChange={(e) => setOutcomeStatusInput(e.target.value as OutcomeStatus)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                          >
                            <option value="atteint">Objectif Pleinement Atteint (Succès)</option>
                            <option value="partiel">Résultat Partiel</option>
                            <option value="echec">Échec / Non atteint</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="text-slate-400 block mb-1">Apprentissage pour la PME (mémoire d'entreprise) :</label>
                        <input
                          type="text"
                          value={outcomeNotesInput}
                          onChange={(e) => setOutcomeNotesInput(e.target.value)}
                          placeholder="Ex: Les clients n'ont pas réagi négativement à la hausse de 3 $..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleSaveMeasure}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Enregistrer la mesure & Clôturer la boucle
                        </button>
                        <button
                          onClick={() => setMeasuringActionId(null)}
                          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
