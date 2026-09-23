import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  MapPin, 
  CheckCircle2, 
  ArrowUpRight,
  Award,
  AlertTriangle,
  LineChart as LineChartIcon,
  Calendar,
  Users,
  Activity,
  ChevronDown,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Globe,
  Compass,
  Target,
  Percent,
  UserCheck,
  Repeat,
  Layers,
  Building2,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart,
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from 'recharts';

import { Consultant, Expense, Visit, RegionalClient, InfoPedRecord } from '../types';
import { ConsultantMonthlyConversion } from './ConsultantMonthlyConversion';
import { VisitedVsActivatedList } from './VisitedVsActivatedList';
import { ActiveClientsRegionalModal } from './ActiveClientsRegionalModal';
import { NewRegistrationsModal } from './NewRegistrationsModal';

interface DashboardViewProps {
  consultants: Consultant[];
  expenses: Expense[];
  visits: Visit[];
  regionalClients?: RegionalClient[];
  infoPedRecords?: InfoPedRecord[];
  onNavigateToTab?: (tab: string) => void;
}

const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const MONTH_NAMES: { [key: string]: string } = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

// SVG Sparkline component matching the wavy curves in the screenshot
const SparklineWave: React.FC<{ color?: string; id: string; trend?: 'up' | 'down' | 'neutral' }> = ({ 
  color = '#2563eb', 
  id,
  trend = 'up' 
}) => {
  const pathD = trend === 'up' 
    ? "M 0,34 Q 25,38 50,30 T 100,24 T 140,28 T 175,18 T 200,8"
    : trend === 'down'
    ? "M 0,12 Q 30,8 60,22 T 110,18 T 160,32 T 200,36"
    : "M 0,26 Q 30,34 60,18 T 110,28 T 160,16 T 200,22";

  return (
    <div className="w-full h-11 mt-1 overflow-visible">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 200 42" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sparkGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L 200,42 L 0,42 Z`}
          fill={`url(#sparkGrad-${id})`}
        />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  consultants,
  expenses,
  visits,
  regionalClients = [],
  infoPedRecords = [],
  onNavigateToTab,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'growth' | 'comparison'>('growth');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [isActiveClientsModalOpen, setIsActiveClientsModalOpen] = useState(false);
  const [isNewRegistrationsModalOpen, setIsNewRegistrationsModalOpen] = useState(false);
  const [selectedConsultantForNewReg, setSelectedConsultantForNewReg] = useState<string | null>(null);

  // Filter for valid visits that were actually performed
  const validVisits = useMemo(() => {
    return visits.filter(v => v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada'));
  }, [visits]);

  // Total Realized Visits
  const completedVisits = validVisits.length;

  // Deduplicate clients across visits by (consultantId + clientCode/Name)
  const clientVisitedMap = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; clientCode?: string; clientName?: string; status?: string }>();
    validVisits.forEach(v => {
      const key = (v.consultantId || v.consultantName) + '_' + (v.clientCode || v.cnpj || v.clientName);
      const prev = map.get(key) || { orders: 0, revenue: 0, clientCode: v.clientCode, clientName: v.clientName, status: v.customerStatus };
      map.set(key, {
        orders: Math.max(prev.orders, v.ordersAfterVisit || (v.dealClosed ? 1 : 0)),
        revenue: Math.max(prev.revenue, v.revenueAfterVisit || v.returnValue || 0),
        clientCode: v.clientCode || prev.clientCode,
        clientName: v.clientName || prev.clientName,
        status: v.customerStatus || prev.status,
      });
    });
    return map;
  }, [validVisits]);

  // Total Positivated / Closed deals
  let closedDeals = 0;
  let totalReturn = 0;
  let totalPostVisitOrders = 0;

  clientVisitedMap.forEach(({ orders, revenue }) => {
    if (orders > 0 || revenue > 0) {
      closedDeals++;
      totalReturn += revenue;
      totalPostVisitOrders += orders;
    }
  });

  const totalInvestment = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const conversionRate = completedVisits > 0 ? (closedDeals / completedVisits) * 100 : 0;
  const netRoi = totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0;

  // Data for Timeline Chart dynamically grouped by month from real visits
  const revenueGrowthTimeline = useMemo(() => {
    const monthMap = new Map<string, { month: string; rawMonth: string; revenue: number; orders: number; visits: number }>();
    
    // Sort months chronologically
    const monthNames: { [k: string]: string } = {
      '2026-07': 'Julho/26',
      '2026-08': 'Agosto/26',
      '2026-09': 'Setembro/26',
    };

    validVisits.forEach(v => {
      if (!v.date) return;
      const mKey = v.date.substring(0, 7);
      const mName = monthNames[mKey] || mKey;
      
      const current = monthMap.get(mKey) || { month: mName, rawMonth: mKey, revenue: 0, orders: 0, visits: 0 };
      current.visits += 1;
      current.revenue += (v.revenueAfterVisit || v.returnValue || 0);
      current.orders += (v.ordersAfterVisit || (v.dealClosed ? 1 : 0));
      monthMap.set(mKey, current);
    });

    const sorted = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => data);

    if (sorted.length === 0) {
      return [
        { month: 'Julho/26', revenue: 22461692, orders: 175, visits: 113 },
        { month: 'Agosto/26', revenue: 22749795, orders: 103, visits: 114 },
        { month: 'Setembro/26', revenue: 0, orders: 0, visits: 23 },
      ];
    }
    return sorted;
  }, [validVisits]);

  // Breakdown per consultant
  const consultantChartData = useMemo(() => {
    return consultants.map(c => {
      const cExpenses = expenses
        .filter(e => e.consultantId === c.id)
        .reduce((acc, curr) => acc + curr.amount, 0);

      const cVisits = validVisits.filter(v => v.consultantId === c.id);
      
      const cClientMap = new Map<string, { orders: number; revenue: number }>();
      cVisits.forEach(v => {
        const key = v.clientCode || v.cnpj || v.clientName;
        const prev = cClientMap.get(key) || { orders: 0, revenue: 0 };
        cClientMap.set(key, {
          orders: Math.max(prev.orders, v.ordersAfterVisit || (v.dealClosed ? 1 : 0)),
          revenue: Math.max(prev.revenue, v.revenueAfterVisit || v.returnValue || 0)
        });
      });

      let cReturn = 0;
      let cOrders = 0;
      let cDeals = 0;

      cClientMap.forEach(({ orders, revenue }) => {
        if (orders > 0 || revenue > 0) {
          cDeals++;
          cReturn += revenue;
          cOrders += orders;
        }
      });

      // Calculate unique new client registrations made by this consultant
      const cNewRegSet = new Set<string>();
      let cDirectNaoCount = 0;
      cVisits.forEach(v => {
        const isDirectNao = v.clienteJaPossuiCadastroLoja === 'NÃO' || v.clienteJaPossuiCadastroLoja === 'NAO';
        const isSemCad = (v.customerStatus && v.customerStatus.toUpperCase() === 'SEM CADASTRO') || v.isNewRegistration;
        if (isDirectNao || isSemCad) {
          const key = v.clientCode || v.cnpj || v.clientName;
          cNewRegSet.add(key);
          if (isDirectNao) cDirectNaoCount++;
        }
      });

      const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('');
      const cConversion = cVisits.length > 0 ? (cDeals / cVisits.length) * 100 : 0;

      return {
        name: c.name.split(' ')[0],
        fullName: c.name,
        initials,
        region: c.region,
        Investimento: cExpenses,
        Retorno: cReturn,
        PedidosGerados: cOrders,
        Visitas: cVisits.length,
        CadastrosNovos: cNewRegSet.size,
        CadastrosNovosDirectNao: cDirectNaoCount,
        Conversao: cConversion,
        ROI: cExpenses > 0 ? ((cReturn - cExpenses) / cExpenses) * 100 : 0,
      };
    });
  }, [consultants, expenses, validVisits]);

  // Total new client registrations
  const totalNewRegistrations = useMemo(() => {
    return consultantChartData.reduce((acc, c) => acc + (c.CadastrosNovos || 0), 0);
  }, [consultantChartData]);

  // Selected consultant for filtering the Donut Chart (Distribuição da Carteira)
  const [selectedConsultantForDonut, setSelectedConsultantForDonut] = useState<string | null>(null);

  const selectedConsultantVisits = useMemo(() => {
    if (!selectedConsultantForDonut) return validVisits;
    return validVisits.filter(v => v.consultantId === selectedConsultantForDonut || v.consultantName === selectedConsultantForDonut);
  }, [validVisits, selectedConsultantForDonut]);

  const selectedConsultantObj = useMemo(() => {
    if (!selectedConsultantForDonut) return null;
    return consultants.find(c => c.id === selectedConsultantForDonut || c.name === selectedConsultantForDonut) || null;
  }, [consultants, selectedConsultantForDonut]);

  // Donut chart status breakdown (Dynamically filtered by selected consultant)
  const statusDistributionData = useMemo(() => {
    let activePurchased = 0;
    let reactivated = 0;
    let firstPurchase = 0;
    let prospecting = 0;

    selectedConsultantVisits.forEach(v => {
      const isPositivated = Boolean(
        (v.ordersAfterVisit && v.ordersAfterVisit > 0) || 
        (v.revenueAfterVisit && v.revenueAfterVisit > 0) || 
        v.dealClosed ||
        v.dealStatus === 'Negócio Fechado'
      );
      const rawStatus = (v.customerStatus || '').toUpperCase();
      const hadOrdersBefore = (v.ordersBeforeVisit && v.ordersBeforeVisit > 0);
      const isInactive = rawStatus.includes('INATIVO') || rawStatus.includes('HÁ MAIS DE 60') || rawStatus.includes('> 60') || rawStatus.includes('>60');
      const isNever = rawStatus.includes('NUNCA') || rawStatus.includes('PROSPEC') || rawStatus.includes('SEM CADASTRO') || (rawStatus === '' && !hadOrdersBefore);
      const isAtivo = (rawStatus.includes('ATIVO') && !rawStatus.includes('INATIVO')) || rawStatus.includes('ÚLTIMOS 60') || hadOrdersBefore;

      if (isPositivated) {
        if (isInactive) {
          reactivated++;
        } else if (isNever && !isAtivo) {
          firstPurchase++;
        } else {
          activePurchased++;
        }
      } else {
        prospecting++;
      }
    });

    const total = selectedConsultantVisits.length;

    return [
      { name: 'Ativo Recompra', value: activePurchased, color: '#2563eb', pct: total > 0 ? (activePurchased / total) * 100 : 0 },
      { name: '1ª Compra (Novo)', value: firstPurchase, color: '#10b981', pct: total > 0 ? (firstPurchase / total) * 100 : 0 },
      { name: 'Reativação (>60d)', value: reactivated, color: '#8b5cf6', pct: total > 0 ? (reactivated / total) * 100 : 0 },
      { name: 'Em Negociação', value: prospecting, color: '#94a3b8', pct: total > 0 ? (prospecting / total) * 100 : 0 },
    ];
  }, [selectedConsultantVisits]);

  // Official Consultant by State map
  const STATE_OFFICIAL_CONSULTANT: Record<string, string> = {
    'Pará': 'Claudio Carvalho',
    'Maranhão': 'Rodrigo Petrowski',
    'Pernambuco': 'Teófilo Prazeres',
    'Alagoas': 'Fernanda Pereira',
    'Bahia': 'Jeneffer Jesus',
    'Paraíba': 'Teófilo Prazeres',
    'Amapá': 'Claudio Carvalho',
    'Espírito Santo': 'Jeneffer Jesus',
    'Rio Grande do Norte': 'Teófilo Prazeres',
    'Ceará': 'Rodrigo Petrowski',
    'Sergipe': 'Fernanda Pereira',
    'Piauí': 'Rodrigo Petrowski',
  };

  // ==========================================
  // ACOMPANHAMENTO DAS VISITAS E DA REGIÃO
  // ==========================================
  const regionalMetrics = useMemo(() => {
    const regionMap = new Map<string, {
      state: string;
      macroRegion: string;
      officialConsultant: string;
      consultants: Set<string>;
      rcas: Set<string>;
      totalClientsInRegion: number;
      visitedClientsInRegion: number;
      totalVisitsCount: number;
      activeClientsInMonth: number;
      storeOrdersCount: number;
      positivatedClientsAfterVisit: number;
      ordersAfterVisit: number;
      revenueAfterVisit: number;
    }>();

    const cleanCNPJ = (cnpj?: string): string => cnpj ? String(cnpj).replace(/\D/g, '') : '';

    if (regionalClients && regionalClients.length > 0) {
      // 1. Map realized visits per state
      const visitedClientsByState = new Map<string, Set<string>>();
      const positivatedClientsByState = new Map<string, Set<string>>();
      const activeClientsByState = new Map<string, Set<string>>();
      const storeOrdersByState = new Map<string, number>();
      const visitCountByState = new Map<string, number>();
      const ordersByState = new Map<string, number>();
      const revenueByState = new Map<string, number>();
      const consultantsByState = new Map<string, Set<string>>();

      validVisits.forEach(v => {
        const uf = v.state || 'Não Definido';
        const clientKey = v.clientCode || cleanCNPJ(v.cnpj) || (v.clientName ? v.clientName.trim().toLowerCase() : v.id);

        visitCountByState.set(uf, (visitCountByState.get(uf) || 0) + 1);

        if (!visitedClientsByState.has(uf)) visitedClientsByState.set(uf, new Set());
        visitedClientsByState.get(uf)!.add(clientKey);

        if (v.consultantName) {
          if (!consultantsByState.has(uf)) consultantsByState.set(uf, new Set());
          consultantsByState.get(uf)!.add(v.consultantName);
        }

        const isPositivated = Boolean((v.ordersAfterVisit && v.ordersAfterVisit > 0) || (v.revenueAfterVisit && v.revenueAfterVisit > 0) || v.dealClosed);
        if (isPositivated) {
          if (!positivatedClientsByState.has(uf)) positivatedClientsByState.set(uf, new Set());
          positivatedClientsByState.get(uf)!.add(clientKey);

          ordersByState.set(uf, (ordersByState.get(uf) || 0) + (v.ordersAfterVisit || 1));
          revenueByState.set(uf, (revenueByState.get(uf) || 0) + (v.revenueAfterVisit || v.returnValue || 0));
        }

        const isActive = isPositivated || (v.ordersBeforeVisit && v.ordersBeforeVisit > 0) || (v.customerStatus && v.customerStatus.includes('ATIVO'));
        if (isActive) {
          if (!activeClientsByState.has(uf)) activeClientsByState.set(uf, new Set());
          activeClientsByState.get(uf)!.add(clientKey);
        }
      });

      // If direct INFO-PED store order records exist, calculate active buyers and orders within 60 days
      if (infoPedRecords && infoPedRecords.length > 0) {
        // Reset and populate from exact INFO-PED rows with 60-day purchase criteria
        activeClientsByState.clear();
        storeOrdersByState.clear();
        infoPedRecords.forEach(rec => {
          const uf = rec.state || rec.billedClientState || 'Não Definido';
          const clientKey = rec.clientCode || cleanCNPJ(rec.cnpj) || (rec.clientName ? rec.clientName.trim().toLowerCase() : rec.id || '');
          if (clientKey) {
            const is60dActive = rec.isWithin60Days ?? (rec.ordersCount60d ? rec.ordersCount60d > 0 : true);
            if (is60dActive) {
              if (!activeClientsByState.has(uf)) activeClientsByState.set(uf, new Set());
              activeClientsByState.get(uf)!.add(clientKey);

              const count = rec.ordersCount60d !== undefined ? rec.ordersCount60d : ((rec as any).ordersCount || 1);
              storeOrdersByState.set(uf, (storeOrdersByState.get(uf) || 0) + count);
            }
          }
        });
      }

      // 2. Group regional clients by state
      regionalClients.forEach(c => {
        const state = c.state || 'Não Definido';
        let macroRegion = 'Nordeste';
        if (['Pará', 'Amapá', 'Amazonas', 'Rondônia', 'Roraima', 'Acre', 'Tocantins'].includes(state)) {
          macroRegion = 'Norte';
        } else if (['Espírito Santo', 'Minas Gerais', 'Rio de Janeiro', 'São Paulo'].includes(state)) {
          macroRegion = 'Sudeste';
        }

        const officialConsultant = STATE_OFFICIAL_CONSULTANT[state] || 'Equipe Sou Energy';

        const reg = regionMap.get(state) || {
          state,
          macroRegion,
          officialConsultant,
          consultants: new Set([officialConsultant]),
          rcas: new Set(),
          totalClientsInRegion: 0,
          visitedClientsInRegion: (visitedClientsByState.get(state) || new Set()).size,
          totalVisitsCount: visitCountByState.get(state) || 0,
          activeClientsInMonth: (activeClientsByState.get(state) || new Set()).size,
          storeOrdersCount: storeOrdersByState.get(state) || (activeClientsByState.get(state) || new Set()).size,
          positivatedClientsAfterVisit: (positivatedClientsByState.get(state) || new Set()).size,
          ordersAfterVisit: ordersByState.get(state) || 0,
          revenueAfterVisit: revenueByState.get(state) || 0,
        };

        reg.totalClientsInRegion += 1;
        if (c.rcaName && c.rcaName !== 'A DEFINIR') reg.rcas.add(c.rcaName);

        regionMap.set(state, reg);
      });

      // Add consultants from visits
      consultantsByState.forEach((cSet, state) => {
        const reg = regionMap.get(state);
        if (reg) {
          cSet.forEach(cName => reg.consultants.add(cName));
        }
      });

    } else {
      // Fallback if regionalClients is empty
      const clientMap = new Map<string, {
        clientCode: string;
        clientName: string;
        state: string;
        consultantName: string;
        wasVisited: boolean;
        isActiveBefore: boolean;
        hasOrdersAfter: boolean;
        ordersAfter: number;
        revenueAfter: number;
        visitCount: number;
      }>();

      visits.forEach(v => {
        const state = (v.state && v.state.trim()) || (v.city ? v.city : 'Outros');
        const clientKey = `${state}_${v.clientCode || cleanCNPJ(v.cnpj) || v.clientName}`;
        const wasVisited = v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada');
        const hasOrdersAfter = Boolean((v.ordersAfterVisit && v.ordersAfterVisit > 0) || (v.revenueAfterVisit && v.revenueAfterVisit > 0) || v.dealClosed);
        const isActiveBefore = Boolean(v.ordersBeforeVisit && v.ordersBeforeVisit > 0) || Boolean(v.customerStatus && v.customerStatus.includes('ATIVO'));

        const existing = clientMap.get(clientKey) || {
          clientCode: v.clientCode || '',
          clientName: v.clientName,
          state,
          consultantName: v.consultantName || '',
          wasVisited: false,
          isActiveBefore,
          hasOrdersAfter: false,
          ordersAfter: 0,
          revenueAfter: 0,
          visitCount: 0,
        };

        if (wasVisited) {
          existing.wasVisited = true;
          existing.visitCount += 1;
        }
        if (hasOrdersAfter) {
          existing.hasOrdersAfter = true;
          existing.ordersAfter = Math.max(existing.ordersAfter, v.ordersAfterVisit || 1);
          existing.revenueAfter = Math.max(existing.revenueAfter, v.revenueAfterVisit || v.returnValue || 0);
        }
        if (isActiveBefore) {
          existing.isActiveBefore = true;
        }

        clientMap.set(clientKey, existing);
      });

      clientMap.forEach(client => {
        const state = client.state;
        let macroRegion = 'Nordeste';
        if (['Pará', 'Amapá', 'Amazonas', 'Rondônia', 'Roraima', 'Acre', 'Tocantins'].includes(state)) {
          macroRegion = 'Norte';
        } else if (['Espírito Santo', 'Minas Gerais', 'Rio de Janeiro', 'São Paulo'].includes(state)) {
          macroRegion = 'Sudeste';
        }

        const officialConsultant = STATE_OFFICIAL_CONSULTANT[state] || client.consultantName || 'Equipe Sou Energy';

        const reg = regionMap.get(state) || {
          state,
          macroRegion,
          officialConsultant,
          consultants: new Set([officialConsultant]),
          rcas: new Set(),
          totalClientsInRegion: 0,
          visitedClientsInRegion: 0,
          totalVisitsCount: 0,
          activeClientsInMonth: 0,
          storeOrdersCount: 0,
          positivatedClientsAfterVisit: 0,
          ordersAfterVisit: 0,
          revenueAfterVisit: 0,
        };

        reg.totalClientsInRegion += 1;
        if (client.consultantName) reg.consultants.add(client.consultantName);
        if (client.wasVisited) {
          reg.visitedClientsInRegion += 1;
          reg.totalVisitsCount += client.visitCount;
        }
        if (client.isActiveBefore || client.hasOrdersAfter) {
          reg.activeClientsInMonth += 1;
          reg.storeOrdersCount += 1;
        }
        if (client.wasVisited && client.hasOrdersAfter) {
          reg.positivatedClientsAfterVisit += 1;
          reg.ordersAfterVisit += client.ordersAfter;
          reg.revenueAfterVisit += client.revenueAfter;
        }

        regionMap.set(state, reg);
      });
    }

    // Calculate rates and averages for each region
    const list = Array.from(regionMap.values()).map(r => {
      const coverageRate = r.totalClientsInRegion > 0 ? (r.visitedClientsInRegion / r.totalClientsInRegion) * 100 : 0;
      const positivationRate = r.visitedClientsInRegion > 0 ? (r.positivatedClientsAfterVisit / r.visitedClientsInRegion) * 100 : 0;
      const avgVisitsPerPositivation = r.positivatedClientsAfterVisit > 0 
        ? (r.totalVisitsCount / r.positivatedClientsAfterVisit) 
        : 0;

      return {
        ...r,
        consultantsList: r.officialConsultant || Array.from(r.consultants).join(', ') || 'Consultor Regional',
        coverageRate,
        positivationRate,
        avgVisitsPerPositivation,
      };
    }).sort((a, b) => b.totalClientsInRegion - a.totalClientsInRegion);

    return list;
  }, [visits, validVisits, regionalClients, infoPedRecords]);

  // Selected Region Aggregated Metrics
  const currentRegionSummary = useMemo(() => {
    if (selectedRegion === 'all') {
      const totalClients = regionalMetrics.reduce((acc, r) => acc + r.totalClientsInRegion, 0);
      const visitedClients = regionalMetrics.reduce((acc, r) => acc + r.visitedClientsInRegion, 0);
      const totalVisits = regionalMetrics.reduce((acc, r) => acc + r.totalVisitsCount, 0);
      const activeMonth = regionalMetrics.reduce((acc, r) => acc + r.activeClientsInMonth, 0);
      const storeOrders = regionalMetrics.reduce((acc, r) => acc + (r.storeOrdersCount || r.activeClientsInMonth), 0);
      const positivated = regionalMetrics.reduce((acc, r) => acc + r.positivatedClientsAfterVisit, 0);
      const orders = regionalMetrics.reduce((acc, r) => acc + r.ordersAfterVisit, 0);
      const revenue = regionalMetrics.reduce((acc, r) => acc + r.revenueAfterVisit, 0);

      const coverage = totalClients > 0 ? (visitedClients / totalClients) * 100 : 0;
      const positivation = visitedClients > 0 ? (positivated / visitedClients) * 100 : 0;
      const avgVisits = positivated > 0 ? (totalVisits / positivated) : 0;

      return {
        title: 'Todas as Regiões (Geral Brasil)',
        macroRegion: 'Nacional (Norte / Nordeste / Sudeste)',
        consultants: '5 Consultores Ativos',
        totalClients,
        visitedClients,
        totalVisits,
        coverageRate: coverage,
        activeClientsInMonth: activeMonth,
        storeOrdersCount: storeOrders,
        positivatedClients: positivated,
        positivationRate: positivation,
        avgVisitsPerPositivation: avgVisits,
        orders,
        revenue,
      };
    }

    const reg = regionalMetrics.find(r => r.state === selectedRegion);
    if (!reg) {
      return {
        title: selectedRegion,
        macroRegion: 'Regional',
        consultants: 'Consultor',
        totalClients: 0,
        visitedClients: 0,
        totalVisits: 0,
        coverageRate: 0,
        activeClientsInMonth: 0,
        storeOrdersCount: 0,
        positivatedClients: 0,
        positivationRate: 0,
        avgVisitsPerPositivation: 0,
        orders: 0,
        revenue: 0,
      };
    }

    return {
      title: reg.state,
      macroRegion: reg.macroRegion,
      consultants: reg.consultantsList,
      totalClients: reg.totalClientsInRegion,
      visitedClients: reg.visitedClientsInRegion,
      totalVisits: reg.totalVisitsCount,
      coverageRate: reg.coverageRate,
      activeClientsInMonth: reg.activeClientsInMonth,
      storeOrdersCount: reg.storeOrdersCount || reg.activeClientsInMonth,
      positivatedClients: reg.positivatedClientsAfterVisit,
      positivationRate: reg.positivationRate,
      avgVisitsPerPositivation: reg.avgVisitsPerPositivation,
      orders: reg.ordersAfterVisit,
      revenue: reg.revenueAfterVisit,
    };
  }, [regionalMetrics, selectedRegion]);

  // Positivated clients detailed breakdown for Card 5
  const positivatedBreakdown = useMemo(() => {
    let firstPurchase = 0;
    let reactivated = 0;
    let activeRepurchase = 0;
    let totalPositivated = 0;

    const countedClients = new Set<string>();

    const visitsForRegion = selectedRegion === 'all' 
      ? validVisits 
      : validVisits.filter(v => v.state === selectedRegion);

    visitsForRegion.forEach(v => {
      const isPositivated = Boolean(
        (v.ordersAfterVisit && v.ordersAfterVisit > 0) || 
        (v.revenueAfterVisit && v.revenueAfterVisit > 0) || 
        v.dealClosed || 
        v.dealStatus === 'Negócio Fechado'
      );
      if (!isPositivated) return;

      const clientKey = v.clientCode || (v.clientName ? v.clientName.trim().toLowerCase() : v.id);
      if (countedClients.has(clientKey)) return;
      countedClients.add(clientKey);

      totalPositivated++;

      const rawStatus = (v.customerStatus || '').trim().toUpperCase();
      const ordersBefore = v.ordersBeforeVisit ?? 0;
      const isInactive = rawStatus.includes('INATIVO') || rawStatus.includes('HÁ MAIS DE 60') || rawStatus.includes('> 60') || rawStatus.includes('>60');
      const isNever = rawStatus.includes('NUNCA') || rawStatus.includes('PROSPEC') || rawStatus.includes('SEM CADASTRO') || (rawStatus === '' && ordersBefore === 0);
      const isAtivo = (rawStatus.includes('ATIVO') && !rawStatus.includes('INATIVO')) || rawStatus.includes('ÚLTIMOS 60') || ordersBefore > 0;

      if (isInactive) {
        reactivated++;
      } else if (isNever && !isAtivo && ordersBefore === 0) {
        firstPurchase++;
      } else {
        activeRepurchase++;
      }
    });

    const total = totalPositivated > 0 ? totalPositivated : currentRegionSummary.positivatedClients;

    return {
      total,
      firstPurchase,
      reactivated,
      activeRepurchase,
      firstPurchasePct: total > 0 ? (firstPurchase / total) * 100 : 0,
      reactivatedPct: total > 0 ? (reactivated / total) * 100 : 0,
      activeRepurchasePct: total > 0 ? (activeRepurchase / total) * 100 : 0,
    };
  }, [validVisits, selectedRegion, currentRegionSummary.positivatedClients]);

  // Selected breakdown category for Card 5 (1ª Compra, Reativado, Recompra)
  const [selectedPositivationTab, setSelectedPositivationTab] = useState<'all' | 'first' | 'reactivated' | 'active'>('all');

  const positivationSlides = [
    {
      id: 'first',
      tag: '🎉 1ª Compra (Novo Cliente)',
      count: positivatedBreakdown.firstPurchase,
      percent: positivatedBreakdown.firstPurchasePct,
      desc: 'Clientes que nunca tinham comprado e fecharam pedido',
      color: 'emerald',
      bgClass: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      barColor: 'bg-emerald-500',
      dotColor: 'bg-emerald-500',
    },
    {
      id: 'reactivated',
      tag: '⚡ Reativação (>60d sem compras)',
      count: positivatedBreakdown.reactivated,
      percent: positivatedBreakdown.reactivatedPct,
      desc: 'Clientes inativos há mais de 60 dias reativados',
      color: 'amber',
      bgClass: 'bg-amber-50 text-amber-950 border-amber-200/80',
      badgeClass: 'bg-amber-100 text-amber-900',
      barColor: 'bg-amber-500',
      dotColor: 'bg-amber-500',
    },
    {
      id: 'active',
      tag: '🟢 Recompra (Cliente Ativo)',
      count: positivatedBreakdown.activeRepurchase,
      percent: positivatedBreakdown.activeRepurchasePct,
      desc: 'Clientes ativos na base que realizaram novo pedido',
      color: 'blue',
      bgClass: 'bg-blue-50 text-blue-950 border-blue-200/80',
      badgeClass: 'bg-blue-100 text-blue-800',
      barColor: 'bg-blue-500',
      dotColor: 'bg-blue-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Base Total Mapeada */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Base Total Mapeada</span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-600 border border-blue-100">
              <span>{regionalMetrics.length} Regiões Ativas</span>
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl lg:text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
              {(regionalClients?.length || 6191).toLocaleString('pt-BR')} clientes
            </h3>
          </div>
          <SparklineWave id="base" color="#0ea5e9" trend="neutral" />
        </div>

        {/* Card 2: Clientes Visitados */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Clientes Visitados</span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUp className="w-3 h-3" />
              <span>+{validVisits.length} visitas</span>
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl lg:text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
              {completedVisits} clientes
            </h3>
          </div>
          <SparklineWave id="visitados" color="#2563eb" trend="up" />
        </div>

        {/* Card 3: Conversão Real Pós-Visita */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Conversão Pós-Visita</span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">
              <span>{closedDeals} de {completedVisits}</span>
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl lg:text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
              {conversionRate.toFixed(1)}%
            </h3>
          </div>
          <SparklineWave id="conversao" color="#6366f1" trend="up" />
        </div>

        {/* Card 4: Quantidade de Pedidos Faturados */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pedidos Faturados</span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUp className="w-3 h-3" />
              <span>+{totalPostVisitOrders}</span>
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl lg:text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
              {totalPostVisitOrders} pedidos
            </h3>
          </div>
          <SparklineWave id="pedidos" color="#2563eb" trend="up" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEDICATED SECTION: ACOMPANHAMENTO DAS VISITAS E DA REGIÃO                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-6">
        {/* Section Header with Region Filter Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Acompanhamento das Visitas e da Região
                </h2>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                  Mapeamento
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Indicadores regionais de presença, cobertura de carteira, clientes ativos no mês, taxa de positivação e esforço comercial
              </p>
            </div>
          </div>

          {/* Quick Region Selector Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedRegion('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedRegion === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Todas as Regiões
            </button>
            {regionalMetrics.map(r => (
              <button
                key={r.state}
                onClick={() => setSelectedRegion(r.state)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRegion === r.state
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {r.state} ({r.totalClientsInRegion})
              </button>
            ))}

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('regional-clients')}
                className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>Ver Lista de Clientes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 6 Key Bullet Points from User Request as Bento Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Item 1: Mapear a Região */}
          <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    1. Mapeamento da Região
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800">
                  {currentRegionSummary.macroRegion}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  {currentRegionSummary.title}
                </h4>
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{currentRegionSummary.consultants}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Item 2: Quantos clientes existem na região X */}
          <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    2. Clientes na Região
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800">
                  Base Cadastrada
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-2">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentRegionSummary.totalClients.toLocaleString('pt-BR')}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">clientes mapeados</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  {selectedRegion === 'all' 
                    ? `Total geral de clientes cadastrados na loja` 
                    : `Base de clientes cadastrados em ${currentRegionSummary.title}`}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
              <span>Potencial de carteira:</span>
              <span className="font-bold text-indigo-600">
                {currentRegionSummary.totalClients.toLocaleString('pt-BR')} clientes
              </span>
            </div>
          </div>

          {/* Item 3: % de clientes visitados em relação ao total de clientes da região / loja */}
          <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    3. % Clientes Visitados (Cobertura)
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
                  {selectedRegion === 'all' ? 'Cobertura Geral' : 'Cobertura Regional'}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-2">
                  <h4 className="text-2xl font-black text-emerald-700 tracking-tight">
                    {currentRegionSummary.coverageRate.toFixed(1)}%
                  </h4>
                  <span className="text-xs font-bold text-slate-600">
                    ({currentRegionSummary.visitedClients} de {currentRegionSummary.totalClients.toLocaleString('pt-BR')})
                  </span>
                </div>
                {/* Store share indicator */}
                {selectedRegion !== 'all' && (
                  <div className="mt-1.5 text-[11px] text-slate-600 font-medium bg-blue-50/80 py-1 px-2.5 rounded-lg border border-blue-200/70 flex items-center justify-between">
                    <span className="text-blue-800 font-semibold">% da base total da loja:</span>
                    <span className="font-black text-blue-700">
                      {((currentRegionSummary.visitedClients / (regionalClients?.length || 6191)) * 100).toFixed(2)}% ({currentRegionSummary.visitedClients} de {(regionalClients?.length || 6191).toLocaleString('pt-BR')})
                    </span>
                  </div>
                )}
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(4, currentRegionSummary.coverageRate))}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
              <span>Cálculo de Cobertura:</span>
              <span className="font-bold text-emerald-700">
                ({currentRegionSummary.visitedClients} ÷ {currentRegionSummary.totalClients.toLocaleString('pt-BR')}) × 100% = {currentRegionSummary.coverageRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Item 4: Quantos clientes ativos existem no mês (INFO-PED) */}
          <div 
            onClick={() => setIsActiveClientsModalOpen(true)}
            className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between hover:bg-amber-50/40 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
            title="Clique para ver o detalhamento por região dos clientes ativos"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-800 transition-colors">
                    4. Clientes Ativos em Loja
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ÚLTIMOS 60 DIAS
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-800">
                    INFO-PED
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 opacity-90 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5">
                    <span>Ver regiões ↗</span>
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-2">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-amber-900 transition-colors">
                    {currentRegionSummary.activeClientsInMonth}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">integradores ativos (&le; 60 dias)</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  {currentRegionSummary.storeOrdersCount 
                    ? `${currentRegionSummary.storeOrdersCount.toLocaleString('pt-BR')} pedidos faturados nos últimos 60 dias`
                    : 'Integradores com compras nos últimos 60 dias (INFO-PED)'}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <span>Atividade (60 dias):</span>
                <span className="text-[10px] text-amber-600 font-semibold">(Clique p/ detalhar)</span>
              </span>
              <span className="font-bold text-emerald-700">
                {currentRegionSummary.totalClients > 0 
                  ? `${((currentRegionSummary.activeClientsInMonth / currentRegionSummary.totalClients) * 100).toFixed(1)}% da base ativa (${currentRegionSummary.activeClientsInMonth} de ${currentRegionSummary.totalClients})`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* Item 5: Após as visitas, quantos clientes ficaram ativos e % positivação */}
          <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    5. Positivação Pós-Visita
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800">
                  {currentRegionSummary.positivationRate.toFixed(1)}% taxa
                </span>
              </div>

              <div className="mt-2.5">
                <div className="flex items-baseline space-x-2">
                  <h4 className="text-2xl font-black text-blue-700 tracking-tight">
                    {currentRegionSummary.positivatedClients}
                  </h4>
                  <span className="text-xs font-bold text-slate-600">
                    clientes ativados ({currentRegionSummary.positivationRate.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Clientes que efetuaram pedidos após o contato presencial
                </p>
              </div>

              {/* Simple Click-to-View 3-Category Breakdown */}
              <div className="mt-3.5 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Detalhamento dos {positivatedBreakdown.total} ativados:</span>
                  <span className="text-[9px] text-blue-600 font-semibold">Clique para ver</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* 1ª Compra */}
                  <button
                    type="button"
                    onClick={() => setSelectedPositivationTab(prev => prev === 'first' ? 'all' : 'first')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPositivationTab === 'first'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                        : 'bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold truncate">1ª Compra</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedPositivationTab === 'first' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    </div>
                    <div className={`text-base font-black mt-0.5 ${selectedPositivationTab === 'first' ? 'text-white' : 'text-emerald-800'}`}>
                      {positivatedBreakdown.firstPurchase}
                    </div>
                    <div className={`text-[9px] font-semibold ${selectedPositivationTab === 'first' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                      {positivatedBreakdown.firstPurchasePct.toFixed(0)}% do total
                    </div>
                  </button>

                  {/* Reativado */}
                  <button
                    type="button"
                    onClick={() => setSelectedPositivationTab(prev => prev === 'reactivated' ? 'all' : 'reactivated')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPositivationTab === 'reactivated'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                        : 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold truncate">Reativado</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedPositivationTab === 'reactivated' ? 'bg-white' : 'bg-amber-500'}`}></span>
                    </div>
                    <div className={`text-base font-black mt-0.5 ${selectedPositivationTab === 'reactivated' ? 'text-white' : 'text-amber-900'}`}>
                      {positivatedBreakdown.reactivated}
                    </div>
                    <div className={`text-[9px] font-semibold ${selectedPositivationTab === 'reactivated' ? 'text-amber-100' : 'text-amber-800'}`}>
                      {positivatedBreakdown.reactivatedPct.toFixed(0)}% do total
                    </div>
                  </button>

                  {/* Recompra Ativa */}
                  <button
                    type="button"
                    onClick={() => setSelectedPositivationTab(prev => prev === 'active' ? 'all' : 'active')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPositivationTab === 'active'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                        : 'bg-blue-50/70 hover:bg-blue-100/80 text-blue-950 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold truncate">Recompra</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedPositivationTab === 'active' ? 'bg-white' : 'bg-blue-500'}`}></span>
                    </div>
                    <div className={`text-base font-black mt-0.5 ${selectedPositivationTab === 'active' ? 'text-white' : 'text-blue-900'}`}>
                      {positivatedBreakdown.activeRepurchase}
                    </div>
                    <div className={`text-[9px] font-semibold ${selectedPositivationTab === 'active' ? 'text-blue-100' : 'text-blue-700'}`}>
                      {positivatedBreakdown.activeRepurchasePct.toFixed(0)}% do total
                    </div>
                  </button>
                </div>

                {/* Expanded Explanation on Click */}
                <AnimatePresence>
                  {selectedPositivationTab !== 'all' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs mt-1">
                        {selectedPositivationTab === 'first' && (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                                <span>🎉 1ª Compra ({positivatedBreakdown.firstPurchase} clientes)</span>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Clientes novos que nunca haviam comprado antes e fecharam pedido após a visita.
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedPositivationTab('all')}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {selectedPositivationTab === 'reactivated' && (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                                <span>⚡ Reativados ({positivatedBreakdown.reactivated} clientes)</span>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Clientes inativos há mais de 60 dias sem comprar que foram reativados pós-visita.
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedPositivationTab('all')}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {selectedPositivationTab === 'active' && (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-blue-900 text-[11px] flex items-center gap-1">
                                <span>🟢 Recompra ({positivatedBreakdown.activeRepurchase} clientes)</span>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Clientes que já compravam regularmente (&le;60 dias) e realizaram novos pedidos.
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedPositivationTab('all')}
                              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
              <span>Pedidos fechados pós-visita:</span>
              <span className="font-bold text-blue-800">
                {currentRegionSummary.orders} pedidos faturados
              </span>
            </div>
          </div>

          {/* Item 6: Qual a média de visitas realizadas para positivar um cliente */}
          <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/80 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Repeat className="w-4 h-4 text-purple-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    6. Média de Visitas p/ Positivar
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100/80 text-purple-800">
                  Esforço Comercial
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline space-x-2">
                  <h4 className="text-2xl font-black text-purple-700 tracking-tight">
                    {currentRegionSummary.avgVisitsPerPositivation > 0 
                      ? currentRegionSummary.avgVisitsPerPositivation.toFixed(1)
                      : '---'}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">visitas / cliente positivado</span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Frequência média de visitas necessárias em campo para fechar pedidos
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
              <span>Relação de conversão:</span>
              <span className="font-bold text-purple-700">
                {currentRegionSummary.positivatedClients > 0 
                  ? `1 positivação a cada ${currentRegionSummary.avgVisitsPerPositivation.toFixed(1)} visitas`
                  : 'Aguardando fechamento'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Regional Comparison Table */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Matriz Comparativa por Região / Estado</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              {regionalMetrics.length} regiões mapeadas
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Região / Estado</th>
                  <th className="py-3 px-3">Consultor(es)</th>
                  <th className="py-3 px-3 text-center">Clientes na Região</th>
                  <th className="py-3 px-3 text-center">Visitados (% Cobertura Regional)</th>
                  <th className="py-3 px-3 text-center">Ativos (&le; 60d)<br/><span className="text-[9px] font-normal text-slate-500">(% da Base Ativa)</span></th>
                  <th className="py-3 px-3 text-center">Positivados Pós-Visita</th>
                  <th className="py-3 px-3 text-center">% Positivação</th>
                  <th className="py-3 px-3 text-center">Média Visitas / Positivação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionalMetrics.map((reg) => {
                  const isSelected = selectedRegion === reg.state;
                  const totalStoreClients = regionalClients?.length || 6191;

                  return (
                    <tr 
                      key={reg.state} 
                      onClick={() => setSelectedRegion(reg.state)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-bold text-slate-900 flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{reg.state}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-normal">
                          {reg.macroRegion}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium truncate max-w-[160px]">
                        {reg.consultantsList}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {reg.totalClientsInRegion.toLocaleString('pt-BR')}
                        <span className="text-[10px] text-slate-500 font-normal block">
                          ({((reg.totalClientsInRegion / totalStoreClients) * 100).toFixed(1)}% da loja)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        <span className="text-emerald-700 font-black">{reg.coverageRate.toFixed(1)}%</span>
                        <span className="text-[11px] text-slate-500 font-normal block">({reg.visitedClientsInRegion} de {reg.totalClientsInRegion.toLocaleString('pt-BR')})</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-amber-700 text-sm block">
                          {reg.activeClientsInMonth}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
                          {reg.totalClientsInRegion > 0 
                            ? `${((reg.activeClientsInMonth / reg.totalClientsInRegion) * 100).toFixed(1)}% da base`
                            : '0%'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700">
                        {reg.positivatedClientsAfterVisit}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                          reg.positivationRate > 30 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : reg.positivationRate > 0 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {reg.positivationRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-purple-700">
                        {reg.avgVisitsPerPositivation > 0 
                          ? `${reg.avgVisitsPerPositivation.toFixed(1)} visitas` 
                          : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td className="py-3 px-3.5" colSpan={2}>
                    Total Consolidado (Loja Sou Energy)
                  </td>
                  <td className="py-3 px-3 text-center text-slate-900 font-black">
                    {regionalMetrics.reduce((a, b) => a + b.totalClientsInRegion, 0).toLocaleString('pt-BR')} clientes
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-800 font-black">
                    {((regionalMetrics.reduce((a, b) => a + b.visitedClientsInRegion, 0) / (regionalClients?.length || 6191)) * 100).toFixed(1)}%
                    <span className="text-[10px] text-slate-600 block">({regionalMetrics.reduce((a, b) => a + b.visitedClientsInRegion, 0)} visitados)</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-black text-amber-800 text-sm block">
                      {regionalMetrics.reduce((a, b) => a + b.activeClientsInMonth, 0)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
                      {regionalMetrics.reduce((a, b) => a + b.totalClientsInRegion, 0) > 0
                        ? `${((regionalMetrics.reduce((a, b) => a + b.activeClientsInMonth, 0) / regionalMetrics.reduce((a, b) => a + b.totalClientsInRegion, 0)) * 100).toFixed(1)}% da base`
                        : '0%'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-blue-800 font-black">
                    {regionalMetrics.reduce((a, b) => a + b.positivatedClientsAfterVisit, 0)}
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-800 font-black">
                    {regionalMetrics.reduce((a, b) => a + b.visitedClientsInRegion, 0) > 0 
                      ? ((regionalMetrics.reduce((a, b) => a + b.positivatedClientsAfterVisit, 0) / regionalMetrics.reduce((a, b) => a + b.visitedClientsInRegion, 0)) * 100).toFixed(1)
                      : 0}%
                  </td>
                  <td className="py-3 px-3 text-center text-purple-800 font-black">
                    {regionalMetrics.reduce((a, b) => a + b.positivatedClientsAfterVisit, 0) > 0
                      ? (regionalMetrics.reduce((a, b) => a + b.totalVisitsCount, 0) / regionalMetrics.reduce((a, b) => a + b.positivatedClientsAfterVisit, 0)).toFixed(1)
                      : '---'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Middle Big Bento Card: Visits & Orders Evolution */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Evolução de Visitas e Positivações Comerciais
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Volume de visitas realizadas em campo e pedidos faturados pós-visita
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setActiveChartTab('growth')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeChartTab === 'growth'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Evolução Mensal
              </button>
              <button
                onClick={() => setActiveChartTab('comparison')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeChartTab === 'comparison'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Consultor
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'growth' ? (
              <AreaChart data={revenueGrowthTimeline} margin={{ top: 25, right: 30, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#2563eb" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(val: any, name: any) => {
                    const isVisits = name === 'Visitas Realizadas' || name === 'visits' || name === 'Visitas';
                    return [
                      `${val} ${isVisits ? 'visitas realizadas' : 'pedidos faturados'}`, 
                      isVisits ? 'Visitas Realizadas' : 'Pedidos Faturados'
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
                <Area 
                  type="monotone" 
                  dataKey="visits" 
                  name="Visitas Realizadas"
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#visitsGradient)" 
                  dot={{ r: 4, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 2.5 }}
                  activeDot={{ r: 7, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 3 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="orders" 
                  name="Pedidos Faturados"
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#ordersGradient)" 
                  dot={{ r: 4, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2.5 }}
                  activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={consultantChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} ${name}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Visitas" fill="#2563eb" radius={[8, 8, 0, 0]} name="Visitas Realizadas" />
                <Bar dataKey="PedidosGerados" fill="#10b981" radius={[8, 8, 0, 0]} name="Pedidos Faturados" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row Bento Layout: Left = Recent Activity / Consultant Table, Right = Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Bento: Desempenho por Consultor */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Desempenho por Consultor (Campo & Positivação)
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {completedVisits} clientes visitados, <strong className="text-indigo-700 font-bold">{totalNewRegistrations} cadastros novos</strong> e {totalPostVisitOrders} pedidos faturados pós-visita
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedConsultantForDonut && (
                  <button
                    onClick={() => setSelectedConsultantForDonut(null)}
                    className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>✕ Limpar seleção</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedConsultantForNewReg(null);
                    setIsNewRegistrationsModalOpen(true);
                  }}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200/70 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Ver todos os novos cadastros identificados na base"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{totalNewRegistrations} Cadastros Novos</span>
                </button>
                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  {totalPostVisitOrders} Pedidos Gerados
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-medium mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              <span>Clique em qualquer consultor para filtrar o gráfico de <strong>Distribuição da Carteira</strong> ao lado:</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-600 font-bold border-b border-slate-100">
                    <th className="pb-3 pl-2">Consultor</th>
                    <th className="pb-3 px-3">Região / Equipe</th>
                    <th className="pb-3 px-3 text-center">Visitas</th>
                    <th className="pb-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-indigo-700">
                        <UserPlus className="w-3 h-3" />
                        <span>Cadastros Novos</span>
                      </span>
                    </th>
                    <th className="pb-3 pr-2 text-right">Pedidos & Conversão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {consultants.map((consultant) => {
                    const isSelected = selectedConsultantForDonut === consultant.id || selectedConsultantForDonut === consultant.name;
                    const data = consultantChartData.find(d => d.fullName === consultant.name) || {
                      Retorno: 0,
                      PedidosGerados: 0,
                      Visitas: 0,
                      CadastrosNovos: 0,
                      CadastrosNovosDirectNao: 0,
                      Conversao: 0,
                      initials: 'CC'
                    };

                    const maxOrders = Math.max(...consultantChartData.map(d => d.PedidosGerados), 1);
                    const progressPercent = maxOrders > 0 ? Math.min(100, Math.round((data.PedidosGerados / maxOrders) * 100)) : 0;
                    
                    const statusConfig = data.Conversao > 30 
                      ? { label: 'Alta Conversão', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                      : data.PedidosGerados > 0
                      ? { label: 'Positivando', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
                      : { label: 'Em Prospecção', bg: 'bg-slate-100 text-slate-600 border-slate-200' };

                    return (
                      <tr 
                        key={consultant.id} 
                        onClick={() => setSelectedConsultantForDonut(prev => prev === consultant.id ? null : consultant.id)}
                        className={`transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/90 font-medium' 
                            : 'hover:bg-slate-50/80'
                        }`}
                        title={isSelected ? 'Clique para desmarcar' : `Clique para ver a carteira de ${consultant.name}`}
                      >
                        <td className="py-3 pl-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-blue-700 text-white ring-2 ring-blue-300' : 'bg-slate-900 text-white'
                            }`}>
                              {data.initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs sm:text-sm ${isSelected ? 'font-black text-blue-950' : 'font-bold text-slate-900'}`}>
                                  {consultant.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-600 text-white">
                                    Filtro Ativo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-slate-600">
                          {consultant.region}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">{data.Visitas}</span>
                          <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {data.CadastrosNovos > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConsultantForNewReg(consultant.id);
                                setIsNewRegistrationsModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                              title={`Clique para ver os ${data.CadastrosNovos} novos clientes cadastrados por ${consultant.name}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                              <span>+{data.CadastrosNovos} novos</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            <div className="w-24 sm:w-32 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.max(progressPercent, 6)}%` }}
                              />
                            </div>
                            <div className="text-right">
                              <span className="font-black text-xs sm:text-sm text-emerald-700 whitespace-nowrap block">
                                {data.PedidosGerados} pedidos
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 block">
                                {data.Conversao.toFixed(1)}% conversão
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Bento: Task / Status Distribution (Donut Chart matching selected consultant) */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {selectedConsultantObj ? `Status dos Clientes: ${selectedConsultantObj.name.split(' ')[0]}` : 'Status dos Clientes Visitados'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedConsultantObj ? `${selectedConsultantObj.region} • Resultado das visitas` : 'Resultado comercial dos clientes visitados'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-2.5 py-1 rounded-full">
                  {selectedConsultantVisits.length} Clientes
                </span>
                {selectedConsultantObj && (
                  <button
                    onClick={() => setSelectedConsultantForDonut(null)}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Ver todos (250)
                  </button>
                )}
              </div>
            </div>

            {/* Donut Chart */}
            <div className="h-52 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val} clientes (${statusDistributionData.find(d => d.name === name)?.pct.toFixed(1) || 0}%)`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{selectedConsultantVisits.length}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Clientes
                </span>
              </div>
            </div>
          </div>

          {/* Donut Legend with direct values & percentages */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {statusDistributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 font-medium truncate text-[11px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <div className="text-right shrink-0 ml-1">
                  <span className="font-black text-slate-900 text-[11px] block">
                    {item.value}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold block">
                    {item.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Monthly Conversion Rate Module (% de Vendas Pós-Visita por Consultor) */}
      <ConsultantMonthlyConversion 
        consultants={consultants} 
        validVisits={validVisits} 
      />

      {/* 2. Interactive Visited vs. Activated Clients List & Comparison */}
      <VisitedVsActivatedList 
        consultants={consultants} 
        validVisits={validVisits} 
        onNavigateToTab={onNavigateToTab}
      />

      {/* 3. Regional Breakdown Modal for Active Store Clients */}
      <ActiveClientsRegionalModal
        isOpen={isActiveClientsModalOpen}
        onClose={() => setIsActiveClientsModalOpen(false)}
        regionalMetrics={regionalMetrics}
        totalActiveClients={currentRegionSummary.activeClientsInMonth}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
        visits={validVisits}
        regionalClients={regionalClients}
        infoPedRecords={infoPedRecords}
      />

      {/* 4. New Registrations Modal (Cadastros Novos Realizados em Campo) */}
      <NewRegistrationsModal
        isOpen={isNewRegistrationsModalOpen}
        onClose={() => setIsNewRegistrationsModalOpen(false)}
        consultants={consultants}
        visits={visits}
        initialConsultantId={selectedConsultantForNewReg}
      />
    </div>
  );
};
