import React, { useState } from 'react';
import { 
  CompanyDataSet, 
  QUEBEC_COMPANIES 
} from './data/mockQuebecData';
import { 
  TabKey, 
  TabNavigation 
} from './components/TabNavigation';
import { Header } from './components/Header';
import { HealthScoreHero } from './components/HealthScoreHero';
import { ExecutiveCockpit } from './components/ExecutiveCockpit';
import { FinanceModule } from './components/FinanceModule';
import { MarketingModule } from './components/MarketingModule';
import { OperationsModule } from './components/OperationsModule';
import { DecisionCenterView } from './components/DecisionCenterView';
import { ActionTrackingView } from './components/ActionTrackingView';
import { ConnectorsView } from './components/ConnectorsView';
import { AiStrategicAdvisorModal } from './components/AiStrategicAdvisorModal';
import { 
  ActionStatus, 
  OutcomeStatus, 
  InventoryItem 
} from './types';

export default function App() {
  const [selectedCompanyKey, setSelectedCompanyKey] = useState<string>('boutique-boreale');
  const [companies, setCompanies] = useState<Record<string, CompanyDataSet>>(QUEBEC_COMPANIES);
  const [activeTab, setActiveTab] = useState<TabKey>('cockpit');
  const [focusedRecommendationId, setFocusedRecommendationId] = useState<string | null>(null);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const currentDataset = companies[selectedCompanyKey] || companies['boutique-boreale'];

  // Helper to update current company's state immutably
  const updateCurrentCompany = (updater: (prev: CompanyDataSet) => CompanyDataSet) => {
    setCompanies((prev) => ({
      ...prev,
      [selectedCompanyKey]: updater(prev[selectedCompanyKey]),
    }));
  };

  // Synchronize Connectors (Acomba, Lightspeed, Shopify)
  const handleSyncConnectors = () => {
    setIsSyncing(true);
    setTimeout(() => {
      updateCurrentCompany((prev) => ({
        ...prev,
        connectors: prev.connectors.map((c) => ({
          ...c,
          lastSync: 'À l’instant',
          itemsProcessed: c.itemsProcessed + Math.floor(Math.random() * 25) + 5,
        })),
      }));
      setIsSyncing(false);
    }, 900);
  };

  // Decision Arbitrage: Approve
  const handleApproveDecision = (
    recId: string,
    rationale: string,
    decidedBy: string,
    role: string
  ) => {
    const rec = currentDataset.recommendations.find((r) => r.id === recId);
    if (!rec) return;

    const newDecisionId = `dec-${Date.now().toString().slice(-4)}`;
    const newActionId = `act-${Date.now().toString().slice(-4)}`;

    const newDecision = {
      id: newDecisionId,
      recommendationId: rec.id,
      title: rec.title,
      decision: 'APPROUVÉE' as const,
      decidedBy,
      role,
      decidedAt: new Date().toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rationale,
      actionSummary: rec.suggestedAction,
      targetMetric: rec.domain === 'Marketing' ? 'Coût d’Acquisition (CAC)' : 'Marge brute & Stocks',
      expectedOutcome: `Gain estimé de +${rec.estimatedFinancialGain} $ CAD`,
      actionId: newActionId,
    };

    const newAction = {
      id: newActionId,
      decisionId: newDecisionId,
      title: rec.title,
      domain: rec.domain,
      assignedTo: rec.requiredRole,
      dueDate: new Date(Date.now() + rec.deadlineDays * 86400000).toISOString().split('T')[0],
      status: 'en_cours' as ActionStatus,
      expectedResult: `Gain financier visé de +${rec.estimatedFinancialGain} $ CAD sous ${rec.deadlineDays} jours`,
      costEstimate: 0,
      outcomeStatus: 'en_attente' as OutcomeStatus,
    };

    updateCurrentCompany((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) =>
        r.id === recId ? { ...r, status: 'validee' as const } : r
      ),
      decisionLedger: [newDecision, ...prev.decisionLedger],
      actions: [newAction, ...prev.actions],
      healthScore: {
        ...prev.healthScore,
        overall: Math.min(100, prev.healthScore.overall + 2),
        governance: Math.min(100, prev.healthScore.governance + 4),
      },
    }));
  };

  // Decision Arbitrage: Modify
  const handleModifyDecision = (
    recId: string,
    adjustedAction: string,
    rationale: string,
    decidedBy: string
  ) => {
    const rec = currentDataset.recommendations.find((r) => r.id === recId);
    if (!rec) return;

    const newDecisionId = `dec-${Date.now().toString().slice(-4)}`;
    const newActionId = `act-${Date.now().toString().slice(-4)}`;

    const newDecision = {
      id: newDecisionId,
      recommendationId: rec.id,
      title: rec.title,
      decision: 'MODIFIÉE' as const,
      decidedBy,
      role: 'Directeur Général',
      decidedAt: new Date().toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rationale,
      actionSummary: adjustedAction,
      targetMetric: 'Plan d’action ajusté',
      expectedOutcome: `Gain ajusté à +${rec.estimatedFinancialGain} $ CAD`,
      actionId: newActionId,
    };

    const newAction = {
      id: newActionId,
      decisionId: newDecisionId,
      title: `${rec.title} (Ajusté)`,
      domain: rec.domain,
      assignedTo: rec.requiredRole,
      dueDate: new Date(Date.now() + (rec.deadlineDays + 3) * 86400000).toISOString().split('T')[0],
      status: 'en_cours' as ActionStatus,
      expectedResult: adjustedAction,
      costEstimate: 0,
      outcomeStatus: 'en_attente' as OutcomeStatus,
    };

    updateCurrentCompany((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) =>
        r.id === recId ? { ...r, status: 'modifiee' as const, suggestedAction: adjustedAction } : r
      ),
      decisionLedger: [newDecision, ...prev.decisionLedger],
      actions: [newAction, ...prev.actions],
    }));
  };

  // Decision Arbitrage: Reject
  const handleRejectDecision = (recId: string, rationale: string, decidedBy: string) => {
    const rec = currentDataset.recommendations.find((r) => r.id === recId);
    if (!rec) return;

    const newDecisionId = `dec-${Date.now().toString().slice(-4)}`;
    const newDecision = {
      id: newDecisionId,
      recommendationId: rec.id,
      title: rec.title,
      decision: 'REJETÉE' as const,
      decidedBy,
      role: 'Directeur Général',
      decidedAt: new Date().toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rationale,
      actionSummary: 'Option écartée pour le trimestre courant.',
      targetMetric: 'Maintien du cap initial',
      expectedOutcome: 'Risque accepté par la direction',
    };

    updateCurrentCompany((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) =>
        r.id === recId ? { ...r, status: 'rejetee' as const } : r
      ),
      decisionLedger: [newDecision, ...prev.decisionLedger],
    }));
  };

  // Update Action status
  const handleUpdateActionStatus = (actionId: string, newStatus: ActionStatus) => {
    updateCurrentCompany((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === actionId ? { ...a, status: newStatus } : a)),
    }));
  };

  // Outcome Engine: Record real-world measured result
  const handleRecordOutcome = (
    actionId: string,
    actualResult: string,
    outcomeStatus: OutcomeStatus,
    notes: string
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    updateCurrentCompany((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === actionId
          ? {
              ...a,
              actualResult,
              outcomeStatus,
              outcomeNotes: notes,
              measuredAt: todayStr,
              status: 'termine' as ActionStatus,
            }
          : a
      ),
      healthScore: {
        ...prev.healthScore,
        overall: Math.min(100, prev.healthScore.overall + (outcomeStatus === 'atteint' ? 3 : 1)),
        governance: Math.min(100, prev.healthScore.governance + 3),
      },
    }));
  };

  // Trigger reorder in StockSentinel
  const handleTriggerReorder = (item: InventoryItem) => {
    const newActionId = `act-reappro-${Date.now().toString().slice(-4)}`;
    const newAction = {
      id: newActionId,
      decisionId: 'AUTO-ROP-SENTINEL',
      title: `Commande réappro d'urgence : ${item.name}`,
      domain: 'Opérations' as const,
      assignedTo: 'Responsable Achats / Entrepôt',
      dueDate: new Date(Date.now() + item.leadTimeDays * 86400000).toISOString().split('T')[0],
      status: 'en_cours' as ActionStatus,
      expectedResult: `Réception de 40 unités sous ${item.leadTimeDays} jours`,
      costEstimate: item.unitCost * 40,
      outcomeStatus: 'en_attente' as OutcomeStatus,
    };

    updateCurrentCompany((prev) => ({
      ...prev,
      actions: [newAction, ...prev.actions],
      inventory: prev.inventory.map((i) =>
        i.id === item.id ? { ...i, status: 'reappro' as const } : i
      ),
    }));
  };

  // Handle custom file upload
  const handleCustomFileUploaded = (fileName: string, rowCount: number) => {
    updateCurrentCompany((prev) => ({
      ...prev,
      connectors: [
        ...prev.connectors,
        {
          id: `conn-file-${Date.now().toString().slice(-3)}`,
          name: fileName,
          category: 'Comptabilité',
          logoType: 'acomba',
          status: 'synchronise',
          lastSync: 'À l’instant',
          itemsProcessed: rowCount,
          description: 'Fichier structuré importé manuellement et normalisé dans le modèle commun Gescop.',
        },
      ],
    }));
  };

  // Quick navigation from Cockpit into Decision Center
  const handleNavigateToRecommendation = (recId: string) => {
    setFocusedRecommendationId(recId);
    setActiveTab('decisions');
  };

  const criticalAnomalies = currentDataset.anomalies.filter((a) => a.severity === 'critique');
  const pendingDecisions = currentDataset.recommendations.filter((r) => r.status === 'en_attente');
  const activeActions = currentDataset.actions.filter((a) => a.status === 'en_cours' || a.status === 'a_faire');

  return (
    <div className="min-h-screen bg-[#0c121e] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentCompany={currentDataset.profile}
        companyKeys={Object.keys(companies)}
        selectedKey={selectedCompanyKey}
        onSelectCompany={(key) => {
          setSelectedCompanyKey(key);
          setFocusedRecommendationId(null);
        }}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onSyncConnectors={handleSyncConnectors}
        isSyncing={isSyncing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* PME Health Score Banner */}
        <HealthScoreHero
          profile={currentDataset.profile}
          health={currentDataset.healthScore}
          criticalAnomalyCount={criticalAnomalies.length}
          pendingDecisionCount={pendingDecisions.length}
          onNavigateToDecisions={() => setActiveTab('decisions')}
          onNavigateToCockpit={() => setActiveTab('cockpit')}
        />

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'decisions') setFocusedRecommendationId(null);
          }}
          pendingDecisionsCount={pendingDecisions.length}
          actionsInProgressCount={activeActions.length}
        />

        {/* Tab Views */}
        <div className="pt-2">
          {activeTab === 'cockpit' && (
            <ExecutiveCockpit
              financials={currentDataset.financials}
              marketing={currentDataset.marketing}
              inventory={currentDataset.inventory}
              anomalies={currentDataset.anomalies}
              diagnostics={currentDataset.diagnostics}
              recommendations={currentDataset.recommendations}
              recentActions={currentDataset.actions.filter((a) => a.outcomeStatus !== 'en_attente')}
              onSelectRecommendation={handleNavigateToRecommendation}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceModule
              financials={currentDataset.financials}
              budgetItems={currentDataset.budgetItems}
              onOpenDecisionForBudgetItem={() => setActiveTab('decisions')}
            />
          )}

          {activeTab === 'marketing' && (
            <MarketingModule
              marketing={currentDataset.marketing}
              onNavigateToDecisions={() => setActiveTab('decisions')}
            />
          )}

          {activeTab === 'operations' && (
            <OperationsModule
              inventory={currentDataset.inventory}
              onTriggerReorder={handleTriggerReorder}
            />
          )}

          {activeTab === 'decisions' && (
            <DecisionCenterView
              recommendations={currentDataset.recommendations}
              decisionLedger={currentDataset.decisionLedger}
              onApproveDecision={handleApproveDecision}
              onModifyDecision={handleModifyDecision}
              onRejectDecision={handleRejectDecision}
              activeRecommendationId={focusedRecommendationId}
            />
          )}

          {activeTab === 'actions' && (
            <ActionTrackingView
              actions={currentDataset.actions}
              onUpdateActionStatus={handleUpdateActionStatus}
              onRecordOutcome={handleRecordOutcome}
            />
          )}

          {activeTab === 'connectors' && (
            <ConnectorsView
              connectors={currentDataset.connectors}
              onSyncAll={handleSyncConnectors}
              isSyncing={isSyncing}
              onCustomFileUploaded={handleCustomFileUploaded}
            />
          )}
        </div>
      </main>

      {/* Footer with Quebec context & governance reminder */}
      <footer className="border-t border-slate-800 bg-[#090e17] py-6 px-4 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">GESCOP v1.0</span>
            <span>—</span>
            <span>Système intelligent de pilotage et de gouvernance des PME (Québec / Canada)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Boucle : Données → KPI → Diagnostics → Recommandations → Décisions → Actions → Résultats</span>
          </div>
        </div>
      </footer>

      {/* AI Strategic Advisor Modal */}
      <AiStrategicAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        company={currentDataset.profile}
        financials={currentDataset.financials}
        marketing={currentDataset.marketing}
      />
    </div>
  );
}
