import React, { useState } from 'react';
import { 
  BarChart3, 
  Receipt, 
  Users, 
  Sparkles, 
  PlusCircle, 
  FileSpreadsheet,
  TrendingUp,
  UploadCloud,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddExpense: () => void;
  onOpenAddVisit: () => void;
  onOpenAIInsights: () => void;
  onOpenUploadSheet: () => void;
  onRefreshSite?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddExpense,
  onOpenAddVisit,
  onOpenAIInsights,
  onOpenUploadSheet,
  onRefreshSite,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (onRefreshSite) {
        onRefreshSite();
      } else {
        window.location.reload();
      }
    }, 300);
  };
  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: BarChart3 },
    { id: 'infoped', label: 'INFO-PED (Visitas Realizadas)', icon: FileSpreadsheet },
    { id: 'expenses', label: 'Despesas & Viagens', icon: Receipt },
    { id: 'consultants', label: 'Consultores Externos', icon: Users },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight whitespace-nowrap">
                Consultoria de Relacionamento
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold tracking-wider leading-normal">
                Rotas Externas • 1ª e 2ª Visitas • ROI
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex space-x-1 bg-slate-100 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-70 active:scale-95"
              title="Atualizar / Recarregar o site imediatamente"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar Site'}</span>
              <span className="sm:hidden">{isRefreshing ? '...' : 'Atualizar'}</span>
            </button>

            <button
              onClick={onOpenUploadSheet}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Importar / Sincronizar Planilha Atualizada"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Sincronizar Planilha</span>
              <span className="sm:hidden">Planilha</span>
            </button>

            <button
              onClick={onOpenAIInsights}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-blue-100 hover:from-blue-800 hover:to-indigo-700 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Insights IA</span>
            </button>

            <button
              onClick={onOpenAddExpense}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Adicionar Despesa"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Despesa</span>
            </button>

            <button
              onClick={onOpenAddVisit}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Registrar Visita"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visita</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Submenu Navigation */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-100 space-x-1.5 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                isActive ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 whitespace-nowrap active:scale-95"
          title="Atualizar o site"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
        <button
          onClick={onOpenAIInsights}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Insights IA</span>
        </button>
      </div>
    </header>
  );
};

