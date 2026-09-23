import React, { useState } from 'react';
import { Consultant, Expense, Visit, FilterState, AIInsightsResponse } from '../types';
import { Sparkles, X, Loader2, TrendingUp, Award, AlertTriangle, Lightbulb } from 'lucide-react';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: Consultant[];
  expenses: Expense[];
  visits: Visit[];
  filterSummary: FilterState;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  consultants,
  expenses,
  visits,
  filterSummary,
}) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultants,
          expenses,
          visits,
          filterSummary,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar análise com IA');
      }

      setInsights(data.insights);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor de IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">IA Insights & Otimização de ROI</h3>
              <p className="text-xs text-slate-500">Análise executiva gerada por Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!insights && !loading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Deseja uma análise inteligente do seu orçamento?</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">
                A inteligência artificial avaliará o custo por visita, o retorno financeiro gerado por cada consultor e sugerirá onde alocar mais recursos para maximizar a conversão.
              </p>
              <button
                onClick={handleGenerateInsights}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Gerar Análise de Consultor & ROI</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-600">Analisando despesas, visitas e taxas de conversão...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
              {error}
              <button
                onClick={handleGenerateInsights}
                className="mt-3 block font-semibold underline cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {insights && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Visão Geral Executiva</h4>
                <p className="text-xs text-indigo-950 leading-relaxed">{insights.executiveSummary}</p>
              </div>

              {/* Top Performers */}
              {insights.topPerformers && insights.topPerformers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                    <Award className="w-4 h-4 text-emerald-600 mr-1.5" />
                    Destaques de Maior Retorno (ROI)
                  </h4>
                  <div className="space-y-2">
                    {insights.topPerformers.map((item, idx) => (
                      <div key={idx} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                        <span className="font-semibold text-emerald-900 text-xs">{item.name}</span>
                        <p className="text-xs text-emerald-800 mt-0.5">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {insights.areasForImprovement && insights.areasForImprovement.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mr-1.5" />
                    Pontos de Atenção & Despesas Elevadas
                  </h4>
                  <div className="space-y-2">
                    {insights.areasForImprovement.map((item, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <span className="font-semibold text-amber-900 text-xs">{item.name}: {item.issue}</span>
                        <p className="text-xs text-amber-800 mt-0.5"><strong className="font-medium">Recomendação:</strong> {item.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Recommendations */}
              {insights.budgetRecommendations && insights.budgetRecommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center">
                    <Lightbulb className="w-4 h-4 text-indigo-600 mr-1.5" />
                    Recomendações Estratégicas de Orçamento
                  </h4>
                  <ul className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {insights.budgetRecommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleGenerateInsights}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Regerar Análise
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
