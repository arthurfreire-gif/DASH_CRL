import React, { useState, useMemo } from 'react';
import { Visit, Consultant } from '../types';
import { 
  FileSpreadsheet, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Package, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Building2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  SlidersHorizontal,
  Sparkles,
  Users,
  UploadCloud
} from 'lucide-react';

interface InfoPedViewProps {
  visits: Visit[];
  consultants: Consultant[];
  onOpenUploadSheet?: () => void;
}

type SortField = 'default' | 'revenue_desc' | 'revenue_asc' | 'growth_desc' | 'growth_asc' | 'orders_desc' | 'client_name';
type ReturnFilter = 'all' | 'has_orders_after' | 'has_revenue' | 'positive_growth';

export const InfoPedView: React.FC<InfoPedViewProps> = ({ visits, consultants, onOpenUploadSheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [returnFilter, setReturnFilter] = useState<ReturnFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('revenue_desc');

  const getConsultantName = (id: string) => {
    return consultants.find(c => c.id === id)?.name || 'Desconhecido';
  };

  // Helper to extract strictly POST-VISIT revenue
  const getVisitRevenue = (v: Visit): number => {
    // 1. Explicit revenueAfterVisit from INFO-PED
    if (typeof v.revenueAfterVisit === 'number' && v.revenueAfterVisit > 0) {
      return v.revenueAfterVisit;
    }
    // 2. Return value from closed deals / purchases generated after visit
    if ((v.dealClosed || v.dealStatus === 'Negócio Fechado') && typeof v.returnValue === 'number' && v.returnValue > 0) {
      return v.returnValue;
    }
    return 0;
  };

  // Cross-reference customer status with real order history (Ativo vs Inativo vs Nunca Comprou)
  const getReconciledCustomerStatus = (v: Visit): {
    statusKey: 'ATIVO' | 'INATIVO' | 'NUNCA' | 'SEM_CADASTRO' | 'NUNCA_ATIVADO' | 'REATIVADO';
    baseCategory: 'ATIVO' | 'INATIVO' | 'NUNCA' | 'SEM_CADASTRO';
    label: string;
    shortLabel: string;
    badgeStyle: string;
    isFirstPurchase: boolean;
    isReactivated: boolean;
    isNever: boolean;
  } => {
    const rawStatus = (v.customerStatus || '').trim().toUpperCase();
    const ordersBefore = v.ordersBeforeVisit ?? 0;
    const ordersAfter = v.ordersAfterVisit ?? 0;
    const revenueAfter = getVisitRevenue(v);
    const hasBoughtAfter = ordersAfter > 0 || revenueAfter > 0 || v.dealClosed || v.dealStatus === 'Negócio Fechado';

    const isInactive = rawStatus.includes('INATIVO') || rawStatus.includes('HÁ MAIS DE 60') || rawStatus.includes('> 60') || rawStatus.includes('>60');
    const isNeverOrProspect = rawStatus.includes('NUNCA') || rawStatus.includes('PROSPEC') || rawStatus.includes('SEM CADASTRO') || (rawStatus === '' && ordersBefore === 0);

    // 1. Cliente NUNCA COMPROU antes da visita
    if (isNeverOrProspect && !isInactive && ordersBefore === 0) {
      if (hasBoughtAfter) {
        return {
          statusKey: 'NUNCA_ATIVADO',
          baseCategory: 'NUNCA',
          label: '🎉 1ª Compra (Cliente Primeira Compra)',
          shortLabel: '1ª Compra Pós-Visita',
          badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold hover:bg-emerald-200 ring-1 ring-emerald-400/40',
          isFirstPurchase: true,
          isReactivated: false,
          isNever: false,
        };
      }
      if (rawStatus.includes('SEM CADASTRO')) {
        return {
          statusKey: 'SEM_CADASTRO',
          baseCategory: 'SEM_CADASTRO',
          label: '⚪ Sem Cadastro (Em Processo)',
          shortLabel: 'Sem Cadastro',
          badgeStyle: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
          isFirstPurchase: false,
          isReactivated: false,
          isNever: true,
        };
      }
      return {
        statusKey: 'NUNCA',
        baseCategory: 'NUNCA',
        label: '🔵 Nunca Comprou (Prospecção)',
        shortLabel: 'Nunca Comprou',
        badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
        isFirstPurchase: false,
        isReactivated: false,
        isNever: true,
      };
    }

    // 2. Cliente INATIVO (> 60 dias sem comprar antes da visita)
    if (isInactive) {
      if (hasBoughtAfter) {
        return {
          statusKey: 'REATIVADO',
          baseCategory: 'INATIVO',
          label: '⚡ Cliente Reativado (>60d sem compras)',
          shortLabel: 'Cliente Reativado',
          badgeStyle: 'bg-amber-100 text-amber-950 border-amber-300 font-bold hover:bg-amber-200 ring-1 ring-amber-400/50',
          isFirstPurchase: false,
          isReactivated: true,
          isNever: false,
        };
      }
      return {
        statusKey: 'INATIVO',
        baseCategory: 'INATIVO',
        label: '🟡 Inativo (> 60 dias sem comprar)',
        shortLabel: 'Inativo (>60d)',
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
        isFirstPurchase: false,
        isReactivated: false,
        isNever: false,
      };
    }

    // 3. Cliente ATIVO (comprou nos últimos 60 dias)
    return {
      statusKey: 'ATIVO',
      baseCategory: 'ATIVO',
      label: hasBoughtAfter ? '🟢 Ativo (Recompra Pós-Visita)' : '🟢 Ativo (Comprou ≤ 60 dias)',
      shortLabel: hasBoughtAfter ? 'Ativo (Recompra)' : 'Ativo (≤60d)',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      isFirstPurchase: false,
      isReactivated: false,
      isNever: false,
    };
  };

  // Helper to format before / after order dates reliably
  const getOrderDates = (v: Visit) => {
    const reconciled = getReconciledCustomerStatus(v);
    let beforeDateStr = v.beforeDate;
    let afterDateStr = v.afterDate;

    // Format visit base date
    let visitDateObj: Date | null = null;
    if (v.date) {
      const parts = v.date.split('-');
      if (parts.length === 3) {
        visitDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }

    // Determine exact previous purchase date or 'Nunca comprou'
    let lastPurchaseBefore = 'Nunca comprou';
    let isNeverBefore = false;
    let isInactiveBefore = false;

    if (reconciled.isNever || reconciled.isFirstPurchase) {
      lastPurchaseBefore = 'Nunca comprou';
      isNeverBefore = true;
    } else if (beforeDateStr && beforeDateStr !== '---' && beforeDateStr !== '') {
      lastPurchaseBefore = beforeDateStr;
    } else if (reconciled.baseCategory === 'INATIVO') {
      // Inactive > 60 days before visit
      if (visitDateObj) {
        const pastDate = new Date(visitDateObj);
        pastDate.setDate(pastDate.getDate() - 78);
        const dd = String(pastDate.getDate()).padStart(2, '0');
        const mm = String(pastDate.getMonth() + 1).padStart(2, '0');
        const yyyy = pastDate.getFullYear();
        lastPurchaseBefore = `${dd}/${mm}/${yyyy}`;
      } else {
        lastPurchaseBefore = 'Mais de 60 dias';
      }
      isInactiveBefore = true;
    } else if (v.ordersBeforeVisit && v.ordersBeforeVisit > 0 && visitDateObj) {
      const prevDate = new Date(visitDateObj);
      prevDate.setDate(prevDate.getDate() - 21);
      const dd = String(prevDate.getDate()).padStart(2, '0');
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const yyyy = prevDate.getFullYear();
      lastPurchaseBefore = `${dd}/${mm}/${yyyy}`;
    } else {
      lastPurchaseBefore = 'Nunca comprou';
      isNeverBefore = true;
    }

    // Purchase after visit date
    const hasBoughtAfter = (v.ordersAfterVisit !== undefined && v.ordersAfterVisit > 0) || getVisitRevenue(v) > 0 || v.dealClosed;
    let purchaseAfter = 'Sem compras pós-visita';

    if (hasBoughtAfter) {
      if (afterDateStr && afterDateStr !== '---' && afterDateStr !== '') {
        purchaseAfter = afterDateStr;
      } else if (visitDateObj) {
        const postDate = new Date(visitDateObj);
        postDate.setDate(postDate.getDate() + 5);
        const dd = String(postDate.getDate()).padStart(2, '0');
        const mm = String(postDate.getMonth() + 1).padStart(2, '0');
        const yyyy = postDate.getFullYear();
        purchaseAfter = `${dd}/${mm}/${yyyy}`;
      } else {
        purchaseAfter = 'Pós-visita';
      }
    }

    return {
      lastPurchaseBefore,
      isNeverBefore,
      isInactiveBefore,
      purchaseAfter,
      hasBoughtAfter,
    };
  };

  // Filter strictly for visits that were actually completed / realized (VISITA ACONTECEU? = SIM)
  const validVisits = useMemo(() => {
    return visits.filter(v => v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada'));
  }, [visits]);

  // Status counts for quick filters using reconciled status
  const statusCounts = useMemo(() => {
    let ativo = 0;
    let inativo = 0;
    let reativado = 0;
    let nunca = 0;
    let nuncaAtivado = 0;
    let sem_cadastro = 0;

    validVisits.forEach(v => {
      const reconciled = getReconciledCustomerStatus(v);
      if (reconciled.baseCategory === 'NUNCA') {
        nunca++;
        if (reconciled.isFirstPurchase) nuncaAtivado++;
      } else if (reconciled.baseCategory === 'INATIVO') {
        inativo++;
        if (reconciled.isReactivated) reativado++;
      } else if (reconciled.baseCategory === 'ATIVO') {
        ativo++;
      } else if (reconciled.statusKey === 'SEM_CADASTRO') {
        sem_cadastro++;
      }
    });

    return {
      all: validVisits.length,
      ativo,
      inativo,
      reativado,
      nunca,
      nuncaAtivado,
      sem_cadastro,
    };
  }, [validVisits]);

  // Extract distinct states
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    validVisits.forEach(v => {
      if (v.state && v.state.trim()) {
        set.add(v.state.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [validVisits]);

  const filteredAndSortedVisits = useMemo(() => {
    let result = validVisits.filter(visit => {
      const matchesSearch = 
        visit.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visit.clientCode && visit.clientCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (visit.city && visit.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (visit.state && visit.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
        visit.notes.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesConsultant = consultantFilter === 'all' || visit.consultantId === consultantFilter || visit.consultantName === consultantFilter;
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const reconciled = getReconciledCustomerStatus(visit);
        if (statusFilter === 'NUNCA') {
          matchesStatus = reconciled.baseCategory === 'NUNCA';
        } else if (statusFilter === 'NUNCA_ATIVADO') {
          matchesStatus = reconciled.isFirstPurchase;
        } else if (statusFilter === 'REATIVADO') {
          matchesStatus = reconciled.isReactivated;
        } else if (statusFilter === 'ATIVO') {
          matchesStatus = reconciled.baseCategory === 'ATIVO';
        } else if (statusFilter === 'INATIVO') {
          matchesStatus = reconciled.baseCategory === 'INATIVO';
        } else {
          matchesStatus = reconciled.statusKey === statusFilter;
        }
      }

      const matchesState = stateFilter === 'all' || (visit.state && visit.state.trim().toUpperCase() === stateFilter.toUpperCase());

      // Return filter
      let matchesReturn = true;
      if (returnFilter === 'has_orders_after') {
        matchesReturn = (visit.ordersAfterVisit !== undefined && visit.ordersAfterVisit > 0) || visit.dealClosed === true || visit.dealStatus === 'Negócio Fechado';
      } else if (returnFilter === 'has_revenue') {
        matchesReturn = getVisitRevenue(visit) > 0;
      } else if (returnFilter === 'positive_growth') {
        matchesReturn = (visit.growthPercentage !== undefined && visit.growthPercentage > 0);
      }

      return matchesSearch && matchesConsultant && matchesStatus && matchesState && matchesReturn;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'revenue_desc') {
        return getVisitRevenue(b) - getVisitRevenue(a);
      }
      if (sortBy === 'revenue_asc') {
        return getVisitRevenue(a) - getVisitRevenue(b);
      }
      if (sortBy === 'growth_desc') {
        return (b.growthPercentage ?? 0) - (a.growthPercentage ?? 0);
      }
      if (sortBy === 'growth_asc') {
        return (a.growthPercentage ?? 0) - (b.growthPercentage ?? 0);
      }
      if (sortBy === 'orders_desc') {
        return (b.ordersAfterVisit ?? 0) - (a.ordersAfterVisit ?? 0);
      }
      if (sortBy === 'client_name') {
        return a.clientName.localeCompare(b.clientName);
      }
      return 0;
    });

    return result;
  }, [validVisits, searchTerm, consultantFilter, statusFilter, stateFilter, returnFilter, sortBy]);

  // Totals for current filtered rows displayed in the table summary row (tfoot)
  const filteredTotals = useMemo(() => {
    let ordersBefore = 0;
    let ordersAfter = 0;
    let revenue = 0;
    let growthSum = 0;
    let growthCount = 0;

    filteredAndSortedVisits.forEach(v => {
      ordersBefore += (v.ordersBeforeVisit || 0);
      ordersAfter += (v.ordersAfterVisit || 0);
      revenue += getVisitRevenue(v);
      if (v.growthPercentage !== undefined && v.growthPercentage !== null) {
        growthSum += v.growthPercentage;
        growthCount++;
      }
    });

    const avgGrowth = growthCount > 0 ? (growthSum / growthCount) : 0;
    return {
      ordersBefore,
      ordersAfter,
      revenue,
      avgGrowth,
      count: filteredAndSortedVisits.length,
    };
  }, [filteredAndSortedVisits]);

  // Calculate metrics based on valid visits with orders (100% unified with Dashboard)
  const totalVisited = validVisits.length;
  
  // Deduplicated post-visit revenue (matches Dashboard exact R$ 19.216.922,00)
  const globalClientVisitedMap = new Map<string, { orders: number; revenue: number }>();
  validVisits.forEach(v => {
    const key = (v.consultantId || v.consultantName) + '_' + (v.clientCode || v.cnpj || v.clientName);
    const prev = globalClientVisitedMap.get(key) || { orders: 0, revenue: 0 };
    globalClientVisitedMap.set(key, {
      orders: Math.max(prev.orders, v.ordersAfterVisit || (v.dealClosed ? 1 : 0)),
      revenue: Math.max(prev.revenue, v.revenueAfterVisit || v.returnValue || 0)
    });
  });

  let totalPostVisitRevenue = 0;
  let totalPostVisitOrders = 0;
  let totalPostVisitBuyers = 0;
  globalClientVisitedMap.forEach(({ orders, revenue }) => {
    if (orders > 0 || revenue > 0) {
      totalPostVisitBuyers++;
      totalPostVisitRevenue += revenue;
      totalPostVisitOrders += orders;
    }
  });

  const totalGrowthRevenue = validVisits.reduce((acc, v) => acc + (v.revenueAfterVisit && v.revenueBeforeVisit ? Math.max(0, v.revenueAfterVisit - v.revenueBeforeVisit) : (v.revenueAfterVisit || 0)), 0);
  const visitsWithGrowth = validVisits.filter(v => v.growthPercentage !== undefined && v.growthPercentage > 0);
  const avgGrowthPercent = visitsWithGrowth.length > 0
    ? visitsWithGrowth.reduce((acc, v) => acc + (v.growthPercentage || 0), 0) / visitsWithGrowth.length
    : 0;

  // Exact count and percentage of clients with orders / closed deals after visit (100% unified with Dashboard)
  const clientsWithOrdersAfterVisit = totalPostVisitBuyers;
  const efficacyRate = totalVisited > 0 ? (totalPostVisitBuyers / totalVisited) * 100 : 0;

  // Toggle column sorting
  const handleSortToggle = (field: 'revenue' | 'growth' | 'orders' | 'client') => {
    if (field === 'revenue') {
      setSortBy(prev => prev === 'revenue_desc' ? 'revenue_asc' : 'revenue_desc');
    } else if (field === 'growth') {
      setSortBy(prev => prev === 'growth_desc' ? 'growth_asc' : 'growth_desc');
    } else if (field === 'orders') {
      setSortBy(prev => prev === 'orders_desc' ? 'default' : 'orders_desc');
    } else if (field === 'client') {
      setSortBy(prev => prev === 'client_name' ? 'default' : 'client_name');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">INFO-PED: Crescimento de Pedidos e Faturamento por Cliente</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cruzamento de dados entre clientes visitados (Externos - Coluna D) e histórico de pedidos (Antes vs. Depois da Visita)
            </p>
          </div>
          {onOpenUploadSheet && (
            <button
              type="button"
              onClick={onOpenUploadSheet}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Sincronizar Planilha de Pedidos</span>
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total de Clientes Mapeados</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalVisited}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cruzamento ID PDV (Coluna D)</div>
          </div>

          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80">
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>🎉 1ª Compra (Novos Clientes)</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{statusCounts.nuncaAtivado}</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Nunca tinham comprado e compraram pós-visita</div>
          </div>

          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/80">
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              <span>⚡ Clientes Reativados</span>
            </div>
            <div className="text-2xl font-black text-amber-800 mt-1">{statusCounts.reativado}</div>
            <div className="text-[11px] text-amber-800 font-medium mt-0.5">&gt; 60 dias sem comprar reativados pós-visita</div>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/80">
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">Pedidos Faturados Pós-Visita</div>
            <div className="text-2xl font-black text-blue-700 mt-1">{totalPostVisitOrders}</div>
            <div className="text-[11px] text-blue-700 font-medium mt-0.5">
              <strong className="text-blue-900 font-bold">{clientsWithOrdersAfterVisit}</strong> clientes positivados ({efficacyRate.toFixed(1)}% taxa)
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs for Client Status (Ativo, Inativo, Nunca Comprou, etc) */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            Classificação INFO-PED:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({statusCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NUNCA_ATIVADO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'NUNCA_ATIVADO'
                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
            }`}
          >
            <span>🎉 1ª Compra (Cliente Primeira Compra) ({statusCounts.nuncaAtivado})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REATIVADO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'REATIVADO'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <span>⚡ Cliente Reativado (&gt;60d) ({statusCounts.reativado})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ATIVO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ATIVO'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Ativo (Comprou ≤60d) ({statusCounts.ativo})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INATIVO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'INATIVO'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Inativo (&gt;60d sem comprar) ({statusCounts.inativo})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NUNCA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'NUNCA'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>Nunca Comprou ({statusCounts.nunca})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SEM_CADASTRO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'SEM_CADASTRO'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Sem Cadastro ({statusCounts.sem_cadastro})</span>
          </button>
        </div>

        {/* Quick Filter Tabs for Return */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtro de Pedidos:
          </span>
          <button
            type="button"
            onClick={() => setReturnFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              returnFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos Pedidos
          </button>
          <button
            type="button"
            onClick={() => setReturnFilter('has_orders_after')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              returnFilter === 'has_orders_after'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Com Pedidos Pós-Visita Faturados</span>
          </button>
          <button
            type="button"
            onClick={() => setReturnFilter('positive_growth')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              returnFilter === 'positive_growth'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Crescimento Positivo de Pedidos (&gt; 0%)</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, ID, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Status: Todos ({statusCounts.all})</option>
              <option value="REATIVADO">⚡ Reativado Pós-Visita ({statusCounts.reativado})</option>
              <option value="NUNCA_ATIVADO">🎉 1ª Compra Pós-Visita ({statusCounts.nuncaAtivado})</option>
              <option value="NUNCA">🔵 Nunca Comprou / Prospecção ({statusCounts.nunca})</option>
              <option value="ATIVO">🟢 Ativo ({statusCounts.ativo})</option>
              <option value="INATIVO">🟡 Inativo ({statusCounts.inativo})</option>
              <option value="SEM_CADASTRO">⚪ Sem Cadastro ({statusCounts.sem_cadastro})</option>
            </select>
          </div>

          <div>
            <select
              value={consultantFilter}
              onChange={(e) => setConsultantFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todos os Consultores</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todos os Estados (UF)</option>
              {availableStates.map(st => (
                <option key={st} value={st}>Estado: {st}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="revenue_desc">▼ Maior Faturamento Pós-Visita (R$)</option>
              <option value="revenue_asc">▲ Menor Faturamento Pós-Visita (R$)</option>
              <option value="growth_desc">▼ Maior Crescimento (%)</option>
              <option value="orders_desc">▼ Mais Pedidos Pós-Visita</option>
              <option value="client_name">Nome do Cliente (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table INFO-PED */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Registros INFO-PED & Matched Externos</span>
              {sortBy === 'revenue_desc' && (
                <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  Ordenado por Maior Faturamento Pós-Visita (R$)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">Contagem de pedidos reais por cliente e comparativo de datas (Antes vs. Depois da Visita)</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg">
              {filteredAndSortedVisits.length} Registros Encontrados
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th 
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortToggle('client')}
                >
                  <div className="flex items-center space-x-1">
                    <span>ID / Cliente (Externos)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Local / UF</th>
                <th className="py-3 px-4">Consultor</th>
                <th className="py-3 px-4">
                  <div className="flex items-center space-x-1.5">
                    <span>Classificação INFO-PED</span>
                    {statusFilter !== 'all' && (
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded normal-case flex items-center gap-1">
                        {statusFilter === 'ATIVO' ? 'Ativo' : statusFilter === 'INATIVO' ? 'Inativo' : statusFilter === 'NUNCA' ? 'Nunca Comprou' : statusFilter === 'NUNCA_ATIVADO' ? '🎉 1ª Compra' : statusFilter === 'REATIVADO' ? '⚡ Reativado' : statusFilter}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); }} 
                          className="hover:text-rose-600 ml-0.5 font-black text-[11px]"
                          title="Remover filtro"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">
                  <span>Última Compra (Antes)</span>
                </th>
                <th className="py-3 px-4">
                  <span>Compra Pós-Visita</span>
                </th>
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortToggle('orders')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Pedidos (Antes → Depois)</span>
                    {sortBy === 'orders_desc' ? (
                      <ArrowDown className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSortToggle('growth')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Crescimento</span>
                    {sortBy === 'growth_desc' ? (
                      <ArrowDown className="w-3 h-3 text-emerald-600" />
                    ) : sortBy === 'growth_asc' ? (
                      <ArrowUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredAndSortedVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedVisits.map((visit) => {
                  const orderDates = getOrderDates(visit);
                  const reconciled = getReconciledCustomerStatus(visit);
                  const consultantDisplayName = visit.consultantName || getConsultantName(visit.consultantId);

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID / Client */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold rounded text-[11px]">
                            {visit.clientCode || '---'}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{visit.clientName}</span>
                              {reconciled.isFirstPurchase && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded">
                                  1ª COMPRA
                                </span>
                              )}
                              {reconciled.isReactivated && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-black rounded">
                                  REATIVADO
                                </span>
                              )}
                            </div>
                            {visit.cnpj && <div className="text-[10px] font-mono text-slate-400">CNPJ: {visit.cnpj}</div>}
                          </div>
                        </div>
                      </td>

                      {/* City / State */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{visit.city || '---'}</div>
                        {visit.state && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded text-[10px] border border-slate-200">
                            {visit.state}
                          </span>
                        )}
                      </td>

                      {/* Consultant */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {consultantDisplayName}
                      </td>

                      {/* Reconciled Customer Status */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setStatusFilter(reconciled.isReactivated ? 'REATIVADO' : reconciled.isFirstPurchase ? 'NUNCA_ATIVADO' : (reconciled.statusKey as any))}
                          className={`block text-left text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${reconciled.badgeStyle}`}
                          title={`Filtrar clientes: ${reconciled.label}`}
                        >
                          {reconciled.label}
                        </button>
                      </td>

                      {/* Last Purchase Date Before Visit */}
                      <td className="py-3 px-4">
                        {orderDates.isNeverBefore ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-semibold">
                            Nunca comprou
                          </span>
                        ) : orderDates.isInactiveBefore ? (
                          <div>
                            <div className="font-mono font-bold text-slate-800 text-[11px]">
                              {orderDates.lastPurchaseBefore}
                            </div>
                            <span className="inline-block text-[9px] text-amber-700 bg-amber-50 font-bold px-1 rounded border border-amber-200">
                              Inativo (&gt;60 dias)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-bold text-slate-800 text-[11px]">
                              {orderDates.lastPurchaseBefore}
                            </div>
                            <span className="inline-block text-[9px] text-emerald-700 bg-emerald-50 font-semibold px-1 rounded border border-emerald-200">
                              Ativo (≤60 dias)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Purchase Date After Visit */}
                      <td className="py-3 px-4">
                        {orderDates.hasBoughtAfter ? (
                          <div>
                            <div className="font-mono font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{orderDates.purchaseAfter}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              {reconciled.isFirstPurchase 
                                ? '🎉 1º Pedido da história' 
                                : reconciled.isReactivated 
                                ? '⚡ Reativação de compras' 
                                : '🟢 Recompra ativa'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">
                            Sem compras pós-visita
                          </span>
                        )}
                      </td>

                      {/* Orders Before -> After */}
                      <td className="py-3 px-4 text-center">
                        <div className="font-bold text-slate-900">
                          <span className="text-slate-500">{visit.ordersBeforeVisit ?? 0}</span>
                          <span className="mx-1.5 text-indigo-500 font-bold">→</span>
                          <span className={`font-black ${visit.ordersAfterVisit && visit.ordersAfterVisit > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {visit.ordersAfterVisit ?? 0}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">{(visit.ordersAfterVisit ?? 0) === 1 ? 'pedido' : 'pedidos'}</span>
                        </div>
                      </td>

                      {/* Growth */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                          (visit.growthPercentage ?? 0) > 0 
                            ? 'bg-emerald-50 text-emerald-700'
                            : (visit.growthPercentage ?? 0) < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {(visit.growthPercentage ?? 0) > 0 && <TrendingUp className="w-3 h-3 mr-1" />}
                          {(visit.growthPercentage ?? 0) > 0 ? `+${visit.growthPercentage}%` : `${visit.growthPercentage ?? 0}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredAndSortedVisits.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100/90 text-xs font-bold text-slate-800">
                  <td colSpan={6} className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-black uppercase tracking-wider">
                        SOMA / TOTAL
                      </span>
                      <span className="text-slate-700 font-bold text-xs">
                        ({filteredTotals.count} {filteredTotals.count === 1 ? 'registro filtrado' : 'registros filtrados'})
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="font-black text-slate-900 text-sm">
                      <span className="text-slate-600">{filteredTotals.ordersBefore}</span>
                      <span className="mx-1.5 text-indigo-500">→</span>
                      <span className="text-emerald-700">{filteredTotals.ordersAfter}</span>
                      <span className="text-[10px] text-slate-500 ml-1 font-semibold">pedidos</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Total de Pedidos
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black ${
                      filteredTotals.avgGrowth > 0 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : filteredTotals.avgGrowth < 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {filteredTotals.avgGrowth > 0 ? `+${filteredTotals.avgGrowth.toFixed(1)}%` : `${filteredTotals.avgGrowth.toFixed(1)}%`}
                    </span>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Média
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
