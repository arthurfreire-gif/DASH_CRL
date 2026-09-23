import React, { useState, useMemo } from 'react';
import { Visit, Consultant, VisitStatus, DealStatus, VisitCycle } from '../types';
import { 
  MapPin, 
  PlusCircle, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp, 
  DollarSign,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle,
  RotateCw,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

interface VisitsViewProps {
  visits: Visit[];
  consultants: Consultant[];
  initialCycle?: 'all' | '1ª Visita' | '2ª Visita';
  onAddVisit: () => void;
  onDeleteVisit: (id: string) => void;
}

export const VisitsView: React.FC<VisitsViewProps> = ({
  visits,
  consultants,
  initialCycle = 'all',
  onAddVisit,
  onDeleteVisit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState<'all' | '1ª Visita' | '2ª Visita'>(initialCycle);
  const [happenedFilter, setHappenedFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [selectedVisitForModal, setSelectedVisitForModal] = useState<Visit | null>(null);

  const getConsultantName = (id: string, fallbackName?: string) => {
    return consultants.find(c => c.id === id)?.name || fallbackName || 'Consultor Externo';
  };

  // Grouped stats by cycle
  const cycleCounts = useMemo(() => {
    const counts = { all: visits.length, '1ª Visita': 0, '2ª Visita': 0 };
    visits.forEach(v => {
      const cycle = v.visitCycle || '1ª Visita';
      if (cycle === '2ª Visita') counts['2ª Visita']++;
      else counts['1ª Visita']++;
    });
    return counts;
  }, [visits]);

  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const cycle = visit.visitCycle || '1ª Visita';
      if (selectedCycle !== 'all' && cycle !== selectedCycle) return false;

      if (consultantFilter !== 'all' && visit.consultantId !== consultantFilter) return false;

      if (happenedFilter === 'yes' && visit.visitHappened === false) return false;
      if (happenedFilter === 'no' && (visit.visitHappened === true || (visit.visitHappened === undefined && visit.status === 'Realizada'))) return false;

      if (statusFilter !== 'all' && visit.dealStatus !== statusFilter) return false;

      if (customerStatusFilter !== 'all') {
        const vStatus = visit.customerStatus || '';
        if (customerStatusFilter === 'ATIVO' && !vStatus.includes('ATIVO')) return false;
        if (customerStatusFilter === 'INATIVO' && !vStatus.includes('INATIVO')) return false;
        if (customerStatusFilter === 'NUNCA' && !vStatus.includes('NUNCA')) return false;
        if (customerStatusFilter === 'SEM_CADASTRO' && !vStatus.includes('SEM CADASTRO')) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesClient = visit.clientName?.toLowerCase().includes(query);
        const matchesSearchId = visit.searchId?.toLowerCase().includes(query);
        const matchesCode = visit.clientCode?.toLowerCase().includes(query);
        const matchesCity = visit.city?.toLowerCase().includes(query);
        const matchesState = visit.state?.toLowerCase().includes(query);
        const matchesRegional = visit.regional?.toLowerCase().includes(query);
        const matchesCnpj = visit.cnpj?.toLowerCase().includes(query);
        const matchesConsultant = getConsultantName(visit.consultantId, visit.consultantName).toLowerCase().includes(query);
        const matchesReceivedBy = visit.receivedBy?.toLowerCase().includes(query);
        const matchesReason = visit.reasonNotHappened?.toLowerCase().includes(query);
        const matchesNotes = visit.notes?.toLowerCase().includes(query);
        const matchesCustomerStatus = visit.customerStatus?.toLowerCase().includes(query);

        if (
          !matchesClient &&
          !matchesSearchId &&
          !matchesCode &&
          !matchesCity &&
          !matchesState &&
          !matchesRegional &&
          !matchesCnpj &&
          !matchesConsultant &&
          !matchesReceivedBy &&
          !matchesReason &&
          !matchesNotes &&
          !matchesCustomerStatus
        ) {
          return false;
        }
      }

      return true;
    });
  }, [visits, selectedCycle, consultantFilter, happenedFilter, statusFilter, customerStatusFilter, searchTerm, consultants]);

  // Aggregate stats
  const totalVisitsCount = filteredVisits.length;
  const realizedCount = filteredVisits.filter(v => v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada')).length;
  const notRealizedCount = filteredVisits.filter(v => v.visitHappened === false).length;
  const closedCount = filteredVisits.filter(v => v.dealClosed || v.dealStatus === 'Negócio Fechado').length;
  const totalReturnValue = filteredVisits.reduce((acc, curr) => acc + (curr.dealClosed || curr.dealStatus === 'Negócio Fechado' ? curr.returnValue : 0), 0);

  const getCustomerStatusBadge = (status?: string) => {
    if (!status) return null;
    if (status.includes('ATIVO')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
          ATIVO (≤ 60 dias)
        </span>
      );
    }
    if (status.includes('INATIVO')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
          INATIVO (&gt; 60 dias)
        </span>
      );
    }
    if (status.includes('NUNCA')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
          NUNCA COMPROU
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  const getDealStatusBadge = (status: DealStatus) => {
    switch (status) {
      case 'Negócio Fechado':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Fechado</span>;
      case 'Proposta Enviada':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3.5 h-3.5 mr-1" /> Proposta</span>;
      case 'Em Negociação':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5 mr-1" /> Negociação</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"><XCircle className="w-3.5 h-3.5 mr-1" /> Sem Retorno</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Rotas dos Consultores Externos de Relacionamento
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registro operacional das visitas presenciais a clientes (1ª Visita e 2ª Visita de follow-up / planilha RCM-DASH2.0)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onAddVisit}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Visita</span>
            </button>
          </div>
        </div>

        {/* Visit Cycle Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Ciclo de Visitas:</span>
          
          <button
            type="button"
            onClick={() => setSelectedCycle('all')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCycle === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Todas as Visitas</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedCycle === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
              {cycleCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCycle('1ª Visita')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCycle === '1ª Visita'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1ª Visita (Prospecção / Ativação)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedCycle === '1ª Visita' ? 'bg-white/20 text-white' : 'bg-blue-200/60 text-blue-900'}`}>
              {cycleCounts['1ª Visita']}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCycle('2ª Visita')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCycle === '2ª Visita'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>2ª Visita (Relacionamento / Follow-up)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedCycle === '2ª Visita' ? 'bg-white/20 text-white' : 'bg-emerald-200/60 text-emerald-900'}`}>
              {cycleCounts['2ª Visita']}
            </span>
          </button>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Filtrado</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{totalVisitsCount} <span className="text-xs font-normal text-slate-500">registros</span></div>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Visitas Realizadas (SIM)</div>
            <div className="text-xl font-bold text-emerald-800 mt-0.5">{realizedCount} <span className="text-xs font-normal text-emerald-600">({totalVisitsCount > 0 ? ((realizedCount / totalVisitsCount) * 100).toFixed(0) : 0}%)</span></div>
          </div>
          <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Não Aconteceu / Reagendado</div>
            <div className="text-xl font-bold text-rose-800 mt-0.5">{notRealizedCount} <span className="text-xs font-normal text-rose-600">visitas</span></div>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Positivações / Acordos</div>
            <div className="text-xl font-bold text-blue-800 mt-0.5">
              {filteredVisits.filter(v => v.dealClosed || (v.ordersAfterVisit && v.ordersAfterVisit > 0) || v.dealStatus === 'Negócio Fechado').length} <span className="text-xs font-normal text-blue-600">fechamentos</span>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente, ID pesquisa, CNPJ, cidade, pessoa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={consultantFilter}
              onChange={(e) => setConsultantFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todos os Consultores Notificantes</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={customerStatusFilter}
              onChange={(e) => setCustomerStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Status Carteira (Todos)</option>
              <option value="ATIVO">🟢 ATIVO (Comprou ≤ 60 dias)</option>
              <option value="INATIVO">🟡 INATIVO (Comprou &gt; 60 dias)</option>
              <option value="NUNCA">🔵 NUNCA COMPROU</option>
              <option value="SEM_CADASTRO">⚪ SEM CADASTRO</option>
            </select>
          </div>

          <div>
            <select
              value={happenedFilter}
              onChange={(e) => setHappenedFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Visita Aconteceu? (Todos)</option>
              <option value="yes">Apenas Realizadas (SIM)</option>
              <option value="no">Apenas Não Realizadas (NÃO)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Status Comercial (Todos)</option>
              <option value="Negócio Fechado">Negócio Fechado</option>
              <option value="Proposta Enviada">Proposta Enviada</option>
              <option value="Em Negociação">Em Negociação</option>
              <option value="Sem Retorno Imediato">Sem Retorno Imediato</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Mapping */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3">ID / Ciclo</th>
                <th className="py-3 px-3">PDV / Cliente & Status</th>
                <th className="py-3 px-3">Localização</th>
                <th className="py-3 px-3">Data / Hora</th>
                <th className="py-3 px-3">Consultor Externo (Notificante)</th>
                <th className="py-3 px-3 text-center">Aconteceu?</th>
                <th className="py-3 px-3">Quem Recebeu / Função</th>
                <th className="py-3 px-3">Status / Retorno</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhum registro de visita encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => {
                  const cycle = visit.visitCycle || '1ª Visita';
                  const isSecondCycle = cycle === '2ª Visita';
                  const happened = visit.visitHappened !== false;

                  return (
                    <tr key={visit.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* ID & Cycle */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px] font-bold text-slate-800">
                          {visit.searchId ? `#${visit.searchId}` : (visit.clientCode ? `PDV ${visit.clientCode}` : `#${visit.id}`)}
                        </div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isSecondCycle 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {cycle}
                        </span>
                      </td>

                      {/* PDV / Cliente */}
                      <td className="py-3.5 px-3 max-w-[220px]">
                        <div className="font-bold text-slate-900 truncate" title={visit.clientName}>
                          {visit.clientName}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {getCustomerStatusBadge(visit.customerStatus)}
                          {visit.cnpj && (
                            <span className="text-[10px] text-slate-400 font-mono">{visit.cnpj}</span>
                          )}
                        </div>
                        {visit.flag && (
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {visit.flag}
                          </div>
                        )}
                      </td>

                      {/* Localização */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-800">
                          {visit.city || 'Belém'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {visit.state || visit.regional || 'Pará'}
                        </div>
                      </td>

                      {/* Data & Hora */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(visit.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {visit.time && (
                          <div className="text-[10px] text-slate-400">{visit.time}</div>
                        )}
                      </td>

                      {/* Notificante */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {getConsultantName(visit.consultantId, visit.consultantName)}
                        </div>
                        <div className="text-[10px] text-blue-600 font-medium">
                          Consultor de Relacionamento
                        </div>
                      </td>

                      {/* Aconteceu? */}
                      <td className="py-3.5 px-3 text-center">
                        {happened ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> SIM
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3 mr-1 text-rose-600" /> NÃO
                            </span>
                            {visit.reasonNotHappened && (
                              <span className="text-[10px] text-rose-700 font-medium max-w-[120px] truncate mt-0.5" title={visit.reasonNotHappened}>
                                {visit.reasonNotHappened}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Quem Recebeu / Cargo */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        {visit.receivedBy ? (
                          <>
                            <div className="font-bold text-slate-800 truncate" title={visit.receivedBy}>
                              {visit.receivedBy}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate" title={visit.receivedRole}>
                              {visit.receivedRole || 'Responsável'}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Não informado</span>
                        )}
                      </td>

                      {/* Status / Retorno */}
                      <td className="py-3.5 px-3">
                        <div>{getDealStatusBadge(visit.dealStatus)}</div>
                        {visit.returnValue > 0 && (
                          <div className="text-emerald-700 font-bold text-[11px] mt-0.5">
                            R$ {visit.returnValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedVisitForModal(visit)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Detalhes da Pesquisa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteVisit(visit.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Details View */}
      {selectedVisitForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  selectedVisitForModal.visitCycle === '2ª Visita' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedVisitForModal.visitCycle || '1ª Visita'}
                </span>
                <h3 className="font-bold text-slate-900">
                  {selectedVisitForModal.searchId ? `Pesquisa ID #${selectedVisitForModal.searchId}` : 'Ficha da Visita Externa'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisitForModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Cliente / PDV:</span>
                  <span className="font-bold text-slate-900">{selectedVisitForModal.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">CNPJ:</span>
                  <span className="font-mono text-slate-800">{selectedVisitForModal.cnpj || 'Não cadastrado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Localidade:</span>
                  <span className="font-medium text-slate-800">{selectedVisitForModal.city} - {selectedVisitForModal.state}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status da Carteira:</span>
                  <div className="mt-1">
                    {getCustomerStatusBadge(selectedVisitForModal.customerStatus)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Consultor Notificante:</span>
                  <span className="font-bold text-blue-700">{getConsultantName(selectedVisitForModal.consultantId, selectedVisitForModal.consultantName)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Visita Aconteceu:</span>
                  <span className={`font-bold ${selectedVisitForModal.visitHappened !== false ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedVisitForModal.visitHappened !== false ? 'SIM (Realizada)' : 'NÃO (Não realizada)'}
                  </span>
                  {selectedVisitForModal.reasonNotHappened && (
                    <span className="block text-rose-600 mt-0.5">Motivo: {selectedVisitForModal.reasonNotHappened}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block">Quem Recebeu:</span>
                  <span className="font-bold text-slate-900">{selectedVisitForModal.receivedBy || 'Não informado'}</span>
                  {selectedVisitForModal.receivedRole && (
                    <span className="block text-slate-500">Função: {selectedVisitForModal.receivedRole}</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block font-semibold mb-1">Observações do Consultor:</span>
                <p className="text-slate-700 leading-relaxed">{selectedVisitForModal.notes || 'Sem observações adicionais.'}</p>
              </div>

              {(selectedVisitForModal.ordersAfterVisit && selectedVisitForModal.ordersAfterVisit > 0) ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Resultado Comercial:</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {selectedVisitForModal.ordersAfterVisit} pedido(s) faturado(s) pós-visita
                  </span>
                </div>
              ) : selectedVisitForModal.dealClosed ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Resultado Comercial:</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    Negócio Fechado / Positivado
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVisitForModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
