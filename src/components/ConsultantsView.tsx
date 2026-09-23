import React from 'react';
import { Consultant, Expense, Visit } from '../types';
import { MapPin, Briefcase, TrendingUp, CheckCircle2, Award } from 'lucide-react';

interface ConsultantsViewProps {
  consultants: Consultant[];
  expenses: Expense[];
  visits: Visit[];
}

export const ConsultantsView: React.FC<ConsultantsViewProps> = ({
  consultants,
  expenses,
  visits,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Equipe de Consultores de Relacionamento</h2>
        <p className="text-xs text-slate-500 mt-1">
          Desempenho individual, carteira regional, cobertura de visitas e taxa de positivação comercial
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {consultants.map(consultant => {
          const cExpenses = expenses
            .filter(e => e.consultantId === consultant.id)
            .reduce((acc, curr) => acc + curr.amount, 0);

          const cVisits = visits.filter(v => v.consultantId === consultant.id);
          const cVisited = cVisits.filter(v => v.visitHappened === true || (v.visitHappened === undefined && v.status === 'Realizada'));
          
          // Deduplicated visited client metrics
          const clientVisitedMap = new Map<string, { orders: number }>();
          cVisited.forEach(v => {
            const key = v.clientCode || v.cnpj || v.clientName;
            const prev = clientVisitedMap.get(key) || { orders: 0 };
            clientVisitedMap.set(key, {
              orders: Math.max(prev.orders, v.ordersAfterVisit || (v.dealClosed ? 1 : 0)),
            });
          });

          let cOrdersCount = 0;
          let closedDeals = 0;

          clientVisitedMap.forEach(({ orders }) => {
            if (orders > 0) {
              closedDeals++;
              cOrdersCount += orders;
            }
          });

          const cConversion = cVisited.length > 0 ? (closedDeals / cVisited.length) * 100 : 0;
          const initials = consultant.name.split(' ').map(n => n[0]).slice(0, 2).join('');

          return (
            <div key={consultant.id} className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{consultant.name}</h3>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{consultant.region}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Clientes Visitados:</span>
                    <span className="font-bold text-slate-800">{cVisited.length} ({consultant.activeClientsCount} na Carteira)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Pedidos Pós-Visita:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{cOrdersCount} faturados</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                    <div className="text-[10px] uppercase font-bold text-blue-600">Positivados</div>
                    <div className="text-sm font-black text-blue-700 mt-1">
                      {closedDeals} clientes
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">Conversão</div>
                    <div className="text-sm font-black text-emerald-700 mt-1">
                      {cConversion.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Status Comercial:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md ${cConversion >= 25 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                  {cConversion >= 25 ? 'Alta Conversão' : 'Em Atendimento'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
