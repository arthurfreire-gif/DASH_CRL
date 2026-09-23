import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Layers, 
  Database,
  ArrowRight,
  Building2,
  MapPin,
  UserPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Visit, Consultant, RegionalClient, InfoPedRecord } from '../types';

interface UploadSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  visits: Visit[];
  onUpdateVisits: (updatedVisits: Visit[]) => void;
  regionalClients: RegionalClient[];
  onUpdateRegionalClients: (updatedClients: RegionalClient[]) => void;
  infoPedRecords?: InfoPedRecord[];
  onUpdateInfoPedRecords?: (records: InfoPedRecord[]) => void;
  consultants: Consultant[];
  onResetOfficial: () => void;
}

export const UploadSheetModal: React.FC<UploadSheetModalProps> = ({
  isOpen,
  onClose,
  visits,
  onUpdateVisits,
  regionalClients,
  onUpdateRegionalClients,
  infoPedRecords = [],
  onUpdateInfoPedRecords,
  consultants,
  onResetOfficial,
}) => {
  const [activeMode, setActiveMode] = useState<'infoped' | 'regional_clients' | 'visitas'>('infoped');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<{
    rowsRead: number;
    matchedVisits?: number;
    newOrdersCount?: number;
    totalNewRevenue?: number;
    clientsImported?: number;
    statesFound?: number;
  } | null>(null);

  if (!isOpen) return null;

  const cleanCNPJ = (cnpj: any): string => {
    if (!cnpj) return '';
    return String(cnpj).replace(/\D/g, '');
  };

  const parseNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace(/[R$\s]/g, '');
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const parseDateToISO = (dateVal: any): string => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
      return dateVal.toISOString().split('T')[0];
    }
    const s = String(dateVal).trim();
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes('/')) {
      const parts = s.split(' ')[0].split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    if (s.includes('-')) {
      return s.split(' ')[0];
    }
    return '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setPreviewStats(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      
      // Check for multi-sheet workbook matching tabs like "Clientes Por Regiao" or "INFO-PED"
      let targetSheetName = workbook.SheetNames[0];
      const regionalSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('cliente') || 
        name.toLowerCase().includes('regiao') || 
        name.toLowerCase().includes('região')
      );
      const infoPedSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('info-ped') || 
        name.toLowerCase().includes('infoped') || 
        name.toLowerCase().includes('pedido')
      );
      const visitsSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('primeira visita') || 
        name.toLowerCase().includes('segunda visita') || 
        name.toLowerCase().includes('visita') || 
        name.toLowerCase().includes('pesquisa')
      );

      if (activeMode === 'regional_clients' && regionalSheetName) {
        targetSheetName = regionalSheetName;
      } else if (activeMode === 'infoped' && infoPedSheetName) {
        targetSheetName = infoPedSheetName;
      } else if (activeMode === 'visitas' && visitsSheetName) {
        targetSheetName = visitsSheetName;
      }

      const worksheet = workbook.Sheets[targetSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawRows.length < 2) {
        throw new Error('A planilha selecionada está vazia ou sem cabeçalhos.');
      }

      const headers: string[] = rawRows[0].map((h: any) => String(h).trim().toLowerCase());
      const dataRows = rawRows.slice(1);

      if (activeMode === 'regional_clients' || targetSheetName.toLowerCase().includes('regiao')) {
        // Parse Clientes Por Regiao
        const colId = headers.findIndex(h => h === 'id' || h.includes('cod') || h.includes('codigo') || h.includes('integrador_id'));
        const colNome = headers.findIndex(h => h.includes('nome_integrador') || h.includes('integrador') || h.includes('cliente') || h === 'nome');
        const colFantasia = headers.findIndex(h => h.includes('fantasia') || h.includes('nome_fantasia'));
        const colRazao = headers.findIndex(h => h.includes('razao') || h.includes('razao_social') || h.includes('razão'));
        const colCnpj = headers.findIndex(h => h.includes('cnpj'));
        const colTel = headers.findIndex(h => h.includes('tel') || h.includes('fone') || h.includes('celular') || h.includes('telefone'));
        const colCidade = headers.findIndex(h => h.includes('cidade') || h.includes('municipio') || h.includes('município'));
        const colEstado = headers.findIndex(h => h.includes('estado') || h.includes('uf') || h.includes('regiao') || h.includes('região'));
        const colRca = headers.findIndex(h => h.includes('rca') || h.includes('nome_rca') || h.includes('vendedor') || h.includes('consultor'));

        const parsedClients: RegionalClient[] = [];
        const stateSet = new Set<string>();

        dataRows.forEach((r: any[], idx: number) => {
          const id = colId >= 0 && r[colId] ? String(r[colId]).trim() : `CLI_${idx + 1}`;
          const name = colNome >= 0 && r[colNome] ? String(r[colNome]).trim() : (colFantasia >= 0 ? String(r[colFantasia]).trim() : `Cliente ${id}`);
          const tradeName = colFantasia >= 0 && r[colFantasia] && String(r[colFantasia]).trim() !== 'NULL' ? String(r[colFantasia]).trim() : name;
          const corporateReason = colRazao >= 0 && r[colRazao] ? String(r[colRazao]).trim() : name;
          const cnpj = colCnpj >= 0 && r[colCnpj] ? String(r[colCnpj]).trim() : '';
          const phone = colTel >= 0 && r[colTel] ? String(r[colTel]).trim() : '';
          const city = colCidade >= 0 && r[colCidade] ? String(r[colCidade]).trim() : 'Capital';
          let state = colEstado >= 0 && r[colEstado] ? String(r[colEstado]).trim() : 'Não Definido';
          if (state.length === 2) {
            const ufMap: { [k: string]: string } = {
              'AL': 'Alagoas', 'MA': 'Maranhão', 'PE': 'Pernambuco', 'PA': 'Pará', 'BA': 'Bahia',
              'PB': 'Paraíba', 'ES': 'Espírito Santo', 'RN': 'Rio Grande do Norte', 'AP': 'Amapá', 'CE': 'Ceará'
            };
            state = ufMap[state.toUpperCase()] || state;
          }
          const rcaName = colRca >= 0 && r[colRca] && String(r[colRca]).trim() !== 'NULL' ? String(r[colRca]).trim() : 'A DEFINIR';

          if (name || id) {
            stateSet.add(state);
            parsedClients.push({
              id,
              name,
              tradeName,
              corporateReason,
              cnpj,
              phone,
              city,
              state,
              rcaName
            });
          }
        });

        if (parsedClients.length > 0) {
          onUpdateRegionalClients(parsedClients);
          setPreviewStats({
            rowsRead: dataRows.length,
            clientsImported: parsedClients.length,
            statesFound: stateSet.size,
          });
          setSuccessMessage(`Aba Clientes Por Região importada com sucesso! ${parsedClients.length} clientes carregados em ${stateSet.size} estados.`);
        } else {
          throw new Error('Não foi possível identificar linhas de clientes na aba selecionada.');
        }

      } else if (
        activeMode === 'visitas' || 
        targetSheetName.toLowerCase().includes('visita') || 
        targetSheetName.toLowerCase().includes('pesquisa') || 
        headers.some(h => h.includes('possui cadastro') || h.includes('cadastro na nossa loja'))
      ) {
        // Parse Visitas & Cadastros Loja
        const colSearchId = headers.findIndex(h => h.includes('id da pesquisa') || h === 'id' || h.includes('pesquisa'));
        const colPdv = headers.findIndex(h => h.includes('pdv') || h.includes('cliente'));
        const colNotificante = headers.findIndex(h => h.includes('notificante') || h.includes('consultor') || h.includes('vendedor'));
        const colData = headers.findIndex(h => h.includes('data') || h.includes('dia'));
        const colSucesso = headers.findIndex(h => h.includes('bem sucedida') || h.includes('sucesso') || h.includes('aconteceu'));
        const colPossuiCadastro = headers.findIndex(h => 
          h.includes('possui cadastro') || 
          h.includes('cadastro na nossa loja') || 
          h.includes('cadastro em loja') ||
          h.includes('cadastro')
        );
        const colStatus = headers.findIndex(h => h.includes('status') || h.includes('situacao'));
        const colRecebeu = headers.findIndex(h => h.includes('recebeu') || h.includes('atendeu'));
        const colContato = headers.findIndex(h => h.includes('contato') || h.includes('fone'));
        const colObs = headers.findIndex(h => h.includes('resumo') || h.includes('observacao') || h.includes('notas'));
        const colCnpj = headers.findIndex(h => h.includes('cnpj'));
        const colEstado = headers.findIndex(h => h.includes('estado') || h.includes('uf'));
        const colCidade = headers.findIndex(h => h.includes('cidade') || h.includes('municipio'));

        let newRegistrationsCount = 0;
        let directNaoCount = 0;
        const updatedVisits = [...visits];
        const visitsById = new Map<string, Visit>();
        updatedVisits.forEach(v => visitsById.set(v.searchId || v.id, v));

        dataRows.forEach((r: any[], idx: number) => {
          const sId = colSearchId >= 0 && r[colSearchId] ? String(r[colSearchId]).trim() : '';
          const notificante = colNotificante >= 0 && r[colNotificante] ? String(r[colNotificante]).trim() : '';
          if (!sId && !notificante) return;
          if (notificante.toLowerCase() === 'teste') return;

          const cadRaw = colPossuiCadastro >= 0 ? String(r[colPossuiCadastro] || '').trim() : '';
          const cadUpper = cadRaw.toUpperCase();
          const isNao = cadUpper === 'NÃO' || cadUpper === 'NAO';
          const isSim = cadUpper === 'SIM';

          const statusRaw = colStatus >= 0 ? String(r[colStatus] || '').trim() : '';
          const isSemCad = statusRaw.toUpperCase() === 'SEM CADASTRO';

          const isNewReg = isNao || isSemCad;
          if (isNewReg) newRegistrationsCount++;
          if (isNao) directNaoCount++;

          const existing = sId ? visitsById.get(sId) : undefined;
          if (existing) {
            existing.clienteJaPossuiCadastroLoja = cadRaw || (isSemCad ? 'NÃO' : existing.clienteJaPossuiCadastroLoja);
            existing.hasStoreRegistration = isSim ? true : (isNao ? false : existing.hasStoreRegistration);
            existing.isNewRegistration = isNewReg || existing.isNewRegistration;
            if (statusRaw) existing.customerStatus = statusRaw;
          } else {
            const clientName = colPdv >= 0 && r[colPdv] ? String(r[colPdv]).trim() : `Cliente ${idx + 1}`;
            const clientCode = clientName.match(/^(\d+)/) ? clientName.match(/^(\d+)/)[1] : '';
            const matchedConsultant = consultants.find(c => c.name.toLowerCase() === notificante.toLowerCase());

            const newVisit: Visit = {
              id: `v_upl_${sId || idx + 1}`,
              searchId: sId || String(idx + 1),
              consultantId: matchedConsultant ? matchedConsultant.id : 'c1',
              consultantName: notificante || 'Consultor',
              consultantRole: 'Consultor Externo de Relacionamento',
              visitCycle: '1ª Visita',
              clientCode,
              clientName,
              state: colEstado >= 0 ? String(r[colEstado] || '').trim() : (matchedConsultant?.region || 'Alagoas'),
              city: colCidade >= 0 ? String(r[colCidade] || '').trim() : '',
              cnpj: colCnpj >= 0 ? cleanCNPJ(r[colCnpj]) : '',
              date: colData >= 0 ? parseDateToISO(r[colData]) : '2026-09-01',
              time: '14:00',
              status: colSucesso >= 0 && String(r[colSucesso]).toUpperCase() === 'SIM' ? 'Realizada' : 'Não Realizada',
              visitHappened: colSucesso >= 0 ? String(r[colSucesso]).toUpperCase() === 'SIM' : true,
              whoReceived: colRecebeu >= 0 ? String(r[colRecebeu] || '').trim() : '',
              contact: colContato >= 0 ? String(r[colContato] || '').trim() : '',
              customerStatus: statusRaw || (isNao ? 'SEM CADASTRO' : 'NUNCA COMPROU'),
              clienteJaPossuiCadastroLoja: cadRaw || (isSemCad ? 'NÃO' : ''),
              hasStoreRegistration: isSim ? true : (isNao ? false : undefined),
              isNewRegistration: isNewReg,
              notes: colObs >= 0 ? String(r[colObs] || '').trim() : '',
              proposalSent: true,
              dealClosed: false,
              returnValue: 0,
              dealStatus: 'Em Aberto',
              ordersBeforeVisit: 0,
              ordersAfterVisit: 0,
              revenueBeforeVisit: 0,
              revenueAfterVisit: 0,
              growthPercentage: 0,
              beforeDate: '---',
              afterDate: '---'
            };
            updatedVisits.push(newVisit);
            if (sId) visitsById.set(sId, newVisit);
          }
        });

        onUpdateVisits(updatedVisits);
        setPreviewStats({
          rowsRead: dataRows.length,
          matchedVisits: updatedVisits.length,
          newOrdersCount: newRegistrationsCount,
        });
        setSuccessMessage(`Pesquisas e Visitas sincronizadas com sucesso! ${dataRows.length} linhas lidas, ${newRegistrationsCount} novos cadastros identificados (${directNaoCount} com resposta direta NÃO na loja).`);

      } else if (activeMode === 'infoped') {
        // Find indices for InfoPed
        const colNumPedido = headers.findIndex(h => h.includes('numero') || h.includes('num_pedido') || h.includes('pedido'));
        const colDataCriacao = headers.findIndex(h => h.includes('criação') || h.includes('data') || h.includes('criacao'));
        const colCodIntegrador = headers.findIndex(h => h.includes('cod_integrador') || h.includes('codigo') || h.includes('cod') || h.includes('integrador'));
        const colNomeIntegrador = headers.findIndex(h => h.includes('nome_integrador') || h.includes('home_integrador') || (h.includes('integrador') && h.includes('nome')));
        const colCnpjIntegrador = headers.findIndex(h => h.includes('cnpj'));
        const colEmailIntegrador = headers.findIndex(h => h.includes('mail') || h.includes('email'));
        const colTelIntegrador = headers.findIndex(h => h.includes('telefone') || h.includes('fone') || h.includes('celular') || h.includes('lefone'));
        const colEstadoIntegrador = headers.findIndex(h => h.includes('estado_integrador') || h.includes('stado_integrado') || h.includes('estado') || h.includes('uf'));
        const colCidadeIntegrador = headers.findIndex(h => h.includes('cidade_integrador') || h.includes('cidade_integrado') || h.includes('cidade'));
        const colGrupoIntegrador = headers.findIndex(h => h.includes('grupo_integrador') || h.includes('grupo'));
        const colCepIntegrador = headers.findIndex(h => h.includes('cep_integrador') || h.includes('cep'));
        const colNomeRca = headers.findIndex(h => h.includes('nome_rca') || h.includes('rca'));
        const colIdRca = headers.findIndex(h => h.includes('id_rca') || h.includes('id_rca_loja'));
        const colNomeClienteFaturado = headers.findIndex(h => h.includes('nome_cliente_faturado') || h.includes('cliente_faturado') || h.includes('ome_cliente'));
        const colEstadoClienteFaturado = headers.findIndex(h => h.includes('estado_cliente_faturado') || h.includes('stado_cliente'));
        const colValorPedido = headers.findIndex(h => h.includes('valor_pedido') || h.includes('valor') || h.includes('faturamento'));

        const ordersByCode = new Map<string, any[]>();
        const ordersByCNPJ = new Map<string, any[]>();
        const parsedRecords: InfoPedRecord[] = [];
        let validOrdersCount = 0;

        const ufMap: { [k: string]: string } = {
          'AL': 'Alagoas', 'MA': 'Maranhão', 'PE': 'Pernambuco', 'PA': 'Pará', 'BA': 'Bahia',
          'PB': 'Paraíba', 'ES': 'Espírito Santo', 'RN': 'Rio Grande do Norte', 'AP': 'Amapá', 'CE': 'Ceará',
          'AM': 'Amazonas', 'PI': 'Piauí', 'SE': 'Sergipe', 'TO': 'Tocantins', 'RO': 'Rondônia'
        };

        dataRows.forEach((r: any[], idx: number) => {
          const num = colNumPedido >= 0 ? String(r[colNumPedido] || '').trim() : `PED_${idx + 1}`;
          const code = colCodIntegrador >= 0 ? String(r[colCodIntegrador] || '').trim() : '';
          const name = colNomeIntegrador >= 0 ? String(r[colNomeIntegrador] || '').trim() : '';
          const cnpj = colCnpjIntegrador >= 0 ? cleanCNPJ(r[colCnpjIntegrador]) : '';
          const email = colEmailIntegrador >= 0 ? String(r[colEmailIntegrador] || '').trim() : '';
          const phone = colTelIntegrador >= 0 ? String(r[colTelIntegrador] || '').trim() : '';
          let state = colEstadoIntegrador >= 0 ? String(r[colEstadoIntegrador] || '').trim() : '';
          if (state.length === 2) state = ufMap[state.toUpperCase()] || state;
          const city = colCidadeIntegrador >= 0 ? String(r[colCidadeIntegrador] || '').trim() : '';
          const group = colGrupoIntegrador >= 0 ? String(r[colGrupoIntegrador] || '').trim() : '';
          const cep = colCepIntegrador >= 0 ? String(r[colCepIntegrador] || '').trim() : '';
          const rcaName = colNomeRca >= 0 ? String(r[colNomeRca] || '').trim() : '';
          const rcaId = colIdRca >= 0 ? String(r[colIdRca] || '').trim() : '';
          const billedClientName = colNomeClienteFaturado >= 0 ? String(r[colNomeClienteFaturado] || '').trim() : '';
          let billedClientState = colEstadoClienteFaturado >= 0 ? String(r[colEstadoClienteFaturado] || '').trim() : '';
          if (billedClientState.length === 2) billedClientState = ufMap[billedClientState.toUpperCase()] || billedClientState;
          
          const rawDate = colDataCriacao >= 0 ? r[colDataCriacao] : '';
          const dateIso = parseDateToISO(rawDate) || '2026-08-01';
          const valor = colValorPedido >= 0 ? parseNumber(r[colValorPedido]) : 0;

          if (code || cnpj || name) {
            validOrdersCount++;
            const record: InfoPedRecord = {
              id: num || `PED_${idx + 1}`,
              orderNumber: num,
              orderDate: dateIso,
              clientCode: code,
              clientName: name,
              cnpj,
              email,
              phone,
              state: state || billedClientState || 'Não Definido',
              city,
              group,
              cep,
              rcaName,
              rcaId,
              billedClientName,
              billedClientState,
              orderValue: valor,
            };
            parsedRecords.push(record);

            const orderObj = { num, code, cnpj, date: dateIso, valor };
            if (code) {
              if (!ordersByCode.has(code)) ordersByCode.set(code, []);
              ordersByCode.get(code)!.push(orderObj);
            }
            if (cnpj) {
              if (!ordersByCNPJ.has(cnpj)) ordersByCNPJ.set(cnpj, []);
              ordersByCNPJ.get(cnpj)!.push(orderObj);
            }
          }
        });

        if (parsedRecords.length > 0 && onUpdateInfoPedRecords) {
          onUpdateInfoPedRecords(parsedRecords);
        }

        // Now cross-reference with existing visits
        let matchedVisitsCount = 0;
        let totalNewRevenue = 0;

        const updatedVisits = visits.map(v => {
          const clientCode = v.clientCode || (v.clientName.match(/^(\d+)/) ? v.clientName.match(/^(\d+)/)![1] : '');
          const cnpjClean = cleanCNPJ(v.cnpj);

          const matchedMap = new Map<string, any>();
          if (clientCode && ordersByCode.has(clientCode)) {
            ordersByCode.get(clientCode)!.forEach(o => matchedMap.set(o.num || o.date + o.valor, o));
          }
          if (cnpjClean && ordersByCNPJ.has(cnpjClean)) {
            ordersByCNPJ.get(cnpjClean)!.forEach(o => matchedMap.set(o.num || o.date + o.valor, o));
          }

          const matchedOrdersList = Array.from(matchedMap.values());
          if (matchedOrdersList.length === 0) return v;

          matchedVisitsCount++;
          matchedOrdersList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const visitDateIso = v.date || '2026-08-20';
          const visitTime = new Date(visitDateIso).getTime();

          const ordersBefore = matchedOrdersList.filter(o => new Date(o.date).getTime() < visitTime);
          const ordersAfter = matchedOrdersList.filter(o => new Date(o.date).getTime() >= visitTime);

          const revBefore = ordersBefore.reduce((acc, o) => acc + o.valor, 0);
          const revAfter = ordersAfter.reduce((acc, o) => acc + o.valor, 0);
          totalNewRevenue += revAfter;

          const lastBeforeDate = ordersBefore.length > 0
            ? new Date(ordersBefore[ordersBefore.length - 1].date).toLocaleDateString('pt-BR')
            : '---';
          const firstAfterDate = ordersAfter.length > 0
            ? new Date(ordersAfter[0].date).toLocaleDateString('pt-BR')
            : '---';

          let customerStatus = v.customerStatus || 'NUNCA COMPROU';
          if (matchedOrdersList.length > 0) {
            let mostRecentTime = 0;
            for (const ord of matchedOrdersList) {
              const t = new Date(ord.date).getTime();
              if (t > mostRecentTime) mostRecentTime = t;
            }
            const diffDays = (visitTime - mostRecentTime) / (1000 * 60 * 60 * 24);
            if (diffDays <= 60 || ordersAfter.length > 0) {
              customerStatus = 'ATIVO - Comprou nos últimos 60 dias';
            } else {
              customerStatus = 'INATIVO - Comprou há mais de 60 dias';
            }
          }

          return {
            ...v,
            dealClosed: ordersAfter.length > 0,
            dealStatus: ordersAfter.length > 0 ? 'Negócio Fechado' : v.dealStatus,
            returnValue: Math.round(revAfter),
            ordersBeforeVisit: ordersBefore.length,
            ordersAfterVisit: ordersAfter.length,
            revenueBeforeVisit: Math.round(revBefore),
            revenueAfterVisit: Math.round(revAfter),
            beforeDate: lastBeforeDate,
            afterDate: firstAfterDate,
            customerStatus,
          };
        });

        onUpdateVisits(updatedVisits);
        setPreviewStats({
          rowsRead: dataRows.length,
          matchedVisits: matchedVisitsCount,
          newOrdersCount: validOrdersCount,
          totalNewRevenue: totalNewRevenue,
        });
        setSuccessMessage(`Planilha de Pedidos processada com sucesso! ${validOrdersCount} pedidos carregados e ${matchedVisitsCount} visitas cruzadas.`);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao processar arquivo. Verifique o formato da planilha.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sincronizar / Importar Planilha</h3>
              <p className="text-xs text-slate-500">Atualize pedidos, visitas ou a aba de clientes por região (.xlsx ou .csv)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action: Force Rebuild / Reset to Official Base */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Database className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900">Base Integrada Oficial</div>
              <div className="text-[11px] text-slate-600">
                {regionalClients.length} clientes por região, 18.341 pedidos e {visits.length} visitas sincronizados
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onResetOfficial();
              setSuccessMessage('Base de dados recarregada e re-sincronizada com sucesso!');
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Recarregar Base</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveMode('infoped')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeMode === 'infoped'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>1. INFO-PED</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('regional_clients')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeMode === 'regional_clients'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. Clientes Região</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('visitas')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeMode === 'visitas'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>3. Pesquisas & Cadastros</span>
          </button>
        </div>

        {/* Mode Information Card */}
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1">
          {activeMode === 'infoped' ? (
            <div>
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Colunas esperadas na planilha de pedidos:</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                <code>num_pedido</code>, <code>data_criacao</code>, <code>cod_integrador</code> ou <code>cnpj</code>, <code>valor_pedido</code>.
              </p>
            </div>
          ) : activeMode === 'regional_clients' ? (
            <div>
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Colunas esperadas na aba Clientes Por Região:</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                <code>ID</code>, <code>NOME_INTEGRADOR</code>, <code>NOME_FANTASIA</code>, <code>RAZAO_SOCIAL</code>, <code>CNPJ</code>, <code>TELEFONE</code>, <code>CIDADE</code>, <code>ESTADO</code>, <code>nome_rca</code>.
              </p>
            </div>
          ) : (
            <div>
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Colunas esperadas nas Pesquisas de Campo (1ª e 2ª Visita):</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                <code>ID da Pesquisa</code>, <code>Notificante</code>, <code>PDV</code>, <code>CLIENTE JA POSSUI CADASTRO NA NOSSA LOJA ?</code>, <code>STATUS</code>.
              </p>
              <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                Identifica novos cadastros quando respondido "NÃO" para cadastro em loja ou status "SEM CADASTRO".
              </p>
            </div>
          )}
        </div>

        {/* Upload Drop Zone */}
        <div className="mt-4">
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/30 transition-all">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-2">
                <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-xs font-bold text-slate-700">Processando planilha e cruzando dados...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Clique ou arraste seu arquivo Excel (.xlsx) ou CSV aqui
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeMode === 'infoped' 
                    ? 'Arquivo INFO-PED ou RCM-DASH2.0' 
                    : activeMode === 'regional_clients' 
                    ? 'Aba Clientes Por Regiao ou lista de clientes' 
                    : 'Aba Primeira visita / Segunda visita com perguntas do Involves'}
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Sucesso!</div>
              <div>{successMessage}</div>
              {previewStats?.clientsImported && (
                <div className="mt-1 font-semibold text-[11px]">
                  Total importado: {previewStats.clientsImported} clientes em {previewStats.statesFound} estados.
                </div>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Erro ao importar</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
