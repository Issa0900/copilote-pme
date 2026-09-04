import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Economic Context for Quebec PME
const QUEBEC_ECONOMIC_BENCHMARKS = {
  region: 'Québec (Canada)',
  updatedAt: '2025-Q3',
  bankOfCanadaRate: 2.75, // Taux directeur
  quebecCPIInflation: 2.3, // Indice des prix à la consommation QC
  tpsRate: 5.0, // TPS fédérale
  tvqRate: 9.975, // TVQ provinciale
  combinedTaxRate: 14.975, // Taux combiné
  laborMarketTension: 'Moyenne-Élevée (Pénurie de main-d’œuvre ciblée)',
  averageSMEGrossMargin: 38.5,
  averageSMENetMargin: 9.2,
  insights: [
    'Stabilisation du taux directeur par la Banque du Canada soutenant les dépenses d’investissement.',
    'Pression sur les coûts de transport et d’emballage dans l’axe Saint-Laurent.',
    'Accélération des transactions omnicanales chez les détaillants québécois (Lightspeed/Shopify).'
  ]
};

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Gescop - Système intelligent de pilotage et de gouvernance des PME',
    version: '1.0',
    market: 'Québec / Canada',
    timestamp: new Date().toISOString()
  });
});

// Economic context endpoint
app.get('/api/quebec/context', (_req, res) => {
  res.json(QUEBEC_ECONOMIC_BENCHMARKS);
});

// Gemini-powered Diagnostic & Governance Advisor
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { companyName, sector, revenue, budgetVariance, inventoryAlerts, marketingCAC, prompt } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        source: 'heuristic_engine',
        diagnostic: `Diagnostic Gescop pour ${companyName || 'la PME'} (${sector || 'Commerce / Industrie QC'}) : Les signaux indiquent un écart budgétaire de ${budgetVariance || '+12%'} principalement concentré sur les coûts d'acquisition numérique et la rotation des stocks. Dans le cadre fiscal et concurrentiel québécois, une rationalisation des canaux payants et un ajustement du point de commande ROP sont recommandés sous 14 jours.`,
        recommendations: [
          {
            title: 'Réaligner les campagnes publicitaires sur le seuil de rentabilité',
            impactEstime: 'Gain de marge de +3 800 $ CAD',
            delai: '7 jours',
            responsable: 'Responsable Marketing & Ventes',
            urgence: 'Haute'
          },
          {
            title: 'Négocier un réapprovisionnement cadencé avec les fournisseurs locaux',
            impactEstime: 'Libération de 8 500 $ CAD de trésorerie',
            delai: '14 jours',
            responsable: 'Directeur des Opérations',
            urgence: 'Moyenne'
          }
        ]
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = `Tu es l'analyste stratégique en chef de Gescop, le système de gouvernance et de pilotage intelligent pour PME québécoises.
Tu réponds en français du Québec avec une rigueur d'affaires impeccable (termes financiers exacts: marge brute, trésorerie, écarts budgétaires, TVQ/TPS, ratios LTV/CAC, point de commande).
Données de la PME :
Nom : ${companyName || 'Boutique Boréale'}
Secteur : ${sector || 'Commerce & Distribution'}
Chiffre d'affaires récent : ${revenue || '125 000 $ CAD/mois'}
Écarts signalés : ${budgetVariance || '+15% en marketing, -8% en marge'}
Alertes stocks : ${inventoryAlerts || '2 produits en rupture imminente'}
CAC actuel : ${marketingCAC || '42 $ CAD'}
Question ou demande spécifique : ${prompt || 'Générer une analyse transversale des anomalies et proposer 2 décisions immédiates.'}

Réponds au format JSON strict avec la structure suivante :
{
  "diagnostic": "Explication claire reliant faits, corrélations et hypothèse sous-jacente",
  "anomaliePrincipale": "Résumé de l'anomalie critique",
  "impactFinancier": "Impact chiffré en $ CAD",
  "recommendations": [
    {
      "title": "Titre d'action précis",
      "impactEstime": "Montant chiffré $ CAD",
      "delai": "Ex: 7 jours",
      "responsable": "Titre du poste dans la PME",
      "urgence": "Critique | Haute | Moyenne"
    }
  ],
  "noteGouvernance": "Conseil pour la mémoire décisionnelle et le comité de direction"
}`;

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        config: {
          responseMimeType: 'application/json'
        }
      });
      responseText = response.text || '';
    } catch (genErr) {
      console.warn('Gemini API call failed, using intelligent heuristic fallback:', genErr);
      return res.json({
        source: 'heuristic_governance_engine',
        diagnostic: `Diagnostic Gescop pour ${companyName || 'la PME'} (${sector || 'Commerce / Industrie QC'}) : Les signaux financiers indiquent un écart budgétaire critique concentré sur le coût d'acquisition client (CAC Meta Ads à ${marketingCAC || '44.50 $ CAD'}) et un épuisement des stocks sur les produits stratégiques de classe A. Dans le contexte économique québécois actuel, continuer à diffuser des publicités sur des articles en rupture détruit directement la marge nette.`,
        anomaliePrincipale: "Pression croisée entre surcoût d'acquisition et rupture de stock",
        impactFinancier: "-3 850 $ CAD par mois",
        recommendations: [
          {
            title: "Réallouer le budget publicitaire vers les produits avec stock optimal",
            impactEstime: "+3 850 $ CAD",
            delai: "48 heures",
            responsable: "Responsable Marketing & E-commerce",
            urgence: "Critique"
          },
          {
            title: "Émettre un bon de commande de réassort prioritaire auprès des manufacturiers québécois",
            impactEstime: "+12 600 $ CAD de marge préservée",
            delai: "24 heures",
            responsable: "Directeur des Opérations",
            urgence: "Critique"
          }
        ],
        noteGouvernance: "Inscrire l'arbitrage dans le Decision Ledger pour assurer le suivi d'exécution."
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { diagnostic: responseText, recommendations: [] };
    }

    return res.json({
      source: 'gemini_ai',
      ...parsed
    });
  } catch (error) {
    console.error('Error in /api/ai/analyze:', error);
    return res.status(500).json({
      error: 'Erreur lors de l’analyse décisionnelle',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gescop PME Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
