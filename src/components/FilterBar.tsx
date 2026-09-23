import React, { useState } from 'react';
import { FilterState, Consultant, ExpenseCategory } from '../types';
import { Filter, Calendar, User, Tag, RotateCcw, ArrowRight, Clock, Check } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  consultants: Consultant[];
  categories: ExpenseCategory[];
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  consultants,
  categories,
  onReset,
}) => {
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(
    filters.period === 'custom' || Boolean(filters.startDate || filters.endDate)
  );

  const handlePeriodChange = (val: FilterState['period']) => {
    if (val === 'custom') {
      setShowCustomDateInputs(true);
      setFilters({
        ...filters,
        period: 'custom',
        // Default to current year or leave empty for user to pick
        startDate: filters.startDate || '2026-08-01',
        endDate: filters.endDate || '2026-08-31',
      });
    } else {
      setShowCustomDateInputs(false);
      setFilters({
        ...filters,
        period: val,
        startDate: '',
        endDate: '',
      });
    }
  };

  const handleSetToday = () => {
    const today = '2026-08-20'; // Reference date in the data
    setFilters({
      ...filters,
      period: 'custom',
      startDate: today,
      endDate: today,
    });
    setShowCustomDateInputs(true);
  };

  const handleSetAugust = () => {
    setFilters({
      ...filters,
      period: 'this_month',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });
    setShowCustomDateInputs(false);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 mb-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider pl-1">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtros Rápidos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 lg:max-w-4xl">
          {/* Period filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={filters.period}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
            >
              <option value="all">Todo o Período</option>
              <option value="custom">📅 Selecionar Data / Intervalo Personalizado</option>
              <option value="today">Hoje (20/08/2026)</option>
              <option value="last_7_days">Últimos 7 Dias</option>
              <option value="this_month">Este Mês (Agosto 2026)</option>
              <option value="last_month">Mês Anterior (Julho 2026)</option>
              <option value="last_3_months">Últimos 3 Meses</option>
              <option value="this_year">Ano 2026</option>
            </select>
          </div>

          {/* Consultant filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <select
              value={filters.consultantId}
              onChange={(e) => setFilters({ ...filters, consultantId: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
            >
              <option value="all">Todos os Consultores</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Expense Category filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <select
              value={filters.expenseCategory}
              onChange={(e) => setFilters({ ...filters, expenseCategory: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
            >
              <option value="all">Todas as Despesas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowCustomDateInputs(false);
                onReset();
              }}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Limpar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Custom Date Picker Bar when Custom is selected or dates are active */}
      {(showCustomDateInputs || filters.period === 'custom') && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Selecionar Intervalo de Datas:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Start Date */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold text-[11px]">De:</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({
                  ...filters,
                  period: 'custom',
                  startDate: e.target.value,
                })}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />

            {/* End Date */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-semibold text-[11px]">Até:</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({
                  ...filters,
                  period: 'custom',
                  endDate: e.target.value,
                })}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center space-x-1 ml-1">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleSetAugust}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Agosto/2026
              </button>
              {(filters.startDate || filters.endDate) && (
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, startDate: '', endDate: '' })}
                  className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Limpar Datas
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
