import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Building2, 
  Activity, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  Users, 
  Filter,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { Visit, RegionalClient, InfoPedRecord } from '../types';

interface RegionalMetricItem {
  state: string;
  macroRegion: string;
  officialConsultant: string;
  consultants: Set<string>;
  rcas: Set<string>;
  totalClientsInRegion: number;
  visitedClientsInRegion: number;
  totalVisitsCount: number;
  activeClientsInMonth: number;
  positivatedClientsAfterVisit: number;
  ordersAfterVisit: number;
  revenueAfterVisit: number;
}

interface ActiveClientsRegionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionalMetrics: RegionalMetricItem[];
  totalActiveClients: number;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  visits: Visit[];
  regionalClients?: RegionalClient[];
  infoPedRecords?: InfoPedRecord[];
}

export const ActiveClientsRegionalModal: React.FC<ActiveClientsRegionalModalProps> = ({
  isOpen,
  onClose,
  regionalMetrics = [],
  totalActiveClients = 0,
  selectedRegion = 'all',
  onSelectRegion,
  visits = [],
  regionalClients = [],
  infoPedRecords = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');
  const [timeWindow, setTimeWindow] = useState<'60d' | 'all'>('60d');

  // Filter regional metrics that have at least 1 active client
  const activeRegions = useMemo(() => {
    return (regionalMetrics || [])
      .filter(r => r.activeClientsInMonth > 0 || r.totalClientsInRegion > 0)
      .sort((a, b) => b.activeClientsInMonth - a.activeClientsInMonth);
  }, [regionalMetrics]);

  // Extract list of individual active clients
  const activeClientsList = useMemo(() => {
    const list: Array<{
      clientCode: string;
      name: string;
      cnpj: string;
      state: string;
      city: string;
      rcaName: string;
      consultantName: string;
      ordersCount: number;
      totalOrdersYear: number;
      revenue: number;
      lastOrderDate?: string;
      daysSinceLastOrder?: number;
      isWithin60Days: boolean;
      status: string;
    }> = [];

    const seenKeys = new Set<string>();

    // 1. From infoPedRecords if available
    if (infoPedRecords && infoPedRecords.length > 0) {
      infoPedRecords.forEach(rec => {
        const is60d = rec.isWithin60Days ?? (rec.ordersCount60d ? rec.ordersCount60d > 0 : true);
        if (timeWindow === '60d' && !is60d) {
          return;
        }

        const key = rec.clientCode || rec.cnpj || rec.clientName || '';
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          const days = rec.daysSinceLastOrder;
          let statusText = 'Ativo (≤ 60d)';
          if (days !== undefined) {
            if (days <= 30) statusText = 'Super Ativo (≤ 30d)';
            else if (days <= 60) statusText = 'Ativo (≤ 60d)';
            else statusText = 'Sem compra (+60d)';
          }

          list.push({
            clientCode: rec.clientCode || '---',
            name: rec.clientName || 'Integrador Faturado',
            cnpj: rec.cnpj || '',
            state: rec.state || rec.billedClientState || 'Não Definido',
            city: rec.city || '---',
            rcaName: rec.rcaName || '---',
            consultantName: 'Equipe Sou Energy',
            ordersCount: rec.ordersCount60d !== undefined ? rec.ordersCount60d : (rec.ordersCount || 1),
            totalOrdersYear: rec.ordersCount || 1,
            revenue: rec.orderValue60d || rec.orderValue || 0,
            lastOrderDate: rec.lastOrderDate,
            daysSinceLastOrder: rec.daysSinceLastOrder,
            isWithin60Days: is60d,
            status: statusText,
          });
        }
      });
    } else {
      // 2. From visits with active status or post-visit orders
      (visits || []).forEach(v => {
        const isActive = Boolean(
          (v.ordersAfterVisit && v.ordersAfterVisit > 0) ||
          (v.revenueAfterVisit && v.revenueAfterVisit > 0) ||
          v.dealClosed ||
          (v.ordersBeforeVisit && v.ordersBeforeVisit > 0) ||
          (v.customerStatus && v.customerStatus.includes('ATIVO'))
        );

        if (isActive) {
          const key = v.clientCode || v.cnpj || v.clientName;
          if (key && !seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({
              clientCode: v.clientCode || '---',
              name: v.clientName,
              cnpj: v.cnpj || '',
              state: v.state || 'Não Definido',
              city: v.city || '---',
              rcaName: v.whoServesCustomer || '---',
              consultantName: v.consultantName || '---',
              ordersCount: (v.ordersAfterVisit || 0) + (v.ordersBeforeVisit || 0),
              totalOrdersYear: (v.ordersAfterVisit || 0) + (v.ordersBeforeVisit || 0),
              revenue: (v.revenueAfterVisit || 0) + (v.returnValue || 0),
              isWithin60Days: true,
              status: v.ordersAfterVisit && v.ordersAfterVisit > 0 ? 'Positivado Pós-Visita' : 'Ativo em Carteira',
            });
          }
        }
      });
    }

    return list;
  }, [infoPedRecords, visits, timeWindow]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return activeClientsList.filter(c => {
      const matchState = selectedStateFilter === 'all' || c.state === selectedStateFilter;
      const matchSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm);
      return matchState && matchSearch;
    });
  }, [activeClientsList, selectedStateFilter, searchTerm]);

  const handleSelectRegionAndClose = (state: string) => {
    onSelectRegion(state);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Regiões dos Clientes Ativos em Loja
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
                  ÚLTIMOS 60 DIAS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-black">
                  INFO-PED
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Detalhamento dos <strong className="text-slate-800 font-black">{totalActiveClients} clientes/integradores ativos</strong> (com compras nos últimos 60 dias) distribuídos por estado e região
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top Macro Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Ativos</span>
              <p className="text-xl font-black text-amber-900 mt-0.5">{totalActiveClients}</p>
              <span className="text-[10px] text-amber-700 font-medium">integradores em loja</span>
            </div>
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Estados com Ativos</span>
              <p className="text-xl font-black text-blue-900 mt-0.5">
                {activeRegions.filter(r => r.activeClientsInMonth > 0).length} estados
              </p>
              <span className="text-[10px] text-blue-700 font-medium">comprando no período</span>
            </div>
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Estado Líder</span>
              <p className="text-xl font-black text-emerald-900 mt-0.5">
                {activeRegions[0]?.state || '---'}
              </p>
              <span className="text-[10px] text-emerald-700 font-medium">
                {activeRegions[0]?.activeClientsInMonth || 0} clientes ativos
              </span>
            </div>
            <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Base Total Cadastrada</span>
              <p className="text-xl font-black text-indigo-900 mt-0.5">
                {(regionalClients?.length || 6191).toLocaleString('pt-BR')}
              </p>
              <span className="text-[10px] text-indigo-700 font-medium">clientes na loja</span>
            </div>
          </div>

          {/* Regional Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Distribuição por Estado / Região</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Clique em um estado para filtrar o Dashboard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeRegions.map(reg => {
                const percentOfState = reg.totalClientsInRegion > 0 
                  ? ((reg.activeClientsInMonth / reg.totalClientsInRegion) * 100).toFixed(1)
                  : '0';
                const isSelected = selectedRegion === reg.state;

                return (
                  <div
                    key={reg.state}
                    onClick={() => handleSelectRegionAndClose(reg.state)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between hover:shadow-md ${
                      isSelected 
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/40 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MapPin className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-amber-600'}`} />
                          <h5 className="font-black text-slate-900 text-sm">{reg.state}</h5>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {reg.macroRegion}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-black text-slate-900">{reg.activeClientsInMonth}</span>
                          <span className="text-xs font-bold text-slate-500 ml-1.5">integradores ativos</span>
                        </div>
                        {(reg as any).storeOrdersCount ? (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                            {Number((reg as any).storeOrdersCount).toLocaleString('pt-BR')} pedidos
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Base total: <strong>{reg.totalClientsInRegion}</strong> ({percentOfState}% ativa)</span>
                      <span className="font-bold text-blue-600 flex items-center space-x-0.5">
                        <span>Filtrar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Client Search & Table */}
          <div className="pt-3 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Integradores ({filteredClients.length})</span>
                </h4>

                {/* Time Window Switcher */}
                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTimeWindow('60d')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      timeWindow === '60d'
                        ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ativos (&le; 60 dias)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeWindow('all')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      timeWindow === 'all'
                        ? 'bg-white text-blue-800 shadow-xs border border-blue-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Acumulado 2026
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente, código, CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white w-44 sm:w-52"
                  />
                </div>

                <select
                  value={selectedStateFilter}
                  onChange={(e) => setSelectedStateFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="all">Todos os Estados</option>
                  {activeRegions.map(r => (
                    <option key={r.state} value={r.state}>{r.state} ({r.activeClientsInMonth})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Integrador</th>
                    <th className="py-2.5 px-3">Estado / Cidade</th>
                    <th className="py-2.5 px-3 text-center">Última Compra</th>
                    <th className="py-2.5 px-3 text-center">Pedidos (60d)</th>
                    <th className="py-2.5 px-3">RCA / Consultor</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Nenhum cliente ativo encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client, idx) => {
                      const formatDateBR = (iso?: string) => {
                        if (!iso) return '---';
                        const parts = iso.split('-');
                        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        return iso;
                      };

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">
                            {client.clientCode}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{client.name}</div>
                            {client.cnpj && <div className="text-[10px] text-slate-400 font-mono">{client.cnpj}</div>}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{client.state}</div>
                            <div className="text-[10px] text-slate-400">{client.city}</div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {client.lastOrderDate ? (
                              <div>
                                <span className="font-semibold text-slate-800">{formatDateBR(client.lastOrderDate)}</span>
                                {client.daysSinceLastOrder !== undefined && (
                                  <div className="text-[10px] text-slate-400">
                                    há {client.daysSinceLastOrder} {client.daysSinceLastOrder === 1 ? 'dia' : 'dias'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">---</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded font-black text-slate-800 bg-slate-100 border border-slate-200/60">
                              {client.ordersCount}
                            </span>
                            {client.totalOrdersYear > client.ordersCount && (
                              <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                                ({client.totalOrdersYear} no ano)
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {client.rcaName !== '---' ? client.rcaName : client.consultantName}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              client.status.includes('Super Ativo') 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : client.status.includes('Ativo')
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : client.status.includes('Positivado')
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => handleSelectRegionAndClose('all')}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Ver Todas as Regiões no Dashboard
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fechar Detalhamento
          </button>
        </div>

      </div>
    </div>
  );
};
