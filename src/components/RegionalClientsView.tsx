import React, { useState, useMemo } from 'react';
import { RegionalClient, Visit, Consultant } from '../types';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  UploadCloud, 
  Users, 
  Calendar, 
  Phone, 
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RegionalClientsViewProps {
  regionalClients: RegionalClient[];
  visits: Visit[];
  consultants: Consultant[];
  onOpenUploadSheet: () => void;
}

export const RegionalClientsView: React.FC<RegionalClientsViewProps> = ({
  regionalClients,
  visits,
  consultants,
  onOpenUploadSheet,
}) => {
  const [selectedState, setSelectedState] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visited' | 'not_visited'>('all');
  const [selectedRca, setSelectedRca] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedClientForModal, setSelectedClientForModal] = useState<{
    client: RegionalClient;
    matchedVisits: Visit[];
    isVisited: boolean;
  } | null>(null);

  const pageSize = 25;

  const cleanCNPJ = (cnpj?: string): string => {
    if (!cnpj) return '';
    return String(cnpj).replace(/\D/g, '');
  };

  // Cross-reference visits with clients
  const clientVisitAnalysis = useMemo(() => {
    // Map of visits indexed by clientCode, cnpj, and normalized clientName
    const visitsByCode = new Map<string, Visit[]>();
    const visitsByCNPJ = new Map<string, Visit[]>();
    const visitsByName = new Map<string, Visit[]>();

    visits.forEach(v => {
      const isValid = v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada');
      if (!isValid) return;

      if (v.clientCode) {
        const code = String(v.clientCode).trim();
        if (!visitsByCode.has(code)) visitsByCode.set(code, []);
        visitsByCode.get(code)!.push(v);
      }
      if (v.cnpj) {
        const cClean = cleanCNPJ(v.cnpj);
        if (cClean) {
          if (!visitsByCNPJ.has(cClean)) visitsByCNPJ.set(cClean, []);
          visitsByCNPJ.get(cClean)!.push(v);
        }
      }
      if (v.clientName) {
        const nameKey = v.clientName.trim().toLowerCase();
        if (!visitsByName.has(nameKey)) visitsByName.set(nameKey, []);
        visitsByName.get(nameKey)!.push(v);
      }
    });

    return { visitsByCode, visitsByCNPJ, visitsByName };
  }, [visits]);

  // Enrich each regional client with visit status & statistics
  const enrichedClients = useMemo(() => {
    const { visitsByCode, visitsByCNPJ, visitsByName } = clientVisitAnalysis;

    return regionalClients.map(client => {
      const codeKey = client.id ? String(client.id).trim() : '';
      const cnpjKey = cleanCNPJ(client.cnpj);
      const nameKey = client.name ? client.name.trim().toLowerCase() : '';
      const tradeNameKey = client.tradeName ? client.tradeName.trim().toLowerCase() : '';
      const corpReasonKey = client.corporateReason ? client.corporateReason.trim().toLowerCase() : '';

      const matchedMap = new Map<string, Visit>();

      if (codeKey && visitsByCode.has(codeKey)) {
        visitsByCode.get(codeKey)!.forEach(v => matchedMap.set(v.id, v));
      }
      if (cnpjKey && visitsByCNPJ.has(cnpjKey)) {
        visitsByCNPJ.get(cnpjKey)!.forEach(v => matchedMap.set(v.id, v));
      }
      if (nameKey && visitsByName.has(nameKey)) {
        visitsByName.get(nameKey)!.forEach(v => matchedMap.set(v.id, v));
      }
      if (tradeNameKey && visitsByName.has(tradeNameKey)) {
        visitsByName.get(tradeNameKey)!.forEach(v => matchedMap.set(v.id, v));
      }
      if (corpReasonKey && visitsByName.has(corpReasonKey)) {
        visitsByName.get(corpReasonKey)!.forEach(v => matchedMap.set(v.id, v));
      }

      const matchedVisitsList = Array.from(matchedMap.values());
      const isVisited = matchedVisitsList.length > 0;

      // Summary of revenue & orders
      let totalOrdersAfter = 0;
      let totalRevenueAfter = 0;
      let lastVisitDate = '';
      let consultantVisited = '';

      if (isVisited) {
        matchedVisitsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastVisitDate = matchedVisitsList[0].date;
        consultantVisited = matchedVisitsList[0].consultantName || 'Consultor Sou Energy';
        
        matchedVisitsList.forEach(v => {
          totalOrdersAfter += (v.ordersAfterVisit || (v.dealClosed ? 1 : 0));
          totalRevenueAfter += (v.revenueAfterVisit || v.returnValue || 0);
        });
      }

      return {
        ...client,
        isVisited,
        matchedVisits: matchedVisitsList,
        visitsCount: matchedVisitsList.length,
        lastVisitDate,
        consultantVisited,
        totalOrdersAfter,
        totalRevenueAfter,
        positivated: totalOrdersAfter > 0 || totalRevenueAfter > 0,
      };
    });
  }, [regionalClients, clientVisitAnalysis]);

  // Unique list of states with counts
  const stateSummaryList = useMemo(() => {
    const map = new Map<string, { state: string; total: number; visited: number }>();

    enrichedClients.forEach(c => {
      const uf = c.state || 'Não Definido';
      const existing = map.get(uf) || { state: uf, total: 0, visited: 0 };
      existing.total += 1;
      if (c.isVisited) existing.visited += 1;
      map.set(uf, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [enrichedClients]);

  // Unique list of RCAs
  const rcaList = useMemo(() => {
    const set = new Set<string>();
    regionalClients.forEach(c => {
      if (c.rcaName && c.rcaName.trim()) set.add(c.rcaName.trim());
    });
    return Array.from(set).sort();
  }, [regionalClients]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return enrichedClients.filter(c => {
      // State filter
      if (selectedState !== 'all' && (c.state || 'Não Definido') !== selectedState) return false;

      // Status filter
      if (statusFilter === 'visited' && !c.isVisited) return false;
      if (statusFilter === 'not_visited' && c.isVisited) return false;

      // RCA filter
      if (selectedRca !== 'all' && (c.rcaName || 'Sem RCA') !== selectedRca) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = c.id && String(c.id).toLowerCase().includes(q);
        const nameMatch = c.name && c.name.toLowerCase().includes(q);
        const tradeMatch = c.tradeName && c.tradeName.toLowerCase().includes(q);
        const cnpjMatch = c.cnpj && c.cnpj.includes(q);
        const cityMatch = c.city && c.city.toLowerCase().includes(q);
        const rcaMatch = c.rcaName && c.rcaName.toLowerCase().includes(q);
        const phoneMatch = c.phone && c.phone.includes(q);

        if (!idMatch && !nameMatch && !tradeMatch && !cnpjMatch && !cityMatch && !rcaMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedClients, selectedState, statusFilter, selectedRca, searchQuery]);

  // Statistics for the current filter view
  const currentViewStats = useMemo(() => {
    const total = filteredClients.length;
    const visited = filteredClients.filter(c => c.isVisited).length;
    const notVisited = total - visited;
    const positivated = filteredClients.filter(c => c.positivated).length;
    const totalOrders = filteredClients.reduce((acc, c) => acc + (c.totalOrdersAfter || 0), 0);
    const coverage = total > 0 ? (visited / total) * 100 : 0;
    const positivationRate = visited > 0 ? (positivated / visited) * 100 : 0;
    const revenue = filteredClients.reduce((acc, c) => acc + c.totalRevenueAfter, 0);

    return {
      total,
      visited,
      notVisited,
      positivated,
      totalOrders,
      coverage,
      positivationRate,
      revenue,
    };
  }, [filteredClients]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage]);

  const handleExportToExcel = () => {
    const dataToExport = filteredClients.map(c => ({
      'ID Integrador': c.id,
      'Nome Integrador': c.name,
      'Nome Fantasia': c.tradeName || c.name,
      'Razão Social': c.corporateReason || c.name,
      'CNPJ': c.cnpj || '',
      'Telefone': c.phone || '',
      'Cidade': c.city || '',
      'Estado': c.state || '',
      'RCA / Vendedor': c.rcaName || '',
      'Status de Visita': c.isVisited ? 'VISITADO' : 'NÃO VISITADO',
      'Total Visitas Realizadas': c.visitsCount,
      'Data Última Visita': c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString('pt-BR') : '',
      'Consultor que Visitou': c.consultantVisited || '',
      'Positivado Pós-Visita': c.positivated ? 'SIM' : 'NÃO',
      'Pedidos Pós-Visita': c.totalOrdersAfter || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes_Por_Regiao');
    XLSX.writeFile(wb, `Clientes_Por_Regiao_${selectedState}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Clientes Por Região & Mapeamento de Visitas
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                  Base Cadastrada
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Contagem oficial de clientes da aba <strong>Clientes Por Regiao</strong> cruzados com as visitas realizadas no CRM e pedidos faturados
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onOpenUploadSheet}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>Sincronizar Planilha</span>
            </button>
            <button
              onClick={handleExportToExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Card 1: Total de Clientes */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total de Clientes na Região</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{currentViewStats.total}</span>
              <span className="text-xs text-slate-500 font-medium">clientes cadastrados</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-medium">
              {selectedState === 'all' ? `Base total de ${enrichedClients.length} clientes na loja` : `Base de ${selectedState} (${((currentViewStats.total / enrichedClients.length) * 100).toFixed(1)}% do total geral)`}
            </div>
          </div>

          {/* Card 2: Clientes Já Visitados */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
              <span>Clientes Já Visitados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">{currentViewStats.visited}</span>
              <span className="text-xs text-emerald-700 font-bold">
                ({((currentViewStats.visited / (enrichedClients.length || 620)) * 100).toFixed(1)}% da loja de 620)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-800 font-medium">
              {selectedState === 'all' 
                ? `Cálculo: (${currentViewStats.visited} ÷ ${enrichedClients.length}) × 100% = ${currentViewStats.coverage.toFixed(1)}%`
                : `(${currentViewStats.visited} ÷ ${enrichedClients.length}) × 100% = ${((currentViewStats.visited / enrichedClients.length) * 100).toFixed(1)}% da loja | ${currentViewStats.coverage.toFixed(1)}% regional`}
            </div>
          </div>

          {/* Card 3: Clientes Pendentes de Visita */}
          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80">
            <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
              <span>Pendentes de Visita (Oportunidade)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-amber-700 tracking-tight">{currentViewStats.notVisited}</span>
              <span className="text-xs text-amber-700 font-bold">
                ({(100 - currentViewStats.coverage).toFixed(1)}% a visitar)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-amber-800 font-medium">
              Cálculo: ({currentViewStats.notVisited} / {currentViewStats.total}) × 100% = {(100 - currentViewStats.coverage).toFixed(1)}%
            </div>
          </div>

          {/* Card 4: Positivação Pós-Visita */}
          <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/80">
            <div className="flex items-center justify-between text-blue-800 text-xs font-bold">
              <span>Positivação Pós-Visita</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight">
                {currentViewStats.positivated} clientes
              </span>
            </div>
            <div className="mt-1 text-[11px] text-blue-800 font-medium">
              {currentViewStats.totalOrders} pedidos faturados ({currentViewStats.positivationRate.toFixed(1)}% conversão)
            </div>
          </div>
        </div>

        {/* Dynamic Formula Context Bar */}
        <div className="mt-4 p-3 bg-slate-100/80 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-700 gap-2">
          <div className="flex items-center space-x-2">
            <Percent className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">
              Regra de Cálculo de Cobertura:
            </span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700 font-bold">
              % Visitados = (Clientes Visitados / Base de Clientes Cadastrados) × 100%
            </span>
          </div>
          <div className="text-slate-600 font-medium">
            Exemplo: <span className="font-bold text-slate-900">{currentViewStats.visited} visitados</span> de <span className="font-bold text-slate-900">{currentViewStats.total} cadastrados</span> = <span className="font-bold text-emerald-700">{currentViewStats.coverage.toFixed(1)}% de cobertura</span>
          </div>
        </div>

        {/* State Quick Filters */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Filtrar por Estado / Região</span>
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {stateSummaryList.length} estados na base
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => { setSelectedState('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedState === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Todas as Regiões ({enrichedClients.length})
            </button>
            {stateSummaryList.map(s => (
              <button
                key={s.state}
                onClick={() => { setSelectedState(s.state); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedState === s.state
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {s.state} <span className="text-[11px] opacity-80 font-normal">({s.visited}/{s.total} visitados)</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Card with Search & Filters */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        {/* Table Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full lg:w-auto">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`flex-1 lg:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({filteredClients.length})
            </button>
            <button
              onClick={() => { setStatusFilter('visited'); setCurrentPage(1); }}
              className={`flex-1 lg:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                statusFilter === 'visited'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Já Visitados</span>
            </button>
            <button
              onClick={() => { setStatusFilter('not_visited'); setCurrentPage(1); }}
              className={`flex-1 lg:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                statusFilter === 'not_visited'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Não Visitados</span>
            </button>
          </div>

          {/* Search & RCA Selectors */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
            {/* RCA Filter */}
            <select
              value={selectedRca}
              onChange={(e) => { setSelectedRca(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todos os RCAs ({rcaList.length})</option>
              {rcaList.map(rca => (
                <option key={rca} value={rca}>{rca}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar cliente, ID, CNPJ..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">ID / Cód</th>
                <th className="py-3 px-3.5">Integrador / Razão Social</th>
                <th className="py-3 px-3">CNPJ / Contato</th>
                <th className="py-3 px-3">Cidade / UF</th>
                <th className="py-3 px-3">RCA / Vendedor</th>
                <th className="py-3 px-3.5 text-center">Status de Visita</th>
                <th className="py-3 px-3.5 text-right">Pedidos Pós-Visita</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  return (
                    <tr 
                      key={client.id + '_' + client.name} 
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900">
                        <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-black">
                          #{client.id}
                        </span>
                      </td>

                      {/* Integrador */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {client.tradeName && client.tradeName !== 'NULL' ? client.tradeName : client.name}
                        </div>
                        {client.corporateReason && client.corporateReason !== client.tradeName && (
                          <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                            {client.corporateReason}
                          </div>
                        )}
                      </td>

                      {/* CNPJ & Phone */}
                      <td className="py-3.5 px-3 text-slate-600">
                        {client.cnpj && (
                          <div className="font-mono text-[11px] text-slate-700">{client.cnpj}</div>
                        )}
                        {client.phone && (
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Cidade & Estado */}
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{client.city || '---'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 ml-5 block">
                          {client.state}
                        </span>
                      </td>

                      {/* RCA */}
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] text-slate-700 font-semibold inline-block">
                          {client.rcaName || 'A DEFINIR'}
                        </span>
                      </td>

                      {/* Status de Visita */}
                      <td className="py-3.5 px-3.5 text-center">
                        {client.isVisited ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>VISITADO</span>
                            </span>
                            {client.lastVisitDate && (
                              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                {new Date(client.lastVisitDate).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>NÃO VISITADO</span>
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              Pendente
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Pedidos Pós */}
                      <td className="py-3.5 px-3.5 text-right font-black text-slate-900">
                        {client.totalOrdersAfter > 0 ? (
                          <div>
                            <span className="text-emerald-700 font-bold">
                              {client.totalOrdersAfter} pedido(s)
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-semibold">
                              POSITIVADO
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">0 pedidos</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedClientForModal({
                            client,
                            matchedVisits: client.matchedVisits,
                            isVisited: client.isVisited
                          })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Ver detalhes do cliente"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4 mt-2">
          <div className="text-xs text-slate-500">
            Mostrando <strong>{Math.min(filteredClients.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong>{Math.min(filteredClients.length, currentPage * pageSize)}</strong> de <strong>{filteredClients.length}</strong> clientes
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-xs font-bold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Client Details Modal */}
      {selectedClientForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedClientForModal.client.tradeName || selectedClientForModal.client.name}
                  </h3>
                  <p className="text-xs text-slate-500">ID #{selectedClientForModal.client.id} • {selectedClientForModal.client.state}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForModal(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Client Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Razão Social</span>
                  <span className="font-bold text-slate-800">{selectedClientForModal.client.corporateReason || selectedClientForModal.client.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">CNPJ</span>
                  <span className="font-mono text-slate-800">{selectedClientForModal.client.cnpj || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Telefone</span>
                  <span className="font-bold text-slate-800">{selectedClientForModal.client.phone || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Cidade / UF</span>
                  <span className="font-bold text-slate-800">{selectedClientForModal.client.city} - {selectedClientForModal.client.state}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">RCA / Vendedor</span>
                  <span className="font-bold text-slate-800">{selectedClientForModal.client.rcaName || 'A DEFINIR'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Status de Visita</span>
                  <span className={`font-black ${selectedClientForModal.isVisited ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedClientForModal.isVisited ? '✅ VISITADO' : '⏳ NÃO VISITADO'}
                  </span>
                </div>
              </div>

              {/* Visited Records */}
              <div>
                <h4 className="font-black text-slate-900 mb-2 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Histórico de Visitas ({selectedClientForModal.matchedVisits.length})</span>
                </h4>

                {selectedClientForModal.matchedVisits.length === 0 ? (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-800">
                    Este cliente ainda não recebeu visitas registradas no CRM. Está disponível para planejamento de rotas comerciais.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedClientForModal.matchedVisits.map((v, idx) => (
                      <div key={v.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">
                            {v.visitCycle || '1ª Visita'} • {v.consultantName || 'Consultor'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Data: {new Date(v.date).toLocaleDateString('pt-BR')} • {v.whoReceived ? `Recebido por: ${v.whoReceived}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black ${v.ordersAfterVisit && v.ordersAfterVisit > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {v.ordersAfterVisit && v.ordersAfterVisit > 0 ? `${v.ordersAfterVisit} pedido(s) faturado(s)` : (v.dealClosed ? 'Negócio Fechado' : 'Sem pedidos')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {v.ordersAfterVisit && v.ordersAfterVisit > 0 ? 'Positivado pós-visita' : 'Acompanhamento'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClientForModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
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
