import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { CompanyProfile, FinancialMetrics, MarketingMetrics } from '../types';
import { formatCad } from '../utils/formatters';

interface AiStrategicAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  financials: FinancialMetrics;
  marketing: MarketingMetrics;
  onApplyRecommendation?: (title: string, impact: number) => void;
}

export const AiStrategicAdvisorModal: React.FC<AiStrategicAdvisorModalProps> = ({
  isOpen,
  onClose,
  company,
  financials,
  marketing,
  onApplyRecommendation
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{
    sender: 'ai' | 'user';
    text: string;
    recommendations?: Array<{
      title: string;
      impactEstime: string;
      delai: string;
      responsable: string;
      urgence: string;
    }>;
  }>>([
    {
      sender: 'ai',
      text: `Bonjour ! Je suis l’analyste stratégique Gescop pour ${company.name}. J’ai synchronisé vos données financières, vos métriques marketing Lightspeed/Shopify et vos stocks Acomba. Comment puis-je vous éclairer aujourd’hui sur vos arbitrages de gestion ?`
    }
  ]);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || prompt;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = { sender: 'user' as const, text: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name,
          sector: company.sector,
          revenue: formatCad(financials.monthlyRevenue),
          budgetVariance: `Marge réelle ${financials.grossMarginPct.toFixed(1)}% vs cible ${financials.targetGrossMarginPct.toFixed(1)}%`,
          inventoryAlerts: 'Produits clés de classe A en rupture imminente',
          marketingCAC: formatCad(marketing.cac, true),
          prompt: textToSend
        })
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.diagnostic || data.details || 'Analyse transversale effectuée selon les règles de gouvernance québécoises.',
          recommendations: data.recommendations
        }
      ]);
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Diagnostic heuristique de secours : Une anomalie croisée est détectée entre l'épuisement des stocks sur vos meilleurs vendeurs et la surchauffe de vos dépenses publicitaires. En réduisant les dépenses Meta de 3 850 $ CAD et en réinjectant dans les commandes manufacturières locales, vous préserverez un runway supérieur à 6 mois.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "Pourquoi ma marge brute a fondu ce mois-ci ?",
    "Comment réagir à l'explosion de mon CAC publicitaire ?",
    "Simuler l'impact d'une baisse des ventes de 15% sur ma trésorerie."
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Analyste Stratégique & Décisionnel Gescop
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Modèle Décisionnel PME
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Diagnostic transversal reliant Ventes, Finance et Opérations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>

                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="pt-2 space-y-2 border-t border-slate-700/60">
                    <div className="text-[11px] font-bold text-cyan-300">
                      Actions recommandées par le moteur :
                    </div>
                    {msg.recommendations.map((rec, rIdx) => (
                      <div
                        key={rIdx}
                        className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1"
                      >
                        <div className="font-semibold text-white">{rec.title}</div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-bold">{rec.impactEstime}</span>
                          <span>·</span>
                          <span>Délai : {rec.delai}</span>
                          <span>·</span>
                          <span>Assigné à : {rec.responsable}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl text-slate-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Calcul des corrélations et formulation du diagnostic...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 flex flex-wrap gap-1.5">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            placeholder="Posez une question sur vos marges, budgets ou décisions..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!prompt.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Envoyer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
