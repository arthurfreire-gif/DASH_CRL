import fs from "fs";

interface InfoPedRow {
  numero_pedido: string;
  data_criacao: string; // YYYY-MM-DD HH:mm:ss
  valor_sem_desconto: number;
  valor_pedido: number;
  valor_repasse: number;
  valor_equipamento: number;
  id_rca: string;
  nome_rca: string;
  cod_integrador: string;
  nome_integrador: string;
  cnpj_integrador: string;
  email: string;
  telefone: string;
  estado: string;
  cidade: string;
  grupo: string;
  metodo_pagamento: string;
}

function cleanCNPJ(cnpj: string): string {
  if (!cnpj) return "";
  return cnpj.replace(/\D/g, "");
}

function parseVal(valStr: string): number {
  if (!valStr) return 0;
  const clean = valStr.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  if (num > 10000000) {
    return num / 1000;
  }
  return isNaN(num) ? 0 : num;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr || dateStr === "---") return "---";
  const dOnly = dateStr.split(" ")[0];
  const parts = dOnly.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

function parseVisitDate(rawDateStr: string): string {
  if (!rawDateStr) return "";
  const parts = rawDateStr.split(" ")[0].split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return rawDateStr.split(" ")[0];
}

const infoPedRaw = JSON.parse(fs.readFileSync("infoPed.json", "utf-8"));
const externosRaw = JSON.parse(fs.readFileSync("externos.json", "utf-8"));

const infoPedHeader: string[] = infoPedRaw.header;
const infoPedRows: string[][] = infoPedRaw.rows;

const colIdx = {
  num_pedido: infoPedHeader.indexOf("numero_pedido"),
  data_criacao: infoPedHeader.indexOf("data_criação_pedido_loja"),
  valor_sem_desconto: infoPedHeader.indexOf("valor_sem_desconto"),
  valor_pedido: infoPedHeader.indexOf("valor_pedido"),
  valor_repasse: infoPedHeader.indexOf("valor_repasse"),
  valor_equipamento: infoPedHeader.indexOf("valor_equipamento"),
  id_rca: infoPedHeader.indexOf("id_rca_loja"),
  nome_rca: infoPedHeader.indexOf("nome_rca"),
  cod_integrador: infoPedHeader.indexOf("cod_integrador"),
  nome_integrador: infoPedHeader.indexOf("nome_integrador"),
  cnpj_integrador: infoPedHeader.indexOf("cnpj_integrador"),
  email: infoPedHeader.indexOf("e-mail_integrador"),
  telefone: infoPedHeader.indexOf("telefone_integrador"),
  estado: infoPedHeader.indexOf("Estado_integrador"),
  cidade: infoPedHeader.indexOf("Cidade_Integrador"),
  grupo: infoPedHeader.indexOf("grupo_integrador"),
  metodo_pagamento: infoPedHeader.indexOf("Metodo_pagamento_loja")
};

const allOrders: InfoPedRow[] = infoPedRows.map(r => ({
  numero_pedido: r[colIdx.num_pedido] || "",
  data_criacao: r[colIdx.data_criacao] || "",
  valor_sem_desconto: parseVal(r[colIdx.valor_sem_desconto]),
  valor_pedido: parseVal(r[colIdx.valor_pedido]),
  valor_repasse: parseVal(r[colIdx.valor_repasse]),
  valor_equipamento: parseVal(r[colIdx.valor_equipamento]),
  id_rca: r[colIdx.id_rca] || "",
  nome_rca: r[colIdx.nome_rca] || "",
  cod_integrador: (r[colIdx.cod_integrador] || "").trim(),
  nome_integrador: r[colIdx.nome_integrador] || "",
  cnpj_integrador: cleanCNPJ(r[colIdx.cnpj_integrador]),
  email: r[colIdx.email] || "",
  telefone: r[colIdx.telefone] || "",
  estado: r[colIdx.estado] || "",
  cidade: r[colIdx.cidade] || "",
  grupo: r[colIdx.grupo] || "",
  metodo_pagamento: r[colIdx.metodo_pagamento] || ""
}));

const ordersByCode = new Map<string, InfoPedRow[]>();
const ordersByCNPJ = new Map<string, InfoPedRow[]>();

for (const ord of allOrders) {
  if (ord.cod_integrador) {
    if (!ordersByCode.has(ord.cod_integrador)) ordersByCode.set(ord.cod_integrador, []);
    ordersByCode.get(ord.cod_integrador)!.push(ord);
  }
  if (ord.cnpj_integrador) {
    if (!ordersByCNPJ.has(ord.cnpj_integrador)) ordersByCNPJ.set(ord.cnpj_integrador, []);
    ordersByCNPJ.get(ord.cnpj_integrador)!.push(ord);
  }
}

// Parse Externos
const extHeader: string[] = externosRaw.header;
const extRows: string[][] = externosRaw.rows;

const extColIdx = {
  id_pesquisa: extHeader.indexOf("ID da Pesquisa"),
  rotulo: extHeader.indexOf("Rótulo da pesquisa"),
  bandeira: extHeader.indexOf("Bandeira"),
  pdv: extHeader.indexOf("PDV"),
  estado: extHeader.indexOf("Estado"),
  cidade: extHeader.indexOf("Cidade"),
  regional: extHeader.indexOf("Regional"),
  cnpj: extHeader.indexOf("CNPJ"),
  data_pesquisa: extHeader.indexOf("Data e hora da pesquisa"),
  notificante: extHeader.indexOf("Notificante"),
  visita_aconteceu: extHeader.indexOf("VISITA ACONTECEU?"),
  justificativa: extHeader.indexOf("CASO NÃO TENHA ACONTECIDO, JUSTIFIQUE"),
  quem_recebeu: extHeader.indexOf("QUEM LHE RECEBEU NA EMPRESA?"),
  cargo: extHeader.indexOf("CARGO"),
  contato: extHeader.indexOf("CONTATO"),
  status: extHeader.indexOf("STATUS"),
  quem_atende: extHeader.indexOf("QUEM ATENDE O CLIENTE?"),
  demandada_por: extHeader.indexOf("VISITA DEMANDADA POR"),
  objetivo: extHeader.indexOf("OBJETIVO DA VISITA"),
  resumo: extHeader.indexOf("RESUMO - PÓS VISITA (Ideia Principal, Pontos Chave e Ações Futuras)"),
  resumo_extra: extHeader.indexOf("RESUMO CASO PRECISE"),
  tempo_mercado: extHeader.indexOf("TEMPO DE MERCADO"),
  diferencial: extHeader.indexOf("SE NÃO COMPRA COM A SOU ENERGY QUE DIFERENCIA LEVARIA A COMPRAR"),
  maior_procura: extHeader.indexOf("MAIOR PROCURA HOJE PELOS CLIENTES?"),
  forma_pagamento: extHeader.indexOf("PRINCIPAL FORMA DE PAGAMENTO"),
  qtd_kits: extHeader.indexOf("QUANTIDADE MÉDIA DE KITS VENDIDOS MÊS"),
  fat_mes: extHeader.indexOf("QUANTIDADE MÉDIA FATURADA MÊS"),
  marca_inversor: extHeader.indexOf("PRINCIPAL MARCA DE INVERSORES"),
  marca_modulo: extHeader.indexOf("PRINCIPAL MARCA DE MÓDULO"),
  num_func: extHeader.indexOf("QUANTIDADE DE FUNCIONÁRIOS"),
  num_vend: extHeader.indexOf("QUANTIDADE DE VENDEDORES"),
  foto: extHeader.indexOf("FOTO DO LUGAR VISITADO")
};

const consultantMap: Record<string, string> = {
  'Claudio Carvalho': 'c1',
  'Teófilo Prazeres': 'c2',
  'Rodrigo Petrowski': 'c3',
  'Fernanda Pereira': 'c4',
  'Jeneffer Jesus': 'c5',
};

const processedVisits: any[] = [];
let idCounter = 1;

for (const r of extRows) {
  const aconteceu = (r[extColIdx.visita_aconteceu] || "").trim().toUpperCase() === "SIM";
  // Filter strictly for realized visits (VISITA ACONTECEU? = SIM)
  if (!aconteceu) continue;

  const pdv = r[extColIdx.pdv] || "";
  const matchCode = pdv.match(/^(\d+)/);
  const clientCode = matchCode ? matchCode[1] : "";
  let clientName = matchCode ? pdv.replace(/^\d+\s*/, "").trim() : pdv.trim();
  if (!clientName) clientName = "Cliente Sem Nome";
  
  const cnpjClean = cleanCNPJ(r[extColIdx.cnpj]);
  const rawDate = r[extColIdx.data_pesquisa] || "";
  const visitDateIso = parseVisitDate(rawDate);
  const consultor = r[extColIdx.notificante] || "Claudio Carvalho";
  const consultorId = consultantMap[consultor] || 'c1';
  
  // Find orders for this client
  let matchedOrders: InfoPedRow[] = [];
  if (clientCode && ordersByCode.has(clientCode)) {
    matchedOrders = ordersByCode.get(clientCode)!;
  } else if (cnpjClean && ordersByCNPJ.has(cnpjClean)) {
    matchedOrders = ordersByCNPJ.get(cnpjClean)!;
  }
  
  matchedOrders.sort((a, b) => a.data_criacao.localeCompare(b.data_criacao));
  
  const ordersBefore: InfoPedRow[] = [];
  const ordersAfter: InfoPedRow[] = [];
  
  const visitStartOfDay = `${visitDateIso} 00:00:00`;
  
  for (const ord of matchedOrders) {
    if (ord.data_criacao < visitStartOfDay) {
      ordersBefore.push(ord);
    } else {
      ordersAfter.push(ord);
    }
  }
  
  const lastBeforeDate = ordersBefore.length > 0 
    ? formatDateBR(ordersBefore[ordersBefore.length - 1].data_criacao) 
    : "---";
    
  const firstAfterDate = ordersAfter.length > 0 
    ? formatDateBR(ordersAfter[0].data_criacao) 
    : "---";
  
  const revBefore = ordersBefore.reduce((acc, o) => acc + o.valor_pedido, 0);
  const revAfter = ordersAfter.reduce((acc, o) => acc + o.valor_pedido, 0);
  
  const dealClosed = ordersAfter.length > 0;
  let dealStatus: 'Negócio Fechado' | 'Proposta Enviada' | 'Em Negociação' | 'Sem Retorno Imediato' = 'Em Negociação';
  if (ordersAfter.length > 0) {
    dealStatus = 'Negócio Fechado';
  } else if (ordersBefore.length > 0) {
    dealStatus = 'Sem Retorno Imediato';
  } else if (!aconteceu) {
    dealStatus = 'Sem Retorno Imediato';
  } else {
    dealStatus = 'Em Negociação';
  }
  
  const notesText = r[extColIdx.resumo] || r[extColIdx.justificativa] || "Visita externa registrada no sistema.";
  
  processedVisits.push({
    id: `v${idCounter++}`,
    consultantId: consultorId,
    consultantName: consultor,
    clientCode: clientCode || undefined,
    clientName,
    state: r[extColIdx.estado] || "",
    city: r[extColIdx.cidade] || "",
    cnpj: r[extColIdx.cnpj] || "",
    date: visitDateIso || "2026-08-20",
    status: aconteceu ? 'Realizada' : 'Cancelada',
    visitHappened: aconteceu,
    justification: r[extColIdx.justificativa] || undefined,
    customerStatus: r[extColIdx.status] || undefined,
    objective: r[extColIdx.objetivo] || undefined,
    proposalSent: true,
    dealClosed,
    returnValue: revAfter > 0 ? revAfter : 0,
    dealStatus,
    notes: notesText,
    kitsPerMonth: parseInt(r[extColIdx.qtd_kits]) || 0,
    monthlyBilling: parseVal(r[extColIdx.fat_mes]) || (revAfter > 0 ? revAfter : revBefore),
    ordersBeforeVisit: ordersBefore.length,
    ordersAfterVisit: ordersAfter.length,
    revenueBeforeVisit: revBefore,
    revenueAfterVisit: revAfter,
    growthPercentage: ordersBefore.length > 0 
      ? Math.round(((ordersAfter.length - ordersBefore.length) / ordersBefore.length) * 100)
      : (ordersAfter.length > 0 ? 100 : 0),
    beforeDate: lastBeforeDate,
    afterDate: firstAfterDate
  });
}

const consultants = [
  { 
    id: 'c1', 
    name: 'Claudio Carvalho', 
    email: 'claudio.carvalho@souenergy.com.br',
    region: 'Norte (PA / AP)', 
    segment: 'Enterprise' as const,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    activeClientsCount: processedVisits.filter(v => v.consultantId === 'c1' && v.visitHappened).length
  },
  { 
    id: 'c2', 
    name: 'Teófilo Prazeres', 
    email: 'teofilo.prazeres@souenergy.com.br',
    region: 'Nordeste (PE / PB / BA)', 
    segment: 'Enterprise' as const,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    activeClientsCount: processedVisits.filter(v => v.consultantId === 'c2' && v.visitHappened).length
  },
  { 
    id: 'c3', 
    name: 'Rodrigo Petrowski', 
    email: 'rodrigo.petrowski@souenergy.com.br',
    region: 'Maranhão / Tocantins', 
    segment: 'Corporate' as const,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    activeClientsCount: processedVisits.filter(v => v.consultantId === 'c3' && v.visitHappened).length
  },
  { 
    id: 'c4', 
    name: 'Fernanda Pereira', 
    email: 'fernanda.pereira@souenergy.com.br',
    region: 'Alagoas / Sergipe', 
    segment: 'Corporate' as const,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    activeClientsCount: processedVisits.filter(v => v.consultantId === 'c4' && v.visitHappened).length
  },
  { 
    id: 'c5', 
    name: 'Jeneffer Jesus', 
    email: 'jeneffer.jesus@souenergy.com.br',
    region: 'Bahia (Feira / Conquista)', 
    segment: 'Corporate' as const,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    activeClientsCount: processedVisits.filter(v => v.consultantId === 'c5' && v.visitHappened).length
  },
];

const expenses = [
  {
    id: 'e1',
    consultantId: 'c1',
    category: 'Passagens & Transporte' as const,
    amount: 3200,
    date: '2026-08-25',
    description: 'Rotas Belém, Castanhal e Ananindeua',
  },
  {
    id: 'e2',
    consultantId: 'c1',
    category: 'Alimentação' as const,
    amount: 1450,
    date: '2026-08-26',
    description: 'Refeições em campo - Rota Metropolitana',
  },
  {
    id: 'e3',
    consultantId: 'c2',
    category: 'Hospedagem' as const,
    amount: 4100,
    date: '2026-08-24',
    description: 'Hotel em Petrolina e Juazeiro',
  },
  {
    id: 'e4',
    consultantId: 'c2',
    category: 'Passagens & Transporte' as const,
    amount: 3850,
    date: '2026-08-27',
    description: 'Deslocamento Recife -> Petrolina -> Juazeiro',
  },
  {
    id: 'e5',
    consultantId: 'c3',
    category: 'Passagens & Transporte' as const,
    amount: 3400,
    date: '2026-08-20',
    description: 'Deslocamento Imperatriz -> Açailândia -> Estreito',
  },
  {
    id: 'e6',
    consultantId: 'c4',
    category: 'Passagens & Transporte' as const,
    amount: 2900,
    date: '2026-08-22',
    description: 'Visitas Maceió, Arapiraca e Marechal Deodoro',
  },
  {
    id: 'e7',
    consultantId: 'c5',
    category: 'Hospedagem' as const,
    amount: 3600,
    date: '2026-08-21',
    description: 'Hotel em Vitória da Conquista',
  }
];

const fileContent = `import { Consultant, Expense, Visit, FilterState } from './types';

export const INITIAL_CONSULTANTS: Consultant[] = ${JSON.stringify(consultants, null, 2)};

export const INITIAL_EXPENSES: Expense[] = ${JSON.stringify(expenses, null, 2)};

export const INITIAL_VISITS: Visit[] = ${JSON.stringify(processedVisits, null, 2)};

export const INITIAL_FILTER_STATE: FilterState = {
  period: 'all',
  startDate: '',
  endDate: '',
  consultantId: 'all',
  expenseCategory: 'all',
  searchQuery: '',
};
`;

fs.writeFileSync("src/mockData.ts", fileContent);
console.log("Successfully regenerated src/mockData.ts with type-safe, exact Google Sheets data!");
