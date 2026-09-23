import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Receipt, 
  DollarSign, 
  MapPin, 
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { Consultant, Visit } from '../types';

interface VisitedVsActivatedListProps {
  consultants: Consultant[];
  validVisits: Visit[];
  onNavigateToTab?: (tab: string) => void;
}

const MONTH_LABELS: Record<string, string> = {
  '2026-07': 'Julho/26',
  '2026-08': 'Agosto/26',
  '2026-09': 'Setembro/26',
  '2026-10': 'Outubro/26',
};

export const VisitedVsActivatedList: React.FC<VisitedVsActivatedListProps> = ({
  consultants,
  validVisits,
  onNavigateToTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activated' | 'repurchase' | 'first' | 'reactivated' | 'prospecting'>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'Ativo' | 'Inativo' | 'Nunca Comprou'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Available months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    validVisits.forEach(v => {
      if (v.date) {
        const mKey = v.date.substring(0, 7);
        if (mKey.length === 7) monthsSet.add(mKey);
      }
    });
    return Array.from(monthsSet).sort();
  }, [validVisits]);

  // Classify all visits into standardized Origin and Post-Visit status
  const classifiedClients = useMemo(() => {
    return validVisits.map((v, index) => {
      const rawStatus = (v.customerStatus || '').trim().toUpperCase();
      const ordersBefore = v.ordersBeforeVisit ?? 0;
      const ordersAfter = v.ordersAfterVisit ?? (v.dealClosed ? 1 : 0);
      const revenueAfter = v.revenueAfterVisit || v.returnValue || 0;

      const isPositivated = Boolean(
        ordersAfter > 0 || 
        revenueAfter > 0 || 
        v.dealClosed || 
        v.dealStatus === 'Negócio Fechado'
      );

      const isInactive = rawStatus.includes('INATIVO') || rawStatus.includes('HÁ MAIS DE 60') || rawStatus.includes('> 60') || rawStatus.includes('>60');
      const isNever = rawStatus.includes('NUNCA') || rawStatus.includes('PROSPEC') || rawStatus.includes('SEM CADASTRO') || (rawStatus === '' && ordersBefore === 0);
      const isAtivo = (rawStatus.includes('ATIVO') && !rawStatus.includes('INATIVO')) || rawStatus.includes('ÚLTIMOS 60') || ordersBefore > 0;

      // Status Origin
      let originCategory: 'Ativo' | 'Inativo' | 'Nunca Comprou' = 'Nunca Comprou';
      if (isInactive) originCategory = 'Inativo';
      else if (isAtivo) originCategory = 'Ativo';

      // Status Post-Visit
      let postVisitStatus: 'Ativo Recompra' | '1ª Compra (Novo)' | 'Reativação (>60d)' | 'Em Negociação' = 'Em Negociação';
      let postVisitBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

      if (isPositivated) {
        if (isInactive) {
          postVisitStatus = 'Reativação (>60d)';
          postVisitBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
        } else if (isNever && !isAtivo) {
          postVisitStatus = '1ª Compra (Novo)';
          postVisitBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else {
          postVisitStatus = 'Ativo Recompra';
          postVisitBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        }
      }

      const monthKey = (v.date || '').substring(0, 7);

      return {
        id: v.id || `visit-${index}`,
        clientName: v.clientName || 'Cliente sem nome',
        clientCode: v.clientCode,
        cnpj: v.cnpj,
        city: v.city || '—',
        state: v.state || '—',
        date: v.date || '—',
        monthKey,
        consultantName: v.consultantName || 'Consultor',
        consultantId: v.consultantId,
        originStatus: v.customerStatus || originCategory,
        originCategory,
        isPositivated,
        postVisitStatus,
        postVisitBadgeColor,
        ordersBefore,
        ordersAfter,
        revenueAfter,
        notes: v.notes,
        dealStatus: v.dealStatus,
      };
    });
  }, [validVisits]);

  // Clients filtered by selected month and consultant for KPI metrics
  const scopeClients = useMemo(() => {
    return classifiedClients.filter(c => {
      if (monthFilter !== 'all' && c.monthKey !== monthFilter) return false;
      if (consultantFilter !== 'all' && c.consultantId !== consultantFilter && c.consultantName !== consultantFilter) return false;
      return true;
    });
  }, [classifiedClients, monthFilter, consultantFilter]);

  // Scoped KPIs
  const totalVisited = scopeClients.length;
  const activatedClients = useMemo(() => scopeClients.filter(c => c.isPositivated), [scopeClients]);
  const totalActivated = activatedClients.length;
  const totalOrders = useMemo(() => scopeClients.reduce((acc, curr) => acc + curr.ordersAfter, 0), [scopeClients]);
  const totalRevenue = useMemo(() => scopeClients.reduce((acc, curr) => acc + curr.revenueAfter, 0), [scopeClients]);
  const overallConversion = totalVisited > 0 ? (totalActivated / totalVisited) * 100 : 0;

  // Origin breakdown
  const ativosVisited = useMemo(() => scopeClients.filter(c => c.originCategory === 'Ativo').length, [scopeClients]);
  const ativosBought = useMemo(() => scopeClients.filter(c => c.originCategory === 'Ativo' && c.isPositivated).length, [scopeClients]);
  const ativosRate = ativosVisited > 0 ? (ativosBought / ativosVisited) * 100 : 0;

  const inativosVisited = useMemo(() => scopeClients.filter(c => c.originCategory === 'Inativo').length, [scopeClients]);
  const inativosBought = useMemo(() => scopeClients.filter(c => c.originCategory === 'Inativo' && c.isPositivated).length, [scopeClients]);
  const inativosRate = inativosVisited > 0 ? (inativosBought / inativosVisited) * 100 : 0;

  const novosVisited = useMemo(() => scopeClients.filter(c => c.originCategory === 'Nunca Comprou').length, [scopeClients]);
  const novosBought = useMemo(() => scopeClients.filter(c => c.originCategory === 'Nunca Comprou' && c.isPositivated).length, [scopeClients]);
  const novosRate = novosVisited > 0 ? (novosBought / novosVisited) * 100 : 0;

  // Comparison Bar Chart Data by Consultant (Filtered by Month if active)
  const consultantComparisonData = useMemo(() => {
    return consultants.map(c => {
      const cList = classifiedClients.filter(cl => {
        if (monthFilter !== 'all' && cl.monthKey !== monthFilter) return false;
        return cl.consultantId === c.id || cl.consultantName === c.name;
      });
      const visited = cList.length;
      const activated = cList.filter(cl => cl.isPositivated).length;
      const atvVis = cList.filter(cl => cl.originCategory === 'Ativo').length;
      const atvBou = cList.filter(cl => cl.originCategory === 'Ativo' && cl.isPositivated).length;
      const inatVis = cList.filter(cl => cl.originCategory === 'Inativo').length;
      const inatBou = cList.filter(cl => cl.originCategory === 'Inativo' && cl.isPositivated).length;
      const novVis = cList.filter(cl => cl.originCategory === 'Nunca Comprou').length;
      const novBou = cList.filter(cl => cl.originCategory === 'Nunca Comprou' && cl.isPositivated).length;

      const rate = visited > 0 ? (activated / visited) * 100 : 0;

      return {
        name: c.name.split(' ')[0],
        fullName: c.name,
        Visitados: visited,
        Ativados: activated,
        Ativos_Visitados: atvVis,
        Ativos_Compraram: atvBou,
        Inativos_Visitados: inatVis,
        Inativos_Compraram: inatBou,
        Novos_Visitados: novVis,
        Novos_Compraram: novBou,
        Taxa: rate,
      };
    });
  }, [consultants, classifiedClients, monthFilter]);

  // Fully Filtered clients list for the table
  const filteredClients = useMemo(() => {
    return classifiedClients.filter(item => {
      // Month filter
      if (monthFilter !== 'all' && item.monthKey !== monthFilter) {
        return false;
      }

      // Consultant filter
      if (consultantFilter !== 'all' && item.consultantId !== consultantFilter && item.consultantName !== consultantFilter) {
        return false;
      }

      // Origin profile filter
      if (originFilter !== 'all' && item.originCategory !== originFilter) {
        return false;
      }

      // Post-visit Status filter
      if (statusFilter === 'activated' && !item.isPositivated) return false;
      if (statusFilter === 'repurchase' && item.postVisitStatus !== 'Ativo Recompra') return false;
      if (statusFilter === 'first' && item.postVisitStatus !== '1ª Compra (Novo)') return false;
      if (statusFilter === 'reactivated' && item.postVisitStatus !== 'Reativação (>60d)') return false;
      if (statusFilter === 'prospecting' && item.postVisitStatus !== 'Em Negociação') return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.clientName.toLowerCase().includes(query);
        const matchCity = item.city.toLowerCase().includes(query);
        const matchState = item.state.toLowerCase().includes(query);
        const matchConsultant = item.consultantName.toLowerCase().includes(query);
        const matchCnpj = item.cnpj?.toLowerCase().includes(query) || false;
        const matchCode = item.clientCode?.toLowerCase().includes(query) || false;
        if (!matchName && !matchCity && !matchState && !matchConsultant && !matchCnpj && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [classifiedClients, monthFilter, consultantFilter, originFilter, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 mb-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Lista de Clientes Visitados & Ativação Pós-Visita
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Relação completa e cruzamento de clientes visitados por perfil de entrada (<strong>Ativo</strong>, <strong>Inativo</strong> ou <strong>Nunca comprou</strong>) e confirmação de pedidos pós-visita
          </p>
        </div>

        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('info-ped')}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer self-start lg:self-auto"
          >
            <span>Ver Relatório Completo INFO-PED</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Origin Profile Ribbon for Filtered Scope */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-6">
        {/* Ativos */}
        <div 
          onClick={() => { setOriginFilter(prev => prev === 'Ativo' ? 'all' : 'Ativo'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            originFilter === 'Ativo' 
              ? 'bg-blue-100/80 border-blue-400 ring-2 ring-blue-300' 
              : 'bg-blue-50/70 hover:bg-blue-50 border-blue-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">🔵 Ativos Visitados</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-blue-950">{ativosBought}</span>
            <span className="text-xs text-blue-800 font-semibold">de {ativosVisited} visitados</span>
          </div>
          <span className="text-[10px] text-blue-700 font-bold block mt-1">
            {ativosRate.toFixed(1)}% recompra pós-visita
          </span>
        </div>

        {/* Inativos */}
        <div 
          onClick={() => { setOriginFilter(prev => prev === 'Inativo' ? 'all' : 'Inativo'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            originFilter === 'Inativo' 
              ? 'bg-purple-100/80 border-purple-400 ring-2 ring-purple-300' 
              : 'bg-purple-50/70 hover:bg-purple-50 border-purple-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">🟣 Inativos (&gt;60d) Visitados</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-purple-950">{inativosBought}</span>
            <span className="text-xs text-purple-800 font-semibold">de {inativosVisited} visitados</span>
          </div>
          <span className="text-[10px] text-purple-700 font-bold block mt-1">
            {inativosRate.toFixed(1)}% reativação pós-visita
          </span>
        </div>

        {/* Novos */}
        <div 
          onClick={() => { setOriginFilter(prev => prev === 'Nunca Comprou' ? 'all' : 'Nunca Comprou'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            originFilter === 'Nunca Comprou' 
              ? 'bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-300' 
              : 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">🟢 Novos / Nunca Comprou</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-950">{novosBought}</span>
            <span className="text-xs text-emerald-800 font-semibold">de {novosVisited} visitados</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold block mt-1">
            {novosRate.toFixed(1)}% 1ª compra pós-visita
          </span>
        </div>

        {/* Total Scoped */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Ativados no Escopo</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-white">{totalActivated}</span>
            <span className="text-xs text-slate-300 font-semibold">de {totalVisited} visitados</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block mt-1">
            {overallConversion.toFixed(1)}% conversão • {totalOrders} pedidos
          </span>
        </div>
      </div>

      {/* Visual Chart: Visitados vs Ativados por Consultor */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Comparativo: Clientes Visitados vs. Compraram Pós-Visita</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            {monthFilter === 'all' ? 'Todos os meses acumulados' : `Mês de ${MONTH_LABELS[monthFilter] || monthFilter}`}
          </span>
        </div>

        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consultantComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                formatter={(val: any, name: any, item: any) => {
                  if (name === 'Visitados') return [`${val} clientes visitados`, name];
                  if (name === 'Compraram') return [`${val} clientes compraram (${item.payload.Taxa.toFixed(1)}%)`, name];
                  return [val, name];
                }}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 8px 12px -2px rgba(0,0,0,0.06)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '8px' }} />
              <Bar dataKey="Visitados" fill="#2563eb" radius={[6, 6, 0, 0]} name="Visitados" />
              <Bar dataKey="Ativados" fill="#10b981" radius={[6, 6, 0, 0]} name="Compraram" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, CNPJ, cidade ou consultor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">📅 Todos os Meses</option>
            {availableMonths.map(mKey => (
              <option key={mKey} value={mKey}>{MONTH_LABELS[mKey] || mKey}</option>
            ))}
          </select>

          {/* Consultant Filter */}
          <select
            value={consultantFilter}
            onChange={(e) => {
              setConsultantFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">👤 Todos os Consultores</option>
            {consultants.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Profile Origin Filter */}
          <select
            value={originFilter}
            onChange={(e) => {
              setOriginFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">🏢 Todos os Perfis</option>
            <option value="Ativo">🔵 Ativos (Últimos 60d)</option>
            <option value="Inativo">🟣 Inativos (&gt;60d)</option>
            <option value="Nunca Comprou">🟢 Nunca Comprou / Novo</option>
          </select>

          {/* Quick Status Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setStatusFilter('activated'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'activated' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              🟢 Compraram ({totalActivated})
            </button>
            <button
              onClick={() => { setStatusFilter('prospecting'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'prospecting' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Em Negociação ({totalVisited - totalActivated})
            </button>
          </div>
        </div>
      </div>

      {/* Table of Visited Clients & Activation Status */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] uppercase text-slate-500 font-bold border-b border-slate-200 bg-slate-50/70">
              <th className="py-3 px-4">Cliente / Local</th>
              <th className="py-3 px-3">Consultor & Mês</th>
              <th className="py-3 px-3">Perfil de Origem</th>
              <th className="py-3 px-3">Resultado Pós-Visita</th>
              <th className="py-3 px-3 text-center">Pedidos</th>
              <th className="py-3 px-4 text-right">Faturamento Gerado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                  Nenhum cliente encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              paginatedClients.map((client) => {
                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 max-w-[240px] truncate" title={client.clientName}>
                        {client.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{client.city} - {client.state}</span>
                        {client.clientCode && (
                          <span className="text-slate-400">#{client.clientCode}</span>
                        )}
                      </div>
                    </td>

                    {/* Consultor & Data */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 block">
                        {client.consultantName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {client.date}
                      </span>
                    </td>

                    {/* Perfil de Entrada (Ativo / Inativo / Nunca Comprou) */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                        client.originCategory === 'Ativo'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : client.originCategory === 'Inativo'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {client.originCategory === 'Ativo' ? '🔵 Ativo (<60d)' : client.originCategory === 'Inativo' ? '🟣 Inativo (>60d)' : '🟢 Nunca Comprou'}
                      </span>
                      {client.ordersBefore > 0 && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {client.ordersBefore} pedidos anteriores
                        </span>
                      )}
                    </td>

                    {/* Resultado Pós-Visita */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border ${client.postVisitBadgeColor}`}>
                          {client.postVisitStatus}
                        </span>
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="py-3 px-3 text-center">
                      {client.ordersAfter > 0 ? (
                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                          {client.ordersAfter} {client.ordersAfter === 1 ? 'pedido' : 'pedidos'}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>

                    {/* Faturamento */}
                    <td className="py-3 px-4 text-right">
                      {client.revenueAfter > 0 ? (
                        <div>
                          <span className="font-black text-slate-900 block">
                            R$ {client.revenueAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">Faturado Pós-Visita</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">Em Negociação</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <div>
          Mostrando <span className="font-bold text-slate-800">{paginatedClients.length}</span> de <span className="font-bold text-slate-800">{filteredClients.length}</span> clientes encontrados
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-bold text-slate-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
