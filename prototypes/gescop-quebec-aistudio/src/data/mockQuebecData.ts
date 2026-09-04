import {
  CompanyProfile,
  HealthScoreBreakdown,
  FinancialMetrics,
  BudgetItem,
  MarketingMetrics,
  InventoryItem,
  AnomalyItem,
  DiagnosticItem,
  RecommendationItem,
  DecisionRecord,
  ActionTask,
  DataConnector
} from '../types';

export interface CompanyDataSet {
  profile: CompanyProfile;
  healthScore: HealthScoreBreakdown;
  financials: FinancialMetrics;
  budgetItems: BudgetItem[];
  marketing: MarketingMetrics;
  inventory: InventoryItem[];
  anomalies: AnomalyItem[];
  diagnostics: DiagnosticItem[];
  recommendations: RecommendationItem[];
  decisionLedger: DecisionRecord[];
  actions: ActionTask[];
  connectors: DataConnector[];
}

export const QUEBEC_COMPANIES: Record<string, CompanyDataSet> = {
  'boutique-boreale': {
    profile: {
      id: 'boutique-boreale',
      name: 'Boutique Boréale Inc.',
      neq: '1178923456',
      city: 'Montréal (Mile End)',
      region: 'Montréal',
      sector: 'Commerce de détail & Web (Plein air)',
      employeeCount: 14,
      connectors: ['Lightspeed Retail', 'Shopify Plus', 'Acomba Comptabilité'],
      foundedYear: 2019,
    },
    healthScore: {
      overall: 71,
      finance: 68,
      marketing: 59,
      operations: 74,
      governance: 86,
      trend: 'baisse',
      changePoints: -4,
    },
    financials: {
      monthlyRevenue: 138500,
      budgetRevenue: 145000,
      cogs: 81700,
      grossMarginPct: 41.0,
      targetGrossMarginPct: 46.0,
      netMarginPct: 7.8,
      cashOnHand: 92400,
      burnRate: 14200,
      runwayMonths: 6.5,
      payrollMonthly: 38200,
      tpsPayable: 6925, // 5%
      tvqPayable: 13815, // 9.975%
    },
    budgetItems: [
      {
        id: 'b-1',
        category: 'Marketing numérique (Meta & Google Ads)',
        domain: 'Marketing',
        budgetAmount: 11000,
        actualAmount: 14850,
        varianceAmount: 3850,
        variancePct: 35.0,
        status: 'alerte',
        explanation: 'Enchères agressives sur Meta Ads sans retargeting suffisant, augmentation du CPA de 28%.'
      },
      {
        id: 'b-2',
        category: 'Achats marchandises & Matières (CMV)',
        domain: 'Finance',
        budgetAmount: 78000,
        actualAmount: 81700,
        varianceAmount: 3700,
        variancePct: 4.7,
        status: 'defavorable',
        explanation: 'Frais de transport fret maritime additionnels pour les tissus isolants d’hiver.'
      },
      {
        id: 'b-3',
        category: 'Masse salariale & avantages sociaux',
        domain: 'Finance',
        budgetAmount: 39500,
        actualAmount: 38200,
        varianceAmount: -1300,
        variancePct: -3.3,
        status: 'favorable',
        explanation: 'Heures supplémentaires bien maîtrisées en boutique physique de la rue Saint-Viateur.'
      },
      {
        id: 'b-4',
        category: 'Logistique, emballage & expédition Postes Canada',
        domain: 'Opérations',
        budgetAmount: 6500,
        actualAmount: 7900,
        varianceAmount: 1400,
        variancePct: 21.5,
        status: 'defavorable',
        explanation: 'Hausse des surcharges de carburant et retours colis de vêtements mal ajustés.'
      },
      {
        id: 'b-5',
        category: 'Plateformes logicielles (SaaS & POS)',
        domain: 'Finance',
        budgetAmount: 2400,
        actualAmount: 2400,
        varianceAmount: 0,
        variancePct: 0,
        status: 'favorable',
        explanation: 'Acomba, Lightspeed et Shopify sous forfait annuel stabilisé.'
      }
    ],
    marketing: {
      monthlyVisitors: 48200,
      leads: 1640,
      customersAcquired: 642,
      conversionRate: 1.33,
      averageOrderValue: 215.70,
      cac: 44.50,
      targetCac: 28.00,
      ltv: 285.00,
      ltvCacRatio: 6.4,
      marketingSpend: 14850,
      marketingBudget: 11000,
      campaigns: [
        {
          name: 'Campagne Hiver - Manteaux Isolés (Meta)',
          channel: 'Meta Ads',
          spend: 8200,
          conversions: 184,
          cpa: 44.56,
          status: 'sous_performant'
        },
        {
          name: 'Mots-clés intentionnels Plein Air Québec (Google)',
          channel: 'Google Search',
          spend: 4450,
          conversions: 330,
          cpa: 13.48,
          status: 'optimal'
        },
        {
          name: 'Partenariat Guides & Aventuriers Gaspésie',
          channel: 'Influenceurs QC',
          spend: 1500,
          conversions: 98,
          cpa: 15.30,
          status: 'optimal'
        },
        {
          name: 'Infolettre Hebdo & Ventes Privées VIP',
          channel: 'Infolettre',
          spend: 700,
          conversions: 30,
          cpa: 23.33,
          status: 'optimal'
        }
      ]
    },
    inventory: [
      {
        id: 'inv-1',
        sku: 'MAN-BOR-NOIR-L',
        name: 'Parka Boréal Arctique Homme (Noir - L)',
        category: 'Manteaux',
        classificationABC: 'A',
        currentStock: 4,
        safetyStock: 15,
        reorderPoint: 25,
        unitCost: 165.00,
        sellingPrice: 420.00,
        leadTimeDays: 14,
        status: 'rupture_imminente'
      },
      {
        id: 'inv-2',
        sku: 'SAC-EXP-45L',
        name: 'Sac d’expédition étanche Saint-Laurent 45L',
        category: 'Accessoires',
        classificationABC: 'A',
        currentStock: 7,
        safetyStock: 12,
        reorderPoint: 20,
        unitCost: 68.00,
        sellingPrice: 189.00,
        leadTimeDays: 10,
        status: 'rupture_imminente'
      },
      {
        id: 'inv-3',
        sku: 'BOT-HIV-42',
        name: 'Bottes d’hiver thermique cuir québécois',
        category: 'Chaussures',
        classificationABC: 'B',
        currentStock: 28,
        safetyStock: 20,
        reorderPoint: 30,
        unitCost: 110.00,
        sellingPrice: 260.00,
        leadTimeDays: 21,
        status: 'reappro'
      },
      {
        id: 'inv-4',
        sku: 'TUQ-MER-QC',
        name: 'Tuque en laine mérinos filée à Saint-Côme',
        category: 'Accessoires',
        classificationABC: 'C',
        currentStock: 142,
        safetyStock: 35,
        reorderPoint: 50,
        unitCost: 12.50,
        sellingPrice: 38.00,
        leadTimeDays: 7,
        status: 'optimal'
      },
      {
        id: 'inv-5',
        sku: 'GAN-ISO-PRO',
        name: 'Gants de ski renforcés Gore-Tex',
        category: 'Accessoires',
        classificationABC: 'B',
        currentStock: 45,
        safetyStock: 18,
        reorderPoint: 25,
        unitCost: 34.00,
        sellingPrice: 89.00,
        leadTimeDays: 12,
        status: 'optimal'
      }
    ],
    anomalies: [
      {
        id: 'ano-1',
        title: 'Explosion du CPA Meta Ads (+59% vs cible)',
        domain: 'Marketing',
        severity: 'critique',
        detectedAt: 'Aujourd’hui à 08:30 (Lightspeed/Shopify)',
        metricObserved: 'CPA : 44.50 $ CAD (Cible max : 28.00 $ CAD)',
        impactSummary: 'Dépassement mensuel prévu de 3 850 $ CAD réduisant directement la marge nette de 2.8 points.'
      },
      {
        id: 'ano-2',
        title: 'Risque de rupture imminente sur le produit A n°1',
        domain: 'Opérations',
        severity: 'critique',
        detectedAt: 'Hier à 17:15 (Acomba/StockSentinel)',
        metricObserved: 'Stock Parka Arctique : 4 unités (Point de commande : 25 unités)',
        impactSummary: 'Perte de chiffre d’affaires estimée à 12 600 $ CAD sur les 14 prochains jours d’affluence hivernale.'
      },
      {
        id: 'ano-3',
        title: 'Érosion de la marge brute (41.0% vs cible 46.0%)',
        domain: 'Finance',
        severity: 'important',
        detectedAt: 'Fin de semaine dernière (Acomba)',
        metricObserved: 'Marge brute : 41.0% (-5.0 points d’écart)',
        impactSummary: 'Écart cumulé de 6 925 $ CAD sur le résultat d’exploitation mensuel.'
      }
    ],
    diagnostics: [
      {
        id: 'diag-1',
        anomalyId: 'ano-1',
        domain: 'Marketing',
        factObserved: 'Le coût par acquisition Meta Ads est passé de 28 $ à 44.50 $ en 18 jours avec un taux de conversion web qui chute de 1.8% à 1.33%.',
        correlation: 'La campagne Meta draine 55% du budget total sur une audience froide non qualifiée, tandis que les stocks du manteau mis en avant sont presque épuisés.',
        rootHypothesis: 'Les visiteurs cliquent sur la publicité mais se heurtent à la rupture des tailles populaires (M et L) sur la boutique Shopify, détruisant la rentabilité média.',
        estimatedFinancialImpact: '-3 850 $ CAD de gaspillage publicitaire mensuel',
        calculatedPriority: 94
      },
      {
        id: 'diag-2',
        anomalyId: 'ano-2',
        domain: 'Opérations',
        factObserved: 'Le stock actuel du Parka Boréal (4 unités) est très inférieur au stock de sécurité (15 unités) avec un délai fournisseur de 14 jours.',
        correlation: 'Le produit représente à lui seul 18% de la marge brute totale de la boutique.',
        rootHypothesis: 'Le bon de commande fournisseur n’a pas été déclenché automatiquement lors du franchissement du ROP (25 unités).',
        estimatedFinancialImpact: '12 600 $ CAD de ventes nettes menacées',
        calculatedPriority: 96
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        diagnosticId: 'diag-1',
        domain: 'Marketing',
        title: 'Couper la campagne Meta Ads sur les tailles en rupture et réaffecter le budget',
        problem: 'Gaspillage publicitaire sur des pages produits à stocks épuisés.',
        rationale: 'Le trafic payant arrive sur un produit dont les tailles M et L sont en rupture, faisant grimper le CPA à 44.50 $.',
        suggestedAction: 'Suspendre immédiatement l’adset "Manteaux Isolés Meta" ou rediriger le budget de 4 000 $ vers Google Search (CPA de 13.48 $) et les bottes en stock.',
        estimatedFinancialGain: 3850,
        requiredRole: 'Responsable Marketing & E-commerce',
        urgency: 'Critique',
        deadlineDays: 2,
        status: 'en_attente'
      },
      {
        id: 'rec-2',
        diagnosticId: 'diag-2',
        domain: 'Opérations',
        title: 'Émettre un bon de commande d’urgence de 40 unités de Parkas au manufacturier de Beauce',
        problem: 'Stock critique de 4 unités sur le produit générant 18% de la marge.',
        rationale: 'Avec 14 jours de délai de fabrication/livraison et un rythme de vente de 3 manteaux/jour le week-end, la rupture sera totale d’ici 48h.',
        suggestedAction: 'Transmettre la commande de réassort de 40 parkas (6 600 $ CAD de coût) avec demande de livraison prioritaire par messagerie québécoise.',
        estimatedFinancialGain: 12600,
        requiredRole: 'Directeur des Opérations / Achats',
        urgency: 'Critique',
        deadlineDays: 1,
        status: 'en_attente'
      },
      {
        id: 'rec-3',
        diagnosticId: 'diag-1',
        domain: 'Finance',
        title: 'Mettre à jour la grille de frais d’expédition au panier pour compenser la hausse Postes Canada',
        problem: 'Surtaxe logistique de 1 400 $ CAD absorbée à perte par la marge.',
        rationale: 'Les envois hors grands centres urbains québécois coûtent 4.20 $ de plus que le forfait offert au panier.',
        suggestedAction: 'Ajuster le seuil de livraison gratuite de 150 $ à 175 $ CAD et appliquer une participation fixe de 4 $ pour les régions éloignées.',
        estimatedFinancialGain: 1400,
        requiredRole: 'Directrice Générale',
        urgency: 'Moyenne',
        deadlineDays: 7,
        status: 'en_attente'
      }
    ],
    decisionLedger: [
      {
        id: 'dec-101',
        recommendationId: 'rec-prev-1',
        title: 'Adoption du forfait annuel Acomba Comptabilité en ligne',
        decision: 'APPROUVÉE',
        decidedBy: 'Sophie Tremblay',
        role: 'Directrice Générale',
        decidedAt: '2025-08-14 à 10:15',
        rationale: 'Verrouille un tarif préférentiel et permet l’exportation automatisée des écritures de vente Lightspeed.',
        actionSummary: 'Signature du contrat annuel Acomba et synchronisation API.',
        targetMetric: 'Frais logiciels mensuels',
        expectedOutcome: 'Économie annuelle de 850 $ CAD et gain de 5h/semaine en tenue de livres.',
        actionId: 'act-201'
      },
      {
        id: 'dec-102',
        recommendationId: 'rec-prev-2',
        title: 'Augmentation de 6% sur le prix de vente des Tuques en mérinos',
        decision: 'APPROUVÉE',
        decidedBy: 'Marc-André Côté',
        role: 'Responsable Ventes & Produits',
        decidedAt: '2025-08-22 à 14:30',
        rationale: 'Hausse du coût de la laine locale; la clientèle accepte la prime pour le produit 100% fait au Québec.',
        actionSummary: 'Passage du prix de détail de 35 $ à 38 $ CAD sur Shopify et en caisse Lightspeed.',
        targetMetric: 'Marge brute de la catégorie Accessoires',
        expectedOutcome: '+840 $ CAD de marge nette par mois.',
        actionId: 'act-202'
      }
    ],
    actions: [
      {
        id: 'act-201',
        decisionId: 'dec-101',
        title: 'Intégration du connecteur Acomba Cloud avec Lightspeed',
        domain: 'Finance',
        assignedTo: 'Comptable externe & DG',
        dueDate: '2025-09-10',
        status: 'termine',
        expectedResult: 'Économie de 850 $ CAD et automatisation des flux de caisse.',
        costEstimate: 350,
        actualResult: 'Synchronisation active, 0 erreur de rapprochement de caisse au mois d’août.',
        outcomeStatus: 'atteint',
        outcomeNotes: 'Objectif de gain de temps et réduction d’erreurs pleinement atteint.',
        measuredAt: '2025-08-31'
      },
      {
        id: 'act-202',
        decisionId: 'dec-102',
        title: 'Réétiquetage et mise à jour tarifaire des Tuques de laine à 38 $ CAD',
        domain: 'Marketing',
        assignedTo: 'Équipe boutique Mile End',
        dueDate: '2025-08-25',
        status: 'termine',
        expectedResult: '+840 $ CAD de marge sans baisse de volume de vente.',
        costEstimate: 0,
        actualResult: 'Volume de vente stable à 82 unités écoulées, marge brute en hausse de 5.4%.',
        outcomeStatus: 'atteint',
        outcomeNotes: 'Élasticité-prix très favorable, pas de perte de clients.',
        measuredAt: '2025-08-30'
      }
    ],
    connectors: [
      {
        id: 'conn-1',
        name: 'Acomba Comptabilité',
        category: 'Comptabilité',
        logoType: 'acomba',
        status: 'synchronise',
        lastSync: 'Il y a 12 min',
        itemsProcessed: 1420,
        description: 'Grand livre, comptes fournisseurs, balance de vérification et rapports TPS/TVQ.'
      },
      {
        id: 'conn-2',
        name: 'Lightspeed Retail POS',
        category: 'Point de Vente',
        logoType: 'lightspeed',
        status: 'synchronise',
        lastSync: 'Il y a 3 min',
        itemsProcessed: 384,
        description: 'Ventes en magasin Mile End, gestion des tiroirs-caisses et inventaire physique.'
      },
      {
        id: 'conn-3',
        name: 'Shopify Plus',
        category: 'Commerce Électronique',
        logoType: 'shopify',
        status: 'synchronise',
        lastSync: 'Il y a 6 min',
        itemsProcessed: 890,
        description: 'Commandes e-commerce partout au Québec et au Canada, paniers et clients.'
      }
    ]
  },

  'microbrasserie-fjord': {
    profile: {
      id: 'microbrasserie-fjord',
      name: 'Microbrasserie du Fjord S.E.N.C.',
      neq: '1145678912',
      city: 'Chicoutimi (Saguenay)',
      region: 'Saguenay–Lac-Saint-Jean',
      sector: 'Agroalimentaire & Brassage artisanal',
      employeeCount: 22,
      connectors: ['Acomba Comptabilité', 'Square POS', 'Excel B2B SAQ'],
      foundedYear: 2017,
    },
    healthScore: {
      overall: 78,
      finance: 72,
      marketing: 81,
      operations: 76,
      governance: 83,
      trend: 'stable',
      changePoints: 1,
    },
    financials: {
      monthlyRevenue: 182000,
      budgetRevenue: 175000,
      cogs: 112000,
      grossMarginPct: 38.5,
      targetGrossMarginPct: 42.0,
      netMarginPct: 9.4,
      cashOnHand: 145000,
      burnRate: 21000,
      runwayMonths: 7.0,
      payrollMonthly: 54000,
      tpsPayable: 9100,
      tvqPayable: 18154,
    },
    budgetItems: [
      {
        id: 'bf-1',
        category: 'Aluminium, canettes & étiquettes certifiées Aliments du Québec',
        domain: 'Opérations',
        budgetAmount: 24000,
        actualAmount: 28500,
        varianceAmount: 4500,
        variancePct: 18.7,
        status: 'alerte',
        explanation: 'Hausse du coût unitaire des canettes chez le fournisseur de Bécancour.'
      },
      {
        id: 'bf-2',
        category: 'Malt, houblon québécois et levures',
        domain: 'Opérations',
        budgetAmount: 32000,
        actualAmount: 31200,
        varianceAmount: -800,
        variancePct: -2.5,
        status: 'favorable',
        explanation: 'Contrat d’approvisionnement annuel avantageux avec la Malterie du Saguenay.'
      },
      {
        id: 'bf-3',
        category: 'Promotion festivals, événements & dégustations région',
        domain: 'Marketing',
        budgetAmount: 8500,
        actualAmount: 8900,
        varianceAmount: 400,
        variancePct: 4.7,
        status: 'favorable',
        explanation: 'Forte affluence au Festi-Bière avec vente directe en fûts très rentable.'
      }
    ],
    marketing: {
      monthlyVisitors: 19400,
      leads: 890,
      customersAcquired: 410,
      conversionRate: 2.11,
      averageOrderValue: 84.00,
      cac: 21.70,
      targetCac: 25.00,
      ltv: 240.00,
      ltvCacRatio: 11.0,
      marketingSpend: 8900,
      marketingBudget: 8500,
      campaigns: [
        {
          name: 'Lancement Canette Saison Houblon Sauvage',
          channel: 'Meta Ads',
          spend: 3400,
          conversions: 160,
          cpa: 21.25,
          status: 'optimal'
        },
        {
          name: 'Tourisme Brassicole Saguenay Route des Saveurs',
          channel: 'Influenceurs QC',
          spend: 2500,
          conversions: 140,
          cpa: 17.85,
          status: 'optimal'
        }
      ]
    },
    inventory: [
      {
        id: 'invf-1',
        sku: 'CAN-BLONDE-473',
        name: 'Bière Blonde du Fjord 473ml (Caisse de 24)',
        category: 'Canettes',
        classificationABC: 'A',
        currentStock: 48,
        safetyStock: 40,
        reorderPoint: 80,
        unitCost: 38.00,
        sellingPrice: 72.00,
        leadTimeDays: 7,
        status: 'reappro'
      },
      {
        id: 'invf-2',
        sku: 'CAN-IPA-473',
        name: 'IPA Boréale aux pousses d’épinette (Caisse de 24)',
        category: 'Canettes',
        classificationABC: 'A',
        currentStock: 110,
        safetyStock: 50,
        reorderPoint: 90,
        unitCost: 44.00,
        sellingPrice: 86.00,
        leadTimeDays: 7,
        status: 'optimal'
      }
    ],
    anomalies: [
      {
        id: 'anof-1',
        title: 'Hausse imprévue du coût de packaging (+18.7%)',
        domain: 'Opérations',
        severity: 'important',
        detectedAt: 'Hier à 11:20 (Acomba)',
        metricObserved: 'Coût canettes : 28 500 $ CAD vs Budget 24 000 $ CAD',
        impactSummary: 'Érosion de 3.5% sur la marge brute du produit fer de lance.'
      }
    ],
    diagnostics: [
      {
        id: 'diagf-1',
        anomalyId: 'anof-1',
        domain: 'Opérations',
        factObserved: 'Le coût des canettes nues imprimées a augmenté de 0.08 $ par unité.',
        correlation: 'Le contrat d’approvisionnement a expiré sans renouvellement de volume à l’avance.',
        rootHypothesis: 'La PME achète en petits lots d’urgence plutôt qu’avec une pré-commande trimestrielle groupée.',
        estimatedFinancialImpact: '-4 500 $ CAD par mois',
        calculatedPriority: 86
      }
    ],
    recommendations: [
      {
        id: 'recf-1',
        diagnosticId: 'diagf-1',
        domain: 'Opérations',
        title: 'Négocier un contrat cadre de 6 mois avec le distributeur d’aluminium de Trois-Rivières',
        problem: 'Achat au comptant au prix spot avec pénalité de petit volume.',
        rationale: 'Un engagement sur 60 000 canettes permet de récupérer un rabais de volume de 12%.',
        suggestedAction: 'Valider l’entente semestrielle avec échelonnement des livraisons mensuelles pour ne pas saturer l’entrepôt.',
        estimatedFinancialGain: 3900,
        requiredRole: 'Maître Brasseur & Directeur Général',
        urgency: 'Haute',
        deadlineDays: 5,
        status: 'en_attente'
      }
    ],
    decisionLedger: [],
    actions: [],
    connectors: [
      {
        id: 'connf-1',
        name: 'Acomba Comptabilité PME',
        category: 'Comptabilité',
        logoType: 'acomba',
        status: 'synchronise',
        lastSync: 'Il y a 25 min',
        itemsProcessed: 680,
        description: 'Module manufacturier et facturation des distributeurs québécois.'
      },
      {
        id: 'connf-2',
        name: 'Square Salon de Dégustation',
        category: 'Point de Vente',
        logoType: 'square',
        status: 'synchronise',
        lastSync: 'Il y a 5 min',
        itemsProcessed: 210,
        description: 'Ventes sur place, pourboires et verres dégustés au bar du Fjord.'
      }
    ]
  }
};
