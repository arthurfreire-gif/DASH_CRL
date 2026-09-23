import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Receipt, 
  Users, 
  UploadCloud, 
  Sparkles,
  TrendingUp,
  Pin,
  PinOff,
  ChevronRight,
  X,
  Building2
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUploadSheet: () => void;
  onOpenAIInsights: () => void;
  onRefreshSite?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUploadSheet,
  onOpenAIInsights,
  isMobileOpen = false,
  setIsMobileOpen,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Visão Geral' },
    { id: 'regional-clients', label: 'Clientes Por Região', icon: Building2, badge: 'Base Oficial' },
    { id: 'infoped', label: 'INFO-PED', icon: FileSpreadsheet, badge: 'Retorno Real' },
    { id: 'expenses', label: 'Despesas', icon: Receipt, badge: 'Viagens' },
    { id: 'consultants', label: 'Consultores', icon: Users, badge: 'Equipe' },
  ];

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const isExpanded = isPinned || isHovered || isMobileOpen;

  return (
    <>
      {/* Backdrop when expanded on mobile or floating desktop */}
      {isExpanded && !isPinned && (
        <div 
          className="fixed inset-0 bg-slate-900/15 backdrop-blur-[2px] z-40 transition-opacity duration-300"
          onClick={() => {
            setIsHovered(false);
            if (setIsMobileOpen) setIsMobileOpen(false);
          }}
          onMouseEnter={handleMouseLeave}
        />
      )}

      {/* Floating / Docked Sidebar with Mini-Rail & Hover Expansion */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white/95 backdrop-blur-2xl border-r border-slate-200/90 flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-xl ${
          // Width & Position logic
          isExpanded 
            ? 'w-72 translate-x-0 shadow-2xl shadow-slate-900/10' 
            : 'w-20 -translate-x-full lg:translate-x-0'
        } ${isMobileOpen ? 'translate-x-0' : ''}`}
      >
        <div className="p-4 flex flex-col h-full justify-between">
          <div>
            {/* Logo Brand Header & Toggle Pin */}
            <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} mb-6 pt-2 transition-all`}>
              <div 
                onClick={() => {
                  if (!isExpanded) setIsHovered(true);
                }}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-700 flex items-center justify-center text-white shadow-md shadow-slate-900/15 shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 text-blue-300" />
                </div>
                {isExpanded && (
                  <div className="overflow-hidden whitespace-nowrap animate-fadeIn">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base font-black text-slate-900 tracking-tight">SOUL ENERGY</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      ANALYTICS & VISITAS
                    </span>
                  </div>
                )}
              </div>

              {/* Pin / Close actions when expanded */}
              {isExpanded && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={`hidden lg:flex p-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                      isPinned 
                        ? 'bg-blue-50 text-blue-600 font-bold' 
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={isPinned ? 'Desafixar menu (recolher automaticamente)' : 'Fixar menu aberto na tela'}
                  >
                    {isPinned ? <Pin className="w-4 h-4 fill-blue-600" /> : <PinOff className="w-4 h-4" />}
                  </button>

                  {setIsMobileOpen && (
                    <button
                      onClick={() => setIsMobileOpen(false)}
                      className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Main Navigation List / Tabs */}
            <div className="space-y-2">
              {isExpanded && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 animate-fadeIn">
                  Menu Principal
                </div>
              )}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div key={item.id} className="relative group/tab">
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        if (!isPinned && window.innerWidth < 1024) {
                          setIsHovered(false);
                          if (setIsMobileOpen) setIsMobileOpen(false);
                        }
                      }}
                      className={`w-full flex items-center ${
                        isExpanded ? 'justify-between px-3.5' : 'justify-center px-0'
                      } py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover/tab:text-slate-800'}`} />
                        {isExpanded && <span className="whitespace-nowrap animate-fadeIn">{item.label}</span>}
                      </div>
                      {isExpanded && (
                        isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">{item.badge}</span>
                        )
                      )}
                    </button>

                    {/* Compact Tooltip when sidebar is in collapsed rail mode */}
                    {!isExpanded && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover/tab:flex items-center z-50 pointer-events-none">
                        <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap flex items-center space-x-2 animate-fadeIn">
                          <span>{item.label}</span>
                          <span className="text-[10px] text-blue-300 font-normal">({item.badge})</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Tools Section */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              {isExpanded && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 animate-fadeIn">
                  Ferramentas & Ações
                </div>
              )}
              
              {/* Sincronizar Planilha */}
              <div className="relative group/tool">
                <button
                  onClick={() => {
                    onOpenUploadSheet();
                    if (!isPinned && window.innerWidth < 1024) {
                      setIsHovered(false);
                      if (setIsMobileOpen) setIsMobileOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${
                    isExpanded ? 'space-x-3 px-3.5' : 'justify-center px-0'
                  } py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/80 border border-transparent hover:border-indigo-100 transition-all cursor-pointer`}
                >
                  <UploadCloud className="w-5 h-5 text-indigo-500 shrink-0" />
                  {isExpanded && <span className="whitespace-nowrap animate-fadeIn">Sincronizar Planilha</span>}
                </button>

                {!isExpanded && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover/tool:flex items-center z-50 pointer-events-none">
                    <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap animate-fadeIn">
                      Sincronizar Planilha de Pedidos
                    </div>
                  </div>
                )}
              </div>

              {/* Insights de IA */}
              <div className="relative group/tool">
                <button
                  onClick={() => {
                    onOpenAIInsights();
                    if (!isPinned && window.innerWidth < 1024) {
                      setIsHovered(false);
                      if (setIsMobileOpen) setIsMobileOpen(false);
                    }
                  }}
                  className={`w-full flex items-center ${
                    isExpanded ? 'space-x-3 px-3.5' : 'justify-center px-0'
                  } py-2.5 rounded-2xl text-sm font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 border border-transparent hover:border-blue-100 transition-all cursor-pointer`}
                >
                  <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
                  {isExpanded && <span className="whitespace-nowrap animate-fadeIn">Insights de IA</span>}
                </button>

                {!isExpanded && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover/tool:flex items-center z-50 pointer-events-none">
                    <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap animate-fadeIn">
                      Consultor IA Estratégico
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Badge */}
          <div className="pt-4 border-t border-slate-100">
            {isExpanded ? (
              <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 truncate">Sistema Conectado</div>
                    <div className="text-[10px] text-slate-500 font-medium">149 Pedidos Faturados</div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0">
                  v2.5
                </div>
              </div>
            ) : (
              <div className="flex justify-center" title="Sistema Conectado (149 Pedidos Faturados)">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
