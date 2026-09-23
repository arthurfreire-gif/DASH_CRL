import React, { useState, useMemo } from 'react';
import { 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  Award, 
  ChevronRight,
  Filter,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  CheckCircle2,
  Receipt,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { Consultant, Visit } from '../types';

interface ConsultantMonthlyConversionProps {
  consultants: Consultant[];
  validVisits: Visit[];
}

const CONSULTANT_COLORS = [
  '#2563eb', // Blue (Claudio)
  '#10b981', // Emerald (Teofilo)
  '#f59e0b', // Amber (Rodrigo)
  '#ec4899', // Pink (Fernanda)
  '#8b5cf6', // Violet (Jeneffer)
  '#06b6d4', // Cyan
];

const MONTH_LABELS: Record<string, string> = {
  '2026-07': 'Julho/26',
  '2026-08': 'Agosto/26',
  '2026-09': 'Setembro/26',
  '2026-10': 'Outubro/26',
};

export interface MonthClientBreakdown {
  visits: number;
  positivated: number;
  orders: number;
  revenue: number;
  rate: number;

  // Detailed Customer Profiles breakdown
  ativosVisited: number;
  ativosBought: number; // Ativo Recompra
  ativosRate: number;

  inativosVisited: number;
  inativosBought: number; // Reativação (>60d)
  inativosRate: number;

  novosVisited: number;
  novosBought: number; // 1ª Compra (Novo)
  novosRate: number;
}

export const ConsultantMonthlyConversion: React.FC<ConsultantMonthlyConversionProps> = ({
  consultants,
  validVisits,
}) => {
  const [viewMode, setViewMode] = useState<'raiox' | 'chart' | 'table'>('raiox');
  const [selectedConsultantFilter, setSelectedConsultantFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Extract all distinct chronological months from visits
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    validVisits.forEach(v => {
      if (v.date) {
        const mKey = v.date.substring(0, 7);
        if (mKey.length === 7) monthsSet.add(mKey);
      }
    });
    const list = Array.from(monthsSet).sort();
    return list.length > 0 ? list : ['2026-07', '2026-08', '2026-09'];
  }, [validVisits]);

  // Comprehensive monthly data matrix for each consultant with profile breakdowns
  const monthlyData = useMemo(() => {
    return consultants.map((consultant, idx) => {
      const color = CONSULTANT_COLORS[idx % CONSULTANT_COLORS.length];
      const initials = consultant.name.split(' ').map(n => n[0]).slice(0, 2).join('');
      const shortName = consultant.name.split(' ')[0];

      // Consultant visits
      const cVisits = validVisits.filter(
        v => v.consultantId === consultant.id || v.consultantName === consultant.name
      );

      // Total numbers
      let totalVisits = cVisits.length;
      let totalPositivated = 0;
      let totalOrders = 0;
      let totalRevenue = 0;

      let totalAtivosVisited = 0;
      let totalAtivosBought = 0;
      let totalInativosVisited = 0;
      let totalInativosBought = 0;
      let totalNovosVisited = 0;
      let totalNovosBought = 0;

      // Months breakdown
      const monthsStats: Record<string, MonthClientBreakdown> = {};

      availableMonths.forEach(mKey => {
        monthsStats[mKey] = { 
          visits: 0, 
          positivated: 0, 
          orders: 0, 
          revenue: 0, 
          rate: 0,
          ativosVisited: 0,
          ativosBought: 0,
          ativosRate: 0,
          inativosVisited: 0,
          inativosBought: 0,
          inativosRate: 0,
          novosVisited: 0,
          novosBought: 0,
          novosRate: 0
        };
      });

      cVisits.forEach(v => {
        const mKey = (v.date || '').substring(0, 7);
        const isPos = Boolean(
          (v.ordersAfterVisit && v.ordersAfterVisit > 0) || 
          (v.revenueAfterVisit && v.revenueAfterVisit > 0) || 
          v.dealClosed ||
          v.dealStatus === 'Negócio Fechado'
        );

        const orders = v.ordersAfterVisit || (v.dealClosed ? 1 : 0);
        const revenue = v.revenueAfterVisit || v.returnValue || 0;

        // Customer origin type analysis
        const rawStatus = (v.customerStatus || '').trim().toUpperCase();
        const hadBefore = Boolean(v.ordersBeforeVisit && v.ordersBeforeVisit > 0);
        const isInactive = rawStatus.includes('INATIVO') || rawStatus.includes('HÁ MAIS DE 60') || rawStatus.includes('> 60') || rawStatus.includes('>60');
        const isNever = rawStatus.includes('NUNCA') || rawStatus.includes('PROSPEC') || rawStatus.includes('SEM CADASTRO') || (rawStatus === '' && !hadBefore);
        const isAtivo = (rawStatus.includes('ATIVO') && !rawStatus.includes('INATIVO')) || rawStatus.includes('ÚLTIMOS 60') || hadBefore;

        if (isPos) {
          totalPositivated++;
          totalOrders += orders;
          totalRevenue += revenue;
        }

        // Aggregate by type
        if (isInactive) {
          totalInativosVisited++;
          if (isPos) totalInativosBought++;
        } else if (isNever && !isAtivo) {
          totalNovosVisited++;
          if (isPos) totalNovosBought++;
        } else {
          totalAtivosVisited++;
          if (isPos) totalAtivosBought++;
        }

        if (monthsStats[mKey]) {
          monthsStats[mKey].visits++;
          if (isPos) {
            monthsStats[mKey].positivated++;
            monthsStats[mKey].orders += orders;
            monthsStats[mKey].revenue += revenue;
          }

          if (isInactive) {
            monthsStats[mKey].inativosVisited++;
            if (isPos) monthsStats[mKey].inativosBought++;
          } else if (isNever && !isAtivo) {
            monthsStats[mKey].novosVisited++;
            if (isPos) monthsStats[mKey].novosBought++;
          } else {
            monthsStats[mKey].ativosVisited++;
            if (isPos) monthsStats[mKey].ativosBought++;
          }
        }
      });

      // Calculate rates per month
      availableMonths.forEach(mKey => {
        const m = monthsStats[mKey];
        m.rate = m.visits > 0 ? (m.positivated / m.visits) * 100 : 0;
        m.ativosRate = m.ativosVisited > 0 ? (m.ativosBought / m.ativosVisited) * 100 : 0;
        m.inativosRate = m.inativosVisited > 0 ? (m.inativosBought / m.inativosVisited) * 100 : 0;
        m.novosRate = m.novosVisited > 0 ? (m.novosBought / m.novosVisited) * 100 : 0;
      });

      const overallRate = totalVisits > 0 ? (totalPositivated / totalVisits) * 100 : 0;
      const totalAtivosRate = totalAtivosVisited > 0 ? (totalAtivosBought / totalAtivosVisited) * 100 : 0;
      const totalInativosRate = totalInativosVisited > 0 ? (totalInativosBought / totalInativosVisited) * 100 : 0;
      const totalNovosRate = totalNovosVisited > 0 ? (totalNovosBought / totalNovosVisited) * 100 : 0;

      return {
        id: consultant.id,
        name: consultant.name,
        shortName,
        region: consultant.region,
        initials,
        color,
        totalVisits,
        totalPositivated,
        totalOrders,
        totalRevenue,
        overallRate,
        totalAtivosVisited,
        totalAtivosBought,
        totalAtivosRate,
        totalInativosVisited,
        totalInativosBought,
        totalInativosRate,
        totalNovosVisited,
        totalNovosBought,
        totalNovosRate,
        monthsStats,
      };
    });
  }, [consultants, validVisits, availableMonths]);

  // Overall Totals per month for summary indicators
  const generalMonthTotals = useMemo(() => {
    const result: Record<string, MonthClientBreakdown> = {};
    availableMonths.forEach(mKey => {
      let v = 0, p = 0, ord = 0, rev = 0;
      let atvV = 0, atvB = 0, inatV = 0, inatB = 0, novV = 0, novB = 0;

      monthlyData.forEach(c => {
        const stat = c.monthsStats[mKey];
        if (stat) {
          v += stat.visits;
          p += stat.positivated;
          ord += stat.orders;
          rev += stat.revenue;
          atvV += stat.ativosVisited;
          atvB += stat.ativosBought;
          inatV += stat.inativosVisited;
          inatB += stat.inativosBought;
          novV += stat.novosVisited;
          novB += stat.novosBought;
        }
      });

      result[mKey] = {
        visits: v,
        positivated: p,
        orders: ord,
        revenue: rev,
        rate: v > 0 ? (p / v) * 100 : 0,
        ativosVisited: atvV,
        ativosBought: atvB,
        ativosRate: atvV > 0 ? (atvB / atvV) * 100 : 0,
        inativosVisited: inatV,
        inativosBought: inatB,
        inativosRate: inatV > 0 ? (inatB / inatV) * 100 : 0,
        novosVisited: novV,
        novosBought: novB,
        novosRate: novV > 0 ? (novB / novV) * 100 : 0,
      };
    });
    return result;
  }, [availableMonths, monthlyData]);

  // Selected Month Summary
  const currentMonthSummary = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      let v = 0, p = 0, ord = 0, rev = 0;
      let atvV = 0, atvB = 0, inatV = 0, inatB = 0, novV = 0, novB = 0;
      monthlyData.forEach(c => {
        v += c.totalVisits;
        p += c.totalPositivated;
        ord += c.totalOrders;
        rev += c.totalRevenue;
        atvV += c.totalAtivosVisited;
        atvB += c.totalAtivosBought;
        inatV += c.totalInativosVisited;
        inatB += c.totalInativosBought;
        novV += c.totalNovosVisited;
        novB += c.totalNovosBought;
      });
      return {
        label: 'Todos os Meses Acumulados',
        visits: v,
        positivated: p,
        orders: ord,
        revenue: rev,
        rate: v > 0 ? (p / v) * 100 : 0,
        ativosVisited: atvV,
        ativosBought: atvB,
        ativosRate: atvV > 0 ? (atvB / atvV) * 100 : 0,
        inativosVisited: inatV,
        inativosBought: inatB,
        inativosRate: inatV > 0 ? (inatB / inatV) * 100 : 0,
        novosVisited: novV,
        novosBought: novB,
        novosRate: novV > 0 ? (novB / novV) * 100 : 0,
      };
    } else {
      const stat = generalMonthTotals[selectedMonthFilter] || {
        visits: 0, positivated: 0, orders: 0, revenue: 0, rate: 0,
        ativosVisited: 0, ativosBought: 0, ativosRate: 0,
        inativosVisited: 0, inativosBought: 0, inativosRate: 0,
        novosVisited: 0, novosBought: 0, novosRate: 0
      };
      return {
        label: MONTH_LABELS[selectedMonthFilter] || selectedMonthFilter,
        ...stat
      };
    }
  }, [selectedMonthFilter, monthlyData, generalMonthTotals]);

  // Recharts timeline series: one entry per month with key for each consultant
  const chartTimelineData = useMemo(() => {
    return availableMonths.map(mKey => {
      const monthLabel = MONTH_LABELS[mKey] || mKey;
      const row: Record<string, any> = {
        month: monthLabel,
        rawMonth: mKey,
      };

      monthlyData.forEach(c => {
        const mStat = c.monthsStats[mKey];
        row[c.name] = mStat ? parseFloat(mStat.rate.toFixed(1)) : 0;
        row[`${c.name}_visits`] = mStat?.visits || 0;
        row[`${c.name}_positivated`] = mStat?.positivated || 0;
        row[`${c.name}_orders`] = mStat?.orders || 0;
      });

      const gStat = generalMonthTotals[mKey];
      row['Média Geral'] = gStat ? parseFloat(gStat.rate.toFixed(1)) : 0;
      return row;
    });
  }, [availableMonths, monthlyData, generalMonthTotals]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 mb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100/80">
              <Percent className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Raio-X de Conversão Mensal: Perfil de Clientes Visitados vs. Quantos Compraram
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Detalhamento mês a mês de quantos clientes eram <strong>Ativos</strong>, <strong>Inativos (&gt;60d)</strong> ou <strong>Novos (Nunca comprou)</strong> no momento da visita e quantos efetivamente compraram
          </p>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('raiox')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'raiox'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Raio-X por Perfil</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Linhas (%)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Resumo Geral</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month Filter Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Filtrar Mês de Análise:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedMonthFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMonthFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todos os Meses (Geral)
          </button>
          {availableMonths.map(mKey => (
            <button
              key={mKey}
              onClick={() => setSelectedMonthFilter(mKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMonthFilter === mKey
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {MONTH_LABELS[mKey] || mKey}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Period Summary KPIs (Ativos / Inativos / Novos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* 1. Ativos */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/90">
          <div className="flex items-center justify-between text-blue-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">🔵 Clientes Ativos</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-950">
              {currentMonthSummary.ativosBought}
            </span>
            <span className="text-xs text-blue-800 font-semibold">
              de {currentMonthSummary.ativosVisited} visitados
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
            <span className="text-blue-700 font-medium">Recompra pós-visita:</span>
            <span className="font-black text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-md">
              {currentMonthSummary.ativosRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 2. Inativos >60d */}
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/90">
          <div className="flex items-center justify-between text-purple-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">🟣 Inativos (&gt;60d)</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-950">
              {currentMonthSummary.inativosBought}
            </span>
            <span className="text-xs text-purple-800 font-semibold">
              de {currentMonthSummary.inativosVisited} visitados
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-purple-200/60 flex items-center justify-between text-[11px]">
            <span className="text-purple-700 font-medium">Reativações (&gt;60d):</span>
            <span className="font-black text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-md">
              {currentMonthSummary.inativosRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 3. Novos / Nunca Comprou */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90">
          <div className="flex items-center justify-between text-emerald-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">🟢 Nunca Comprou / Novo</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950">
              {currentMonthSummary.novosBought}
            </span>
            <span className="text-xs text-emerald-800 font-semibold">
              de {currentMonthSummary.novosVisited} visitados
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-medium">1ª Compra (Novo):</span>
            <span className="font-black text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              {currentMonthSummary.novosRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 4. Total do Período */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Compraram</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {currentMonthSummary.positivated}
            </span>
            <span className="text-xs text-slate-300 font-semibold">
              de {currentMonthSummary.visits} visitados
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Conversão Total:</span>
            <span className="font-black text-emerald-400 bg-slate-800 px-2 py-0.5 rounded-md">
              {currentMonthSummary.rate.toFixed(1)}% ({currentMonthSummary.orders} pedidos)
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: RAIO-X COMPLETO POR PERFIL DE CLIENTES (ATIOVS / 1ª COMPRA / INATIVOS) */}
      {viewMode === 'raiox' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Visão Detalhada: Quantos clientes de cada perfil cada consultor visitou no mês e quantos fecharam pedidos:
            </span>
            <span className="text-slate-400">
              {selectedMonthFilter === 'all' ? 'Exibindo todos os meses' : `Filtrado para ${MONTH_LABELS[selectedMonthFilter]}`}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {monthlyData.map((c) => {
              // Get stats according to month filter
              const stat = selectedMonthFilter === 'all' 
                ? {
                    visits: c.totalVisits,
                    positivated: c.totalPositivated,
                    orders: c.totalOrders,
                    revenue: c.totalRevenue,
                    rate: c.overallRate,
                    ativosVisited: c.totalAtivosVisited,
                    ativosBought: c.totalAtivosBought,
                    ativosRate: c.totalAtivosRate,
                    inativosVisited: c.totalInativosVisited,
                    inativosBought: c.totalInativosBought,
                    inativosRate: c.totalInativosRate,
                    novosVisited: c.totalNovosVisited,
                    novosBought: c.totalNovosBought,
                    novosRate: c.totalNovosRate,
                  }
                : c.monthsStats[selectedMonthFilter] || {
                    visits: 0, positivated: 0, orders: 0, revenue: 0, rate: 0,
                    ativosVisited: 0, ativosBought: 0, ativosRate: 0,
                    inativosVisited: 0, inativosBought: 0, inativosRate: 0,
                    novosVisited: 0, novosBought: 0, novosRate: 0,
                  };

              const hasVisits = stat.visits > 0;

              return (
                <div 
                  key={c.id}
                  className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:bg-slate-50 transition-colors"
                >
                  {/* Consultant Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">
                            {c.name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                            {c.region}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {hasVisits ? `${stat.visits} clientes visitados no período` : 'Sem visitas registradas no período'}
                        </span>
                      </div>
                    </div>

                    {/* Overall Conversion Pill */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black text-slate-900 block" style={{ color: c.color }}>
                          {stat.rate.toFixed(1)}% Conversão
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {stat.positivated} de {stat.visits} compraram ({stat.orders} pedidos)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Profile Cards (Ativos / Inativos / Novos) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3.5">
                    {/* 1. Ativos */}
                    <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          Ativos (Últimos 60d)
                        </span>
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {stat.ativosRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-500">Visitados: <strong className="text-slate-800">{stat.ativosVisited}</strong></span>
                        <span className="text-slate-500">Compraram: <strong className="text-blue-700">{stat.ativosBought}</strong></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, stat.ativosRate)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1.5">
                        {stat.ativosBought > 0 ? `🟢 ${stat.ativosBought} recompras faturadas` : 'Sem compras pós-visita'}
                      </span>
                    </div>

                    {/* 2. Inativos >60d */}
                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                          Inativos (&gt; 60 dias)
                        </span>
                        <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          {stat.inativosRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-500">Visitados: <strong className="text-slate-800">{stat.inativosVisited}</strong></span>
                        <span className="text-slate-500">Reativados: <strong className="text-purple-700">{stat.inativosBought}</strong></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, stat.inativosRate)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1.5">
                        {stat.inativosBought > 0 ? `🟣 ${stat.inativosBought} reativações fechadas` : 'Sem reativações no período'}
                      </span>
                    </div>

                    {/* 3. Novos / Nunca Comprou */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                          Nunca Comprou / Novo
                        </span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {stat.novosRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-slate-500">Visitados: <strong className="text-slate-800">{stat.novosVisited}</strong></span>
                        <span className="text-slate-500">1ª Compra: <strong className="text-emerald-700">{stat.novosBought}</strong></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, stat.novosRate)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1.5">
                        {stat.novosBought > 0 ? `🟢 ${stat.novosBought} clientes com 1ª compra` : 'Em fase de prospecção'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Month Breakdown Bar for this Consultant */}
                  {selectedMonthFilter === 'all' && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Evolução Mês a Mês do Consultor:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {availableMonths.map(mKey => {
                          const mStat = c.monthsStats[mKey];
                          const mLabel = MONTH_LABELS[mKey] || mKey;
                          if (!mStat || mStat.visits === 0) {
                            return (
                              <div key={mKey} className="bg-white/60 p-2 rounded-lg border border-slate-200/60 text-center text-slate-400 text-xs">
                                <span>{mLabel}: Sem visitas</span>
                              </div>
                            );
                          }
                          return (
                            <div key={mKey} className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-800">{mLabel}</span>
                                <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                  {mStat.rate.toFixed(1)}% conv.
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                <div>• Ativos: {mStat.ativosVisited}/{mStat.ativosBought} compraram ({mStat.ativosRate.toFixed(0)}%)</div>
                                <div>• Inativos: {mStat.inativosVisited}/{mStat.inativosBought} reativados ({mStat.inativosRate.toFixed(0)}%)</div>
                                <div>• Novos: {mStat.novosVisited}/{mStat.novosBought} 1ª compra ({mStat.novosRate.toFixed(0)}%)</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: LINE CHART EVOLUTION */}
      {viewMode === 'chart' && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-medium">
            <span>Evolução da taxa de conversão (% de fechamento pós-visita) mês a mês:</span>
            {selectedConsultantFilter !== 'all' && (
              <button
                onClick={() => setSelectedConsultantFilter('all')}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Exibir todos no gráfico
              </button>
            )}
          </div>
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartTimelineData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(val: any, name: any, item: any) => {
                    const visits = item.payload[`${name}_visits`] || 0;
                    const pos = item.payload[`${name}_positivated`] || 0;
                    const orders = item.payload[`${name}_orders`] || 0;
                    return [
                      `${val}% (${pos}/${visits} clientes • ${orders} pedidos)`,
                      name
                    ];
                  }}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)' 
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                {monthlyData
                  .filter(c => selectedConsultantFilter === 'all' || selectedConsultantFilter === c.id)
                  .map((c) => (
                    <Line
                      key={c.id}
                      type="monotone"
                      dataKey={c.name}
                      stroke={c.color}
                      strokeWidth={selectedConsultantFilter === c.id ? 4 : 2.5}
                      dot={{ r: 4.5, fill: '#ffffff', stroke: c.color, strokeWidth: 2.5 }}
                      activeDot={{ r: 7.5, fill: c.color, stroke: '#ffffff', strokeWidth: 3 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 3: GENERAL SUMMARY TABLE */}
      {viewMode === 'table' && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase text-slate-500 font-bold border-b border-slate-200 bg-slate-50/50">
                <th className="py-3 px-3 rounded-l-xl">Consultor</th>
                <th className="py-3 px-3 text-center">Total Geral</th>
                {availableMonths.map(mKey => (
                  <th key={mKey} className="py-3 px-3 text-center">
                    {MONTH_LABELS[mKey] || mKey}
                  </th>
                ))}
                <th className="py-3 px-3 text-right rounded-r-xl">Desempenho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {monthlyData.map((c) => {
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.initials}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                            {c.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {c.region}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Geral */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-block bg-slate-100 py-1 px-2.5 rounded-xl border border-slate-200/80">
                        <span className="font-black text-slate-900 text-xs block">
                          {c.overallRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {c.totalPositivated} / {c.totalVisits} clientes
                        </span>
                      </div>
                    </td>

                    {/* Monthly Columns */}
                    {availableMonths.map(mKey => {
                      const m = c.monthsStats[mKey];
                      const hasData = m && m.visits > 0;
                      const rate = m ? m.rate : 0;
                      
                      return (
                        <td key={mKey} className="py-3.5 px-3 text-center">
                          {hasData ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-900 text-xs">
                                {rate.toFixed(1)}%
                              </span>
                              <div className="w-20 bg-slate-100 rounded-full h-1.5 my-1 overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${Math.min(100, Math.max(rate, 4))}%`,
                                    backgroundColor: c.color
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {m.positivated} de {m.visits} vis. ({m.orders} ped.)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Performance Label */}
                    <td className="py-3.5 px-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                        c.overallRate >= 35 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : c.overallRate > 0 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {c.overallRate >= 35 ? 'Líder de Conversão' : c.overallRate > 0 ? 'Positivando' : 'Em Prospecção'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
