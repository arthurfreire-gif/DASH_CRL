import React, { useState, useEffect } from 'react';
import { Consultant, Expense, Visit, FilterState, ExpenseCategory, RegionalClient, InfoPedRecord } from './types';
import { INITIAL_CONSULTANTS, INITIAL_EXPENSES, INITIAL_VISITS } from './mockData';
import { INITIAL_REGIONAL_CLIENTS } from './initialRegionalClients';
import { INITIAL_INFOPED_RECORDS } from './initialInfoPedData';
import { cleanStorageQuota, safeGetStorage, safeSetStorage, safeRemoveStorage } from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { DashboardView } from './components/DashboardView';
import { RegionalClientsView } from './components/RegionalClientsView';
import { ExpensesView } from './components/ExpensesView';
import { ConsultantsView } from './components/ConsultantsView';
import { InfoPedView } from './components/InfoPedView';
import { AIInsightsModal } from './components/AIInsightsModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AddVisitModal } from './components/AddVisitModal';
import { UploadSheetModal } from './components/UploadSheetModal';

// Clean obsolete or huge payloads on startup
cleanStorageQuota();

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // State with safe persistence
  const [consultants] = useState<Consultant[]>(INITIAL_CONSULTANTS);
  
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const key = 'consultor_roi_expenses_v2026_final_official';
    const saved = safeGetStorage<Expense[] | null>(key, null);
    if (saved && Array.isArray(saved) && saved.some((e: any) => e.id?.startsWith('exp_'))) {
      return saved;
    }
    return INITIAL_EXPENSES;
  });

  const [visits, setVisits] = useState<Visit[]>(() => {
    const key = 'consultor_roi_visits_synced_v14_cadastros';
    const saved = safeGetStorage<Visit[] | null>(key, null);
    if (saved && Array.isArray(saved) && saved.length >= INITIAL_VISITS.length && saved[0]?.clienteJaPossuiCadastroLoja !== undefined) {
      return saved;
    }
    return INITIAL_VISITS;
  });

  // Regional clients (6,191 items) and INFO-PED records (18,341 items)
  // are large datasets kept in memory from static bundles to never exceed the 5MB browser storage quota
  const [regionalClients, setRegionalClients] = useState<RegionalClient[]>(INITIAL_REGIONAL_CLIENTS);
  const [infoPedRecords, setInfoPedRecords] = useState<InfoPedRecord[]>(INITIAL_INFOPED_RECORDS);

  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    startDate: '',
    endDate: '',
    consultantId: 'all',
    expenseCategory: 'all',
    searchQuery: '',
  });

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);

  // Sync expenses and visits safely without throwing QuotaExceeded errors
  useEffect(() => {
    safeSetStorage('consultor_roi_expenses_v2026_final_official', expenses);
  }, [expenses]);

  useEffect(() => {
    safeSetStorage('consultor_roi_visits_synced_v14_cadastros', visits);
  }, [visits]);

  const handleResetExpensesToOfficial = () => {
    setExpenses(INITIAL_EXPENSES);
    safeSetStorage('consultor_roi_expenses_v2026_final_official', INITIAL_EXPENSES);
  };

  const handleResetVisitsToOfficial = () => {
    setVisits(INITIAL_VISITS);
    safeSetStorage('consultor_roi_visits_synced_v14_cadastros', INITIAL_VISITS);
  };

  const handleUpdateVisits = (updatedVisits: Visit[]) => {
    setVisits(updatedVisits);
    safeSetStorage('consultor_roi_visits_synced_v14_cadastros', updatedVisits);
  };

  const handleUpdateRegionalClients = (updatedClients: RegionalClient[]) => {
    setRegionalClients(updatedClients);
  };

  const handleResetRegionalClientsToOfficial = () => {
    setRegionalClients(INITIAL_REGIONAL_CLIENTS);
  };

  // Handlers for adding/deleting
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const expense: Expense = {
      ...newExp,
      id: 'e_' + Date.now(),
    };
    setExpenses([expense, ...expenses]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleAddVisit = (newVisit: Omit<Visit, 'id'>) => {
    const visit: Visit = {
      ...newVisit,
      id: 'v_' + Date.now(),
    };
    setVisits([visit, ...visits]);
  };

  const handleDeleteVisit = (id: string) => {
    setVisits(visits.filter(v => v.id !== id));
  };

  const handleResetFilters = () => {
    setFilters({
      period: 'all',
      startDate: '',
      endDate: '',
      consultantId: 'all',
      expenseCategory: 'all',
      searchQuery: '',
    });
  };

  // Filter expenses and visits based on filter state and search query
  const filteredExpenses = expenses.filter(expense => {
    if (filters.consultantId !== 'all' && expense.consultantId !== filters.consultantId) return false;
    if (filters.expenseCategory !== 'all' && expense.category !== filters.expenseCategory) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const consultantName = consultants.find(c => c.id === expense.consultantId)?.name || '';
      const match = (expense.description && expense.description.toLowerCase().includes(q)) ||
        (expense.category && expense.category.toLowerCase().includes(q)) ||
        consultantName.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Date period filtering
    if (filters.period === 'custom') {
      if (filters.startDate && expense.date < filters.startDate) return false;
      if (filters.endDate && expense.date > filters.endDate) return false;
      return true;
    } else if (filters.period === 'today') {
      return expense.date === '2026-08-20' || expense.date.startsWith('2026-08-20');
    } else if (filters.period === 'last_7_days') {
      return expense.date >= '2026-08-13' && expense.date <= '2026-08-20';
    } else if (filters.period === 'this_month') {
      return expense.date.startsWith('2026-08');
    } else if (filters.period === 'last_month') {
      return expense.date.startsWith('2026-07');
    } else if (filters.period === 'last_3_months') {
      return expense.date >= '2026-06-01';
    } else if (filters.period === 'this_year') {
      return expense.date.startsWith('2026');
    }
    return true;
  });

  const filteredVisits = visits.filter(visit => {
    if (filters.consultantId !== 'all' && visit.consultantId !== filters.consultantId) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match = (visit.clientName && visit.clientName.toLowerCase().includes(q)) ||
        (visit.clientCode && String(visit.clientCode).toLowerCase().includes(q)) ||
        (visit.cnpj && visit.cnpj.includes(q)) ||
        (visit.city && visit.city.toLowerCase().includes(q)) ||
        (visit.consultantName && visit.consultantName.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Date period filtering
    if (filters.period === 'custom') {
      if (filters.startDate && visit.date < filters.startDate) return false;
      if (filters.endDate && visit.date > filters.endDate) return false;
      return true;
    } else if (filters.period === 'today') {
      return visit.date === '2026-08-20' || visit.date.startsWith('2026-08-20');
    } else if (filters.period === 'last_7_days') {
      return visit.date >= '2026-08-13' && visit.date <= '2026-08-20';
    } else if (filters.period === 'this_month') {
      return visit.date.startsWith('2026-08');
    } else if (filters.period === 'last_month') {
      return visit.date.startsWith('2026-07');
    } else if (filters.period === 'last_3_months') {
      return visit.date >= '2026-06-01';
    } else if (filters.period === 'this_year') {
      return visit.date.startsWith('2026');
    }
    return true;
  });

  const categories: ExpenseCategory[] = [
    'Passagens & Transporte',
    'Hospedagem',
    'Alimentação',
    'Jantares de Negócios',
    'Eventos & Brindes',
    'Outros',
  ];

  const handleRefreshSite = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white flex">
      {/* Sleek Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUploadSheet={() => setIsUploadSheetOpen(true)}
        onOpenAIInsights={() => setIsAIInsightsOpen(true)}
        onRefreshSite={handleRefreshSite}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-20 transition-all duration-300">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Top Header matching reference image */}
          <Header
            activeTab={activeTab}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onRefreshSite={handleRefreshSite}
            searchTerm={filters.searchQuery}
            setSearchTerm={(term) => setFilters(prev => ({ ...prev, searchQuery: term }))}
          />

          {/* Global Filter Bar */}
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            consultants={consultants}
            categories={categories}
            onReset={handleResetFilters}
          />

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <DashboardView
              consultants={consultants}
              expenses={filteredExpenses}
              visits={filteredVisits}
              regionalClients={regionalClients}
              infoPedRecords={infoPedRecords}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'regional-clients' && (
            <RegionalClientsView
              regionalClients={regionalClients}
              visits={visits}
              consultants={consultants}
              onOpenUploadSheet={() => setIsUploadSheetOpen(true)}
            />
          )}

          {activeTab === 'infoped' && (
            <InfoPedView
              visits={filteredVisits}
              consultants={consultants}
              onOpenUploadSheet={() => setIsUploadSheetOpen(true)}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={filteredExpenses}
              consultants={consultants}
              onAddExpense={() => setIsAddExpenseOpen(true)}
              onDeleteExpense={handleDeleteExpense}
              onResetToOfficial={handleResetExpensesToOfficial}
            />
          )}

          {activeTab === 'consultants' && (
            <ConsultantsView
              consultants={consultants}
              expenses={filteredExpenses}
              visits={filteredVisits}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <UploadSheetModal
        isOpen={isUploadSheetOpen}
        onClose={() => setIsUploadSheetOpen(false)}
        visits={visits}
        onUpdateVisits={handleUpdateVisits}
        regionalClients={regionalClients}
        onUpdateRegionalClients={handleUpdateRegionalClients}
        infoPedRecords={infoPedRecords}
        onUpdateInfoPedRecords={(records) => {
          setInfoPedRecords(records);
        }}
        consultants={consultants}
        onResetOfficial={() => {
          handleResetVisitsToOfficial();
          handleResetRegionalClientsToOfficial();
          setInfoPedRecords(INITIAL_INFOPED_RECORDS);
          cleanStorageQuota();
        }}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        consultants={consultants}
        onAdd={handleAddExpense}
      />

      <AddVisitModal
        isOpen={isAddVisitOpen}
        onClose={() => setIsAddVisitOpen(false)}
        consultants={consultants}
        onAdd={handleAddVisit}
      />

      <AIInsightsModal
        isOpen={isAIInsightsOpen}
        onClose={() => setIsAIInsightsOpen(false)}
        consultants={consultants}
        expenses={filteredExpenses}
        visits={filteredVisits}
        filterSummary={filters}
      />
    </div>
  );
}
