import React, { useState, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  Search, 
  Building2, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Store, 
  Filter, 
  HelpCircle,
  ShoppingBag,
  ExternalLink,
  Users
} from 'lucide-react';
import { Consultant, Visit } from '../types';

interface NewRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: Consultant[];
  visits: Visit[];
  initialConsultantId?: string | null;
}

export const NewRegistrationsModal: React.FC<NewRegistrationsModalProps> = ({
  isOpen,
  onClose,
  consultants,
  visits,
  initialConsultantId = null,
}) => {
  const [selectedConsultantFilter, setSelectedConsultantFilter] = useState<string>(initialConsultantId || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<'all' | 'direct_nao' | 'sem_cadastro'>('all');

  // Reset or update filter if initialConsultantId changes when opening
  React.useEffect(() => {
    if (initialConsultantId) {
      setSelectedConsultantFilter(initialConsultantId);
    } else {
      setSelectedConsultantFilter('all');
    }
  }, [initialConsultantId, isOpen]);

  // Extract all visits that represent new registrations
  const newRegistrations = useMemo(() => {
    const list: Array<{
      id: string;
      searchId?: string;
      clientName: string;
      clientCode?: string;
      cnpj?: string;
      consultantId: string;
      consultantName: string;
      date: string;
      state: string;
      city: string;
      answerNao: boolean;
      status: string;
      notes?: string;
      ordersAfterVisit: number;
      revenueAfterVisit: number;
      dealClosed: boolean;
    }> = [];

    // Filter realized/valid visits that represent a new registration
    const valid = visits.filter(v => v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada'));

    // To prevent duplicate count for same client per consultant, keep unique client record
    const clientSeenMap = new Map<string, typeof list[0]>();

    valid.forEach(v => {
      const isDirectNao = v.clienteJaPossuiCadastroLoja === 'NÃO' || v.clienteJaPossuiCadastroLoja === 'NAO';
      const isSemCad = (v.customerStatus && v.customerStatus.toUpperCase() === 'SEM CADASTRO') || v.isNewRegistration;

      if (isDirectNao || isSemCad) {
        const cKey = (v.consultantId || v.consultantName) + '_' + (v.clientCode || v.cnpj || v.clientName);
        const existing = clientSeenMap.get(cKey);

        const currentRevenue = v.revenueAfterVisit || v.returnValue || 0;
        const currentOrders = v.ordersAfterVisit || (v.dealClosed ? 1 : 0);

        if (!existing) {
          clientSeenMap.set(cKey, {
            id: v.id,
            searchId: v.searchId,
            clientName: v.clientName,
            clientCode: v.clientCode,
            cnpj: v.cnpj,
            consultantId: v.consultantId,
            consultantName: v.consultantName,
            date: v.date || '',
            state: v.state || '',
            city: v.city || '',
            answerNao: isDirectNao,
            status: v.customerStatus || 'SEM CADASTRO',
            notes: v.notes,
            ordersAfterVisit: currentOrders,
            revenueAfterVisit: currentRevenue,
            dealClosed: Boolean(currentOrders > 0 || currentRevenue > 0 || v.dealClosed)
          });
        } else {
          // Merge best order/revenue data
          existing.answerNao = existing.answerNao || isDirectNao;
          existing.ordersAfterVisit = Math.max(existing.ordersAfterVisit, currentOrders);
          existing.revenueAfterVisit = Math.max(existing.revenueAfterVisit, currentRevenue);
          existing.dealClosed = existing.dealClosed || Boolean(currentOrders > 0 || currentRevenue > 0 || v.dealClosed);
        }
      }
    });

    return Array.from(clientSeenMap.values()).sort((a, b) => {
      // Sort newest dates first
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [visits]);

  // Filtered registrations based on UI selection
  const filteredRegistrations = useMemo(() => {
    return newRegistrations.filter(item => {
      if (selectedConsultantFilter !== 'all' && item.consultantId !== selectedConsultantFilter && item.consultantName !== selectedConsultantFilter) {
        return false;
      }
      if (originFilter === 'direct_nao' && !item.answerNao) {
        return false;
      }
      if (originFilter === 'sem_cadastro' && item.answerNao) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches = 
          item.clientName.toLowerCase().includes(q) ||
          item.consultantName.toLowerCase().includes(q) ||
          item.state.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          (item.cnpj && item.cnpj.includes(q)) ||
          (item.clientCode && item.clientCode.includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [newRegistrations, selectedConsultantFilter, originFilter, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = newRegistrations.length;
    const directNaoCount = newRegistrations.filter(r => r.answerNao).length;
    const withOrders = newRegistrations.filter(r => r.dealClosed || r.ordersAfterVisit > 0).length;
    const totalRevenueGenerated = newRegistrations.reduce((acc, r) => acc + r.revenueAfterVisit, 0);

    return { total, directNaoCount, withOrders, totalRevenueGenerated };
  }, [newRegistrations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-indigo-50/80 via-white to-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Cadastros Novos Realizados em Campo
                </h3>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {stats.total} {stats.total === 1 ? 'cliente novo' : 'clientes novos'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contabilizados quando o consultor respondeu <strong>"NÃO"</strong> para <em>"CLIENTE JÁ POSSUI CADASTRO NA NOSSA LOJA?"</em> ou cliente prospectado sem cadastro anterior.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 text-xs">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Novos Cadastros</span>
            <span className="text-xl font-black text-indigo-900 mt-1 block">{stats.total}</span>
            <span className="text-[10px] text-slate-500 font-medium">identificados na base</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Resposta "NÃO" na Loja</span>
            <span className="text-xl font-black text-emerald-800 mt-1 block">{stats.directNaoCount}</span>
            <span className="text-[10px] text-slate-500 font-medium">resposta direta no form</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Já Positivados</span>
            <span className="text-xl font-black text-blue-800 mt-1 block">{stats.withOrders}</span>
            <span className="text-[10px] text-slate-500 font-medium">faturaram após cadastro</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Faturamento Pós-Cadastro</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalRevenueGenerated)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">gerado por novos clientes</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, CNPJ, cidade ou consultor..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedConsultantFilter}
              onChange={(e) => setSelectedConsultantFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">Todos os Consultores</option>
              {consultants.map(c => {
                const count = newRegistrations.filter(r => r.consultantId === c.id || r.consultantName === c.name).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({count} novos)
                  </option>
                );
              })}
            </select>

            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60">
              <button
                onClick={() => setOriginFilter('all')}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  originFilter === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({newRegistrations.length})
              </button>
              <button
                onClick={() => setOriginFilter('direct_nao')}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  originFilter === 'direct_nao'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resposta "NÃO" ({stats.directNaoCount})
              </button>
            </div>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Nenhum cadastro novo encontrado</p>
              <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de busca ou seleção de consultor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegistrations.map((item, idx) => {
                const formattedDate = item.date
                  ? (item.date.includes('-')
                      ? item.date.split('-').reverse().join('/')
                      : item.date)
                  : 'Data não informada';

                return (
                  <div
                    key={item.id + idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {item.clientName}
                        </span>
                        {item.answerNao ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            CLIENTE NÃO POSSUÍA CADASTRO NA LOJA (NÃO)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            PROSPECÇÃO SEM CADASTRO PRÉVIO
                          </span>
                        )}
                        {item.dealClosed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <ShoppingBag className="w-3 h-3 text-amber-600" />
                            Positivado ({item.ordersAfterVisit} {item.ordersAfterVisit === 1 ? 'pedido' : 'pedidos'})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Consultor: <strong>{item.consultantName}</strong>
                        </span>

                        {(item.city || item.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {item.city ? `${item.city} - ` : ''}{item.state}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Visitado em: {formattedDate}
                        </span>

                        {item.cnpj && (
                          <span className="font-mono text-[11px] text-slate-500">
                            CNPJ: {item.cnpj}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                          "{item.notes}"
                        </div>
                      )}
                    </div>

                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-600 block">Status Comercial</span>
                        {item.dealClosed ? (
                          <span className="text-xs font-black text-emerald-700 block">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.revenueAfterVisit)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-600 block">
                            Em Prospecção
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Exibindo <strong>{filteredRegistrations.length}</strong> de <strong>{newRegistrations.length}</strong> novos cadastros
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
