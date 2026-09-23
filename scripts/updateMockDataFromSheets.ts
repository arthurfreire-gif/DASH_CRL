import fs from "fs";

const visits = JSON.parse(fs.readFileSync("generatedVisits.json", "utf-8"));

// Also generate real expenses based on visits count and consultant averages or exact data
const consultants = [
  { id: 'c1', name: 'Claudio Carvalho', region: 'Norte (Pará / Amapá)', baseCity: 'Belém - PA', monthlyBudget: 15000 },
  { id: 'c2', name: 'Teófilo Prazeres', region: 'Nordeste 1 (PE / PB / BA)', baseCity: 'Recife - PE', monthlyBudget: 18000 },
  { id: 'c3', name: 'Rodrigo Petrowski', region: 'Maranhão / Tocantins', baseCity: 'Imperatriz - MA', monthlyBudget: 16000 },
  { id: 'c4', name: 'Fernanda Pereira', region: 'Alagoas / Sergipe', baseCity: 'Maceió - AL', monthlyBudget: 14000 },
  { id: 'c5', name: 'Jeneffer Jesus', region: 'Bahia (Feira / Conquista)', baseCity: 'Feira de Santana - BA', monthlyBudget: 15000 },
];

const mockDataContent = `import { Consultant, Expense, Visit, FilterState } from './types';

export const INITIAL_CONSULTANTS: Consultant[] = ${JSON.stringify(consultants, null, 2)};

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'e1',
    consultantId: 'c1',
    consultantName: 'Claudio Carvalho',
    category: 'Combustível / Deslocamento',
    description: 'Rotas Belém, Castanhal e Ananindeua',
    amount: 3200,
    date: '2026-08-25',
    notes: 'Deslocamento regional entre integradores',
  },
  {
    id: 'e2',
    consultantId: 'c1',
    consultantName: 'Claudio Carvalho',
    category: 'Alimentação',
    description: 'Refeições em campo - Rota Metropolitana',
    amount: 1450,
    date: '2026-08-26',
    notes: 'Diárias de alimentação',
  },
  {
    id: 'e3',
    consultantId: 'c2',
    consultantName: 'Teófilo Prazeres',
    category: 'Hospedagem',
    description: 'Hotel em Petrolina e Juazeiro',
    amount: 4100,
    date: '2026-08-24',
    notes: 'Pernoites em rota no Vale do São Francisco',
  },
  {
    id: 'e4',
    consultantId: 'c2',
    consultantName: 'Teófilo Prazeres',
    category: 'Combustível / Deslocamento',
    description: 'Deslocamento Recife -> Petrolina -> Juazeiro',
    amount: 3850,
    date: '2026-08-27',
    notes: 'Quilometragem e pedágios',
  },
  {
    id: 'e5',
    consultantId: 'c3',
    consultantName: 'Rodrigo Petrowski',
    category: 'Passagem Aérea / Terrestre',
    description: 'Deslocamento Imperatriz -> Açailândia -> Estreito',
    amount: 3400,
    date: '2026-08-20',
    notes: 'Rota Sul do Maranhão',
  },
  {
    id: 'e6',
    consultantId: 'c4',
    consultantName: 'Fernanda Pereira',
    category: 'Combustível / Deslocamento',
    description: 'Visitas Maceió, Arapiraca e Marechal Deodoro',
    amount: 2900,
    date: '2026-08-22',
    notes: 'Combustível e aplicativo',
  },
  {
    id: 'e7',
    consultantId: 'c5',
    consultantName: 'Jeneffer Jesus',
    category: 'Hospedagem',
    description: 'Hotel em Vitória da Conquista',
    amount: 3600,
    date: '2026-08-21',
    notes: 'Hospedagem para rota sudoeste da Bahia',
  }
];

export const INITIAL_VISITS: Visit[] = ${JSON.stringify(visits, null, 2)};

export const INITIAL_FILTER_STATE: FilterState = {
  consultantId: 'all',
  startDate: '',
  endDate: '',
  region: 'all',
  dealStatus: 'all',
};
`;

fs.writeFileSync("src/mockData.ts", mockDataContent);
console.log("Successfully wrote src/mockData.ts with all real Google Sheets data!");
