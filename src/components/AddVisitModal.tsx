import React, { useState } from 'react';
import { Consultant, Visit, VisitStatus, DealStatus, VisitCycle } from '../types';
import { X, MapPin, RotateCw, CheckCircle2, XCircle } from 'lucide-react';

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultants: Consultant[];
  onAdd: (visit: Omit<Visit, 'id'>) => void;
}

export const AddVisitModal: React.FC<AddVisitModalProps> = ({
  isOpen,
  onClose,
  consultants,
  onAdd,
}) => {
  const [consultantId, setConsultantId] = useState(consultants[0]?.id || '');
  const [visitCycle, setVisitCycle] = useState<VisitCycle>('2ª Visita');
  const [searchId, setSearchId] = useState('');
  const [clientName, setClientName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Pará');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [visitHappened, setVisitHappened] = useState(true);
  const [reasonNotHappened, setReasonNotHappened] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedRole, setReceivedRole] = useState('SÓCIO PROPRIETÁRIO');
  const [proposalSent, setProposalSent] = useState(true);
  const [dealClosed, setDealClosed] = useState(false);
  const [returnValue, setReturnValue] = useState('');
  const [dealStatus, setDealStatus] = useState<DealStatus>('Em Negociação');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return;

    const selectedConsultant = consultants.find(c => c.id === consultantId);

    onAdd({
      consultantId,
      consultantName: selectedConsultant?.name,
      consultantRole: 'Consultor Externo de Relacionamento',
      visitCycle,
      searchId: searchId.trim() || undefined,
      clientName,
      cnpj: cnpj.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      regional: state.trim() || undefined,
      date,
      time,
      status: visitHappened ? 'Realizada' : 'Cancelada',
      visitHappened,
      reasonNotHappened: !visitHappened ? reasonNotHappened : undefined,
      receivedBy: visitHappened ? receivedBy.trim() : undefined,
      receivedRole: visitHappened ? receivedRole.trim() : undefined,
      proposalSent,
      dealClosed,
      returnValue: parseFloat(returnValue) || 0,
      dealStatus,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Registrar Visita Externa</h3>
              <p className="text-xs text-slate-500">Consultoria de Relacionamento (1ª e 2ª Visitas)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Ciclo da Visita */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Ciclo da Visita</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisitCycle('1ª Visita')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  visitCycle === '1ª Visita'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>1ª Visita (Prospecção)</span>
              </button>
              <button
                type="button"
                onClick={() => setVisitCycle('2ª Visita')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all border ${
                  visitCycle === '2ª Visita'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <RotateCw className="w-4 h-4" />
                <span>2ª Visita (Relacionamento)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Consultor Notificante</label>
              <select
                value={consultantId}
                onChange={(e) => setConsultantId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {consultants.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ID da Pesquisa (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: 5982599"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Cliente / PDV</label>
              <input
                type="text"
                placeholder="Ex: MORAES LTDA"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Belém"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado (UF)</label>
              <input
                type="text"
                placeholder="Pará"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Visita Aconteceu? */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2">Visita Foi Bem-Sucedida / Aconteceu?</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="visitHappened"
                  checked={visitHappened === true}
                  onChange={() => setVisitHappened(true)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex items-center text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> SIM (Realizada)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="visitHappened"
                  checked={visitHappened === false}
                  onChange={() => setVisitHappened(false)}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                />
                <span className="flex items-center text-rose-700"><XCircle className="w-3.5 h-3.5 mr-1" /> NÃO (Não Aconteceu / Reagendar)</span>
              </label>
            </div>

            {!visitHappened && (
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">Motivo de não ter acontecido:</label>
                <input
                  type="text"
                  placeholder="Ex: solicitou reagendamento, cliente não estava no local, não respondem..."
                  value={reasonNotHappened}
                  onChange={(e) => setReasonNotHappened(e.target.value)}
                  required={!visitHappened}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}
          </div>

          {visitHappened && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quem Lhe Recebeu</label>
                <input
                  type="text"
                  placeholder="Ex: EMERSON VILHENA"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Função da Pessoa</label>
                <input
                  type="text"
                  placeholder="Ex: SÓCIO PROPRIETÁRIO, LÍDER COMERCIAL"
                  value={receivedRole}
                  onChange={(e) => setReceivedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Comercial</label>
              <select
                value={dealStatus}
                onChange={(e) => {
                  const val = e.target.value as DealStatus;
                  setDealStatus(val);
                  if (val === 'Negócio Fechado') {
                    setProposalSent(true);
                    setDealClosed(true);
                  } else if (val === 'Proposta Enviada' || val === 'Em Negociação') {
                    setProposalSent(true);
                    setDealClosed(false);
                  } else {
                    setProposalSent(false);
                    setDealClosed(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Em Negociação">Em Negociação</option>
                <option value="Negócio Fechado">Negócio Fechado</option>
                <option value="Proposta Enviada">Proposta Enviada</option>
                <option value="Sem Retorno Imediato">Sem Retorno Imediato</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pedidos Fechados (Qtd)</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={returnValue}
                onChange={(e) => setReturnValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações da Visita</label>
            <textarea
              rows={3}
              placeholder="Descreva o que foi tratado na reunião, alinhamentos e encaminhamentos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-medium text-slate-600 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
