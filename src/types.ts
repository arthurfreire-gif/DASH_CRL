export type ExpenseCategory = 
  | 'Passagens & Transporte' 
  | 'Hospedagem' 
  | 'Alimentação' 
  | 'Jantares de Negócios' 
  | 'Eventos & Brindes' 
  | 'Outros';

export type VisitStatus = 'Realizada' | 'Agendada' | 'Não Realizada' | 'Cancelada';
export type DealStatus = 'Negócio Fechado' | 'Proposta Enviada' | 'Em Negociação' | 'Sem Retorno Imediato' | 'Em Aberto';
export type VisitCycle = '1ª Visita' | '2ª Visita';

export interface Consultant {
  id: string;
  name: string;
  email: string;
  region: string;
  role?: string; // Consultor Externo de Relacionamento
  segment: 'Corporate' | 'Enterprise' | 'Vip / Private' | 'Governo';
  avatar: string;
  activeClientsCount: number;
}

export interface Expense {
  id: string;
  consultantId: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  clientName?: string;
  description: string;
}

export interface Visit {
  id: string;
  searchId?: string; // ID da Pesquisa (ex: 5982599)
  consultantId: string;
  consultantName?: string;
  consultantRole?: string; // Consultor Externo de Relacionamento
  visitCycle?: VisitCycle; // '1ª Visita' | '2ª Visita'
  clientCode?: string; // ID do cliente na loja / PDV
  clientName: string;
  flag?: string; // Bandeira (ex: SEM BANDEIRA, Farol, Cactus, Girassol, Raio, Clareou)
  state?: string;
  city?: string;
  regional?: string;
  cnpj?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  status: VisitStatus;
  visitHappened?: boolean; // FOI BEM SUCEDIDO / VISITA ACONTECEU (SIM/NÃO)
  reasonNotHappened?: string; // Motivo da visita não acontecer / Justificativa
  justification?: string;
  whoReceived?: string;
  whoReceivedRole?: string;
  receivedBy?: string; // Alias for compatibility
  receivedRole?: string; // Alias for compatibility
  contact?: string;
  customerStatus?: string; // ATIVO, INATIVO, NUNCA COMPROU, SEM CADASTRO, etc.
  clienteJaPossuiCadastroLoja?: 'SIM' | 'NÃO' | string; // Resposta: CLIENTE JA POSSUI CADASTRO NA NOSSA LOJA ?
  hasStoreRegistration?: boolean; // false se respondeu NÃO na pesquisa
  isNewRegistration?: boolean; // true se o cliente não possuía cadastro e foi cadastrado pelo consultor
  whoServesCustomer?: string;
  demandedBy?: string;
  objective?: string;
  notes: string;
  activityGenerated?: string;
  marketTime?: string;
  purchaseDecidingFactor?: string;
  clientHighestDemand?: string;
  paymentMethod?: string;
  monthlyKits?: number;
  monthlyRevenue?: number;
  inverterBrand?: string;
  moduleBrand?: string;
  employeesCount?: number;
  salespeopleCount?: number;
  photoUrl?: string;
  secondVisitDetails?: {
    importantChange?: string;
    changeDescription?: string;
    complaints?: string;
    complaintDetails?: string;
    commercialOpportunity?: string;
    opportunityDescription?: string;
    activityDetails?: string;
    relationshipStatus?: string;
    attentionPoint?: string;
    attentionPointDetails?: string;
    nextStep?: string;
    nextVisitDate?: string;
  };
  proposalSent: boolean;
  dealClosed: boolean;
  returnValue: number; // Retorno financeiro gerado
  dealStatus: DealStatus;
  kitsPerMonth?: number;
  monthlyBilling?: number;
  ordersBeforeVisit?: number;
  ordersAfterVisit?: number;
  revenueBeforeVisit?: number;
  revenueAfterVisit?: number;
  growthPercentage?: number;
  beforeDate?: string;
  afterDate?: string;
}

export interface RegionalClient {
  id: string; // ID do Integrador (ex: 318, 1004)
  clientCode?: string;
  name: string; // NOME_INTEGRADOR
  tradeName?: string; // NOME_FANTASIA
  corporateReason?: string; // RAZAO_SOCIAL
  cnpj?: string;
  phone?: string;
  city: string;
  state: string; // ESTADO (ex: Alagoas, Pará, Maranhão, etc.)
  rcaName?: string; // nome_rca (ex: FLÁVIA SOUTO, MARIELLEN HOLANDA, etc.)
}

export interface InfoPedRecord {
  id?: string;
  orderNumber?: string;
  orderDate?: string;
  clientCode?: string; // cod_integrador
  clientName?: string; // nome_integrador
  cnpj?: string; // cnpj_integrador
  email?: string;
  phone?: string;
  state?: string; // estado_integrador
  city?: string; // cidade_integrador
  group?: string; // grupo_integrador
  cep?: string; // cep_integrador
  rcaName?: string; // nome_rca
  rcaId?: string; // id_rca_loja
  billedClientName?: string; // nome_cliente_faturado
  billedClientState?: string; // estado_cliente_faturado
  orderValue?: number; // valor_pedido
  ordersCount?: number;
  lastOrderDate?: string;
  ordersCount60d?: number;
  orderValue60d?: number;
  isWithin60Days?: boolean;
  daysSinceLastOrder?: number;
}

export interface FilterState {
  period: 'all' | 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';
  visitCycle?: 'all' | '1ª Visita' | '2ª Visita';
  startDate: string;
  endDate: string;
  consultantId: string;
  expenseCategory: string;
  searchQuery: string;
}

export interface AIInsightsResponse {
  executiveSummary: string;
  topPerformers: Array<{ name: string; reason: string }>;
  areasForImprovement: Array<{ name: string; issue: string; recommendation: string }>;
  budgetRecommendations: string[];
}
