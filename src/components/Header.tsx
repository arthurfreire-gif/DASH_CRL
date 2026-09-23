import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  RefreshCw, 
  Menu, 
  ChevronDown,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  onRefreshSite?: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onRefreshSite,
  searchTerm = '',
  setSearchTerm,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Painel Geral de Desempenho, Cobertura e Positivação' };
      case 'regional-clients':
        return { title: 'Clientes Por Região', subtitle: 'Mapeamento Completo da Carteira Regional & Cobertura de Visitas' };
      case 'infoped':
        return { title: 'INFO-PED', subtitle: 'Relatório Completo de Pedidos Faturados e Cruzamento de Visitas' };
      case 'expenses':
        return { title: 'Despesas & Viagens', subtitle: 'Controle de Custos e Investimentos em Campo' };
      case 'consultants':
        return { title: 'Consultores', subtitle: 'Desempenho Individual e Métricas da Equipe de Campo' };
      default:
        return { title: 'Dashboard', subtitle: 'Painel de Gestão' };
    }
  };

  const currentTabInfo = getTabTitle(activeTab);

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

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Page Title & Menu Toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2.5 rounded-2xl bg-white hover:bg-slate-100/80 border border-slate-200/90 text-slate-800 shadow-xs cursor-pointer active:scale-95 transition-all"
          title="Abrir Menu de Navegação"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {currentTabInfo.title}
          </h1>
          <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">
            {currentTabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Search, Refresh, Notifications, Profile */}
      <div className="flex items-center space-x-3 self-end sm:self-auto w-full sm:w-auto justify-end">
        {/* Search Bar matching screenshot */}
        <div className="relative w-full sm:w-64 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 bg-white/90 border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          title="Atualizar o site imediatamente"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>

        {/* Notification Bell matching screenshot */}
        <div className="relative">
          <button 
            className="w-9 h-9 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 shadow-xs cursor-pointer transition-all"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>
        </div>

        {/* User Profile matching screenshot */}
        <div className="flex items-center space-x-2 pl-1 border-l border-slate-200">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-black text-xs shadow-xs border-2 border-white shrink-0">
            AF
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
