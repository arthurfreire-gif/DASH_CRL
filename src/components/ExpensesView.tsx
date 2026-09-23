import React, { useState, useMemo } from 'react';
import { Expense, Consultant } from '../types';
import { 
  Receipt, 
  Trash2, 
  PlusCircle, 
  Search, 
  Tag, 
  Calendar, 
  Layers, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Plane,
  Compass,
  Building2,
  DollarSign,
  RotateCcw
} from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  consultants: Consultant[];
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
  onResetToOfficial?: () => void;
}

function parseExpenseDate(dateStr: string) {
  if (!dateStr) return { iso: '9999-99-99', formatted: 'Sem Data', dayOfWeek: '', monthYear: 'Sem Período', timestamp: 0 };
  
  let y = 2026, m = 1, d = 1;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    }
  }
  
  const dateObj = new Date(y, m - 1, d);
  const formatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const dayOfWeek = days[dateObj.getDay()] || '';
  const monthYear = `${months[m - 1]} / ${y}`;
  
  return {
    iso,
    formatted,
    dayOfWeek,
    monthYear,
    timestamp: dateObj.getTime()
  };
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  consultants,
  onAddExpense,
  onDeleteExpense,
  onResetToOfficial,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'trip' | 'date' | 'flat'>('trip');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({});

  const getConsultant = (id: string) => {
    return consultants.find(c => c.id === id);
  };

  const getConsultantName = (id: string) => {
    return getConsultant(id)?.name || 'Consultor Não Mapeado';
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const consultantName = getConsultantName(expense.consultantId);
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.clientName && expense.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        consultantName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      const matchesConsultant = consultantFilter === 'all' || expense.consultantId === consultantFilter;

      return matchesSearch && matchesCategory && matchesConsultant;
    }).sort((a, b) => {
      const timeA = parseExpenseDate(a.date).timestamp;
      const timeB = parseExpenseDate(b.date).timestamp;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [expenses, searchTerm, categoryFilter, consultantFilter, sortOrder, consultants]);

  // Group by Trip (Viagem / Rota / Destino)
  const tripsData = useMemo(() => {
    const map = new Map<string, {
      tripKey: string;
      tripName: string;
      consultantId: string;
      consultantName: string;
      consultantRegion: string;
      consultantAvatar: string;
      totalAmount: number;
      startDate: string;
      endDate: string;
      categoriesBreakdown: Record<string, number>;
      items: Expense[];
    }>();

    filteredExpenses.forEach(expense => {
      const tripDestination = (expense.clientName || 'Despesas Gerais de Rota').trim();
      const tripKey = `${expense.consultantId}__${tripDestination}`;
      const consultant = getConsultant(expense.consultantId);

      if (!map.has(tripKey)) {
        map.set(tripKey, {
          tripKey,
          tripName: tripDestination,
          consultantId: expense.consultantId,
          consultantName: consultant?.name || 'Consultor',
          consultantRegion: consultant?.region || 'Região Comercial',
          consultantAvatar: consultant?.avatar || '',
          totalAmount: 0,
          startDate: expense.date,
          endDate: expense.date,
          categoriesBreakdown: {},
          items: []
        });
      }

      const trip = map.get(tripKey)!;
      trip.totalAmount += expense.amount;
      trip.items.push(expense);

      // Category breakdown
      trip.categoriesBreakdown[expense.category] = (trip.categoriesBreakdown[expense.category] || 0) + expense.amount;

      // Dates tracking
      if (new Date(expense.date) < new Date(trip.startDate)) trip.startDate = expense.date;
      if (new Date(expense.date) > new Date(trip.endDate)) trip.endDate = expense.date;
    });

    const result = Array.from(map.values());
    result.sort((a, b) => {
      const timeA = parseExpenseDate(a.endDate).timestamp;
      const timeB = parseExpenseDate(b.endDate).timestamp;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [filteredExpenses, sortOrder, consultants]);

  // Group by Date
  const dateGroups = useMemo(() => {
    const map = new Map<string, { date: string; formatted: string; dayOfWeek: string; subtotal: number; items: Expense[] }>();
    filteredExpenses.forEach(exp => {
      const parsed = parseExpenseDate(exp.date);
      if (!map.has(parsed.formatted)) {
        map.set(parsed.formatted, {
          date: exp.date,
          formatted: parsed.formatted,
          dayOfWeek: parsed.dayOfWeek,
          subtotal: 0,
          items: []
        });
      }
      const g = map.get(parsed.formatted)!;
      g.subtotal += exp.amount;
      g.items.push(exp);
    });
    return Array.from(map.values());
  }, [filteredExpenses]);

  // Toggle trip expand
  const toggleTrip = (tripKey: string) => {
    setExpandedTrips(prev => ({
      ...prev,
      [tripKey]: prev[tripKey] === undefined ? false : !prev[tripKey]
    }));
  };

  const isTripExpanded = (tripKey: string) => {
    return expandedTrips[tripKey] !== false;
  };

  const expandAllTrips = () => {
    const updated: Record<string, boolean> = {};
    tripsData.forEach(t => { updated[t.tripKey] = true; });
    setExpandedTrips(updated);
  };

  const collapseAllTrips = () => {
    const updated: Record<string, boolean> = {};
    tripsData.forEach(t => { updated[t.tripKey] = false; });
    setExpandedTrips(updated);
  };

  // KPIs
  const totalFilteredAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalTripsCount = tripsData.length;
  const avgTripCost = totalTripsCount > 0 ? totalFilteredAmount / totalTripsCount : 0;
  const maxTrip = tripsData.length > 0 ? [...tripsData].sort((a, b) => b.totalAmount - a.totalAmount)[0] : null;

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Passagens & Transporte':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Alimentação':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Hospedagem':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Jantares de Negócios':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Eventos & Brindes':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Plane className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Despesas & Investimento por Viagem</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Custos consolidados de deslocamento, alimentação, hospedagem e apoio por rota e viagem
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onResetToOfficial && (
              <button
                onClick={() => {
                  if (window.confirm('Deseja recarregar a base com todas as despesas do relatório oficial de Junho e Julho/2026?')) {
                    onResetToOfficial();
                  }
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-300"
                title="Restaurar dados oficiais da planilha"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restaurar Relatório Oficial</span>
              </button>
            )}
            <button
              onClick={onAddExpense}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Despesa</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Summary Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Investido</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                R$ {totalFilteredAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 bg-indigo-100/70 text-indigo-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Viagens Mapeadas</p>
              <p className="text-lg font-bold text-indigo-700 mt-0.5">
                {totalTripsCount} {totalTripsCount === 1 ? 'viagem' : 'viagens'}
              </p>
            </div>
            <div className="p-2.5 bg-sky-100/70 text-sky-600 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Média por Viagem</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                R$ {avgTripCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-100/70 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Maior Investimento</p>
              <p className="text-xs font-bold text-slate-900 truncate max-w-[130px] mt-0.5" title={maxTrip?.tripName || 'N/A'}>
                {maxTrip ? maxTrip.tripName : 'Nenhum'}
              </p>
              <p className="text-xs font-semibold text-rose-600">
                {maxTrip ? `R$ ${maxTrip.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
              </p>
            </div>
            <div className="p-2.5 bg-rose-100/70 text-rose-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar viagem, cidade, consultor ou gasto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-4 h-4" />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todas as Categorias de Gasto</option>
              <option value="Passagens & Transporte">Passagens & Transporte</option>
              <option value="Hospedagem">Hospedagem</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Jantares de Negócios">Jantares de Negócios</option>
              <option value="Eventos & Brindes">Eventos & Brindes</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={consultantFilter}
              onChange={(e) => setConsultantFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todos os Consultores</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Modo de Visualização:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('trip')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'trip' 
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Por Viagem</span>
              </button>
              <button
                onClick={() => setViewMode('date')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'date' 
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Por Data</span>
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'flat' 
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Tabela Geral</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'trip' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllTrips}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Expandir Todas
                </button>
                <button
                  onClick={collapseAllTrips}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Recolher Todas
                </button>
              </div>
            )}

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigas'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}

      {/* 1. SEPARAÇÃO POR VIAGEM (DEFAULT / RECOMMENDED) */}
      {viewMode === 'trip' && (
        <div className="space-y-4">
          {tripsData.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <Plane className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600">Nenhuma viagem encontrada com os filtros atuais.</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste a busca ou os filtros de consultor e categoria.</p>
            </div>
          ) : (
            tripsData.map((trip) => {
              const expanded = isTripExpanded(trip.tripKey);
              const startParsed = parseExpenseDate(trip.startDate);
              const endParsed = parseExpenseDate(trip.endDate);
              const dateRangeText = trip.startDate === trip.endDate 
                ? startParsed.formatted 
                : `${startParsed.formatted} a ${endParsed.formatted}`;

              return (
                <div 
                  key={trip.tripKey}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
                >
                  {/* Trip Card Header */}
                  <div 
                    onClick={() => toggleTrip(trip.tripKey)}
                    className="p-5 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            {trip.tripName}
                          </h3>
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {trip.items.length} {trip.items.length === 1 ? 'despesa' : 'despesas'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            👤 {trip.consultantName}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            📍 {trip.consultantRegion}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            🗓️ {dateRangeText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Trip Financial Summary & Expand Toggle */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] font-medium text-slate-500">Investimento Total na Viagem</p>
                        <p className="text-lg font-bold text-rose-600 tracking-tight">
                          R$ {trip.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown Badges */}
                  <div className="px-5 py-2.5 bg-slate-50/70 border-t border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium text-[11px]">Categorias:</span>
                    {Object.entries(trip.categoriesBreakdown).map(([cat, val]) => (
                      <span 
                        key={cat}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${getCategoryBadgeClass(cat)}`}
                      >
                        <span>{cat}:</span>
                        <strong className="font-bold">R$ {Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    ))}
                  </div>

                  {/* Trip Detailed Expenses Table */}
                  {expanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/60 text-slate-600 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-6">Categoria</th>
                            <th className="py-2.5 px-4">Descrição do Lançamento</th>
                            <th className="py-2.5 px-4">Data</th>
                            <th className="py-2.5 px-4 text-right">Valor (R$)</th>
                            <th className="py-2.5 px-6 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {trip.items.map((expense) => {
                            const parsed = parseExpenseDate(expense.date);
                            return (
                              <tr key={expense.id} className="hover:bg-slate-50/90 transition-colors bg-white">
                                <td className="py-3 px-6">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getCategoryBadgeClass(expense.category)}`}>
                                    {expense.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-800">
                                  {expense.description}
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{parsed.formatted}</span>
                                    {parsed.dayOfWeek && (
                                      <span className="text-[10px] text-slate-400">({parsed.dayOfWeek.split('-')[0]})</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-slate-900">
                                  R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-6 text-center">
                                  <button
                                    onClick={() => onDeleteExpense(expense.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Excluir este lançamento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-200">
                            <td colSpan={3} className="py-2.5 px-6 font-semibold text-slate-700 text-xs">
                              Subtotal da Viagem: {trip.tripName}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-rose-600 text-sm">
                              R$ {trip.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. SEPARAÇÃO POR DATA */}
      {viewMode === 'date' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Consultor</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Viagem / Destino</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4 text-right">Valor (R$)</th>
                  <th className="py-3.5 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {dateGroups.map((group) => (
                  <React.Fragment key={group.formatted}>
                    <tr className="bg-slate-100/90 border-t-2 border-slate-200">
                      <td colSpan={7} className="py-2 px-6">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{group.formatted}</span>
                            {group.dayOfWeek && <span className="font-normal text-slate-500">({group.dayOfWeek})</span>}
                            <span className="text-[11px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {group.items.length} itens
                            </span>
                          </div>
                          <div className="font-bold text-slate-900">
                            Subtotal: R$ {group.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {group.items.map(expense => (
                      <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {getConsultantName(expense.consultantId)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getCategoryBadgeClass(expense.category)}`}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {expense.clientName || 'Geral / Rota'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs truncate" title={expense.description}>
                          {expense.description}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {parseExpenseDate(expense.date).formatted}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600 text-sm">
                          R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={() => onDeleteExpense(expense.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Despesa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TABELA GERAL / LISTA CONTÍNUA */}
      {viewMode === 'flat' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Consultor</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Viagem / Destino</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4 text-right">Valor (R$)</th>
                  <th className="py-3.5 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {getConsultantName(expense.consultantId)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryBadgeClass(expense.category)}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {expense.clientName || 'Geral / Rota'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs truncate" title={expense.description}>
                      {expense.description}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {parseExpenseDate(expense.date).formatted}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Despesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
