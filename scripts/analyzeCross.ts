import fs from "fs";

interface InfoPedRow {
  numero_pedido: string;
  data_criacao: string; // YYYY-MM-DD HH:mm:ss
  valor_pedido: number;
  cod_integrador: string;
  nome_integrador: string;
  cnpj_integrador: string;
  nome_rca: string;
}

interface VisitRow {
  id_pesquisa: string;
  pdv: string;
  cod_cliente: string;
  nome_cliente: string;
  estado: string;
  cidade: string;
  cnpj: string;
  data_pesquisa_raw: string;
  data_pesquisa: string; // YYYY-MM-DD
  consultor: string;
  visita_aconteceu: boolean;
  justificativa: string;
  status: string;
  quem_atende: string;
  resumo: string;
  qtd_kits_vendidos_mes: string;
  faturamento_mes: string;
}

function cleanCNPJ(cnpj: string): string {
  if (!cnpj) return "";
  return cnpj.replace(/\D/g, "");
}

function parseVal(valStr: string): number {
  if (!valStr) return 0;
  // e.g. "29.603.900" -> 29603.90 or 29603900 depending on locale
  // Let's check how numbers are formatted in INFO-PED
  const clean = valStr.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  // in Brazil currency format if 29.603.900 -> 29603.90 (cents represented as last 2-4 digits?)
  return isNaN(num) ? 0 : num;
}

function parseVisitDate(rawDateStr: string): string {
  // e.g. "01/09/2026 09:37" or "28/08/2026 17:08" or "2026-08-28"
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
  valor_pedido: infoPedHeader.indexOf("valor_pedido"),
  cod_integrador: infoPedHeader.indexOf("cod_integrador"),
  nome_integrador: infoPedHeader.indexOf("nome_integrador"),
  cnpj_integrador: infoPedHeader.indexOf("cnpj_integrador"),
  nome_rca: infoPedHeader.indexOf("nome_rca")
};

console.log("INFO-PED column indices:", colIdx);

const allOrders: InfoPedRow[] = infoPedRows.map(r => ({
  numero_pedido: r[colIdx.num_pedido] || "",
  data_criacao: r[colIdx.data_criacao] || "",
  valor_pedido: parseVal(r[colIdx.valor_pedido]),
  cod_integrador: (r[colIdx.cod_integrador] || "").trim(),
  nome_integrador: r[colIdx.nome_integrador] || "",
  cnpj_integrador: cleanCNPJ(r[colIdx.cnpj_integrador]),
  nome_rca: r[colIdx.nome_rca] || ""
}));

console.log("Total orders in INFO-PED:", allOrders.length);
console.log("Sample orders:", allOrders.slice(0, 5));

// Map orders by client code and by CNPJ
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
  pdv: extHeader.indexOf("PDV"),
  estado: extHeader.indexOf("Estado"),
  cidade: extHeader.indexOf("Cidade"),
  cnpj: extHeader.indexOf("CNPJ"),
  data_pesquisa: extHeader.indexOf("Data e hora da pesquisa"),
  notificante: extHeader.indexOf("Notificante"),
  visita_aconteceu: extHeader.indexOf("VISITA ACONTECEU?"),
  justificativa: extHeader.indexOf("CASO NÃO TENHA ACONTECIDO, JUSTIFIQUE"),
  status: extHeader.indexOf("STATUS"),
  quem_atende: extHeader.indexOf("QUEM ATENDE O CLIENTE?"),
  resumo: extHeader.indexOf("RESUMO - PÓS VISITA (Ideia Principal, Pontos Chave e Ações Futuras)"),
  qtd_kits: extHeader.indexOf("QUANTIDADE MÉDIA DE KITS VENDIDOS MÊS"),
  fat_mes: extHeader.indexOf("QUANTIDADE MÉDIA FATURADA MÊS")
};

console.log("Externos column indices:", extColIdx);

interface CrossResult {
  id_pesquisa: string;
  clientCode: string;
  clientName: string;
  consultor: string;
  data_visita: string;
  visita_aconteceu: boolean;
  totalOrdersOverall: number;
  ordersBeforeCount: number;
  ordersAfterCount: number;
  lastOrderBeforeDate: string;
  firstOrderAfterDate: string;
  allOrderDatesBefore: string[];
  allOrderDatesAfter: string[];
  revenueBefore: number;
  revenueAfter: number;
  status: string;
}

const results: CrossResult[] = [];

for (const r of extRows) {
  const pdv = r[extColIdx.pdv] || "";
  const matchCode = pdv.match(/^(\d+)/);
  const clientCode = matchCode ? matchCode[1] : "";
  const clientName = matchCode ? pdv.replace(/^\d+\s*/, "").trim() : pdv.trim();
  const cnpjClean = cleanCNPJ(r[extColIdx.cnpj]);
  const rawDate = r[extColIdx.data_pesquisa] || "";
  const visitDateIso = parseVisitDate(rawDate);
  const consultor = r[extColIdx.notificante] || "";
  const aconteceu = (r[extColIdx.visita_aconteceu] || "").trim().toUpperCase() === "SIM";
  
  // Find orders for this client
  let matchedOrders: InfoPedRow[] = [];
  if (clientCode && ordersByCode.has(clientCode)) {
    matchedOrders = ordersByCode.get(clientCode)!;
  } else if (cnpjClean && ordersByCNPJ.has(cnpjClean)) {
    matchedOrders = ordersByCNPJ.get(cnpjClean)!;
  }
  
  // Sort orders by date
  matchedOrders.sort((a, b) => a.data_criacao.localeCompare(b.data_criacao));
  
  const ordersBefore: InfoPedRow[] = [];
  const ordersAfter: InfoPedRow[] = [];
  
  const visitStartOfDay = `${visitDateIso} 00:00:00`;
  const visitEndOfDay = `${visitDateIso} 23:59:59`;
  
  for (const ord of matchedOrders) {
    if (ord.data_criacao < visitStartOfDay) {
      ordersBefore.push(ord);
    } else {
      ordersAfter.push(ord);
    }
  }
  
  const lastBefore = ordersBefore.length > 0 ? ordersBefore[ordersBefore.length - 1].data_criacao : "---";
  const firstAfter = ordersAfter.length > 0 ? ordersAfter[0].data_criacao : "---";
  
  const revBefore = ordersBefore.reduce((acc, o) => acc + o.valor_pedido, 0);
  const revAfter = ordersAfter.reduce((acc, o) => acc + o.valor_pedido, 0);
  
  results.push({
    id_pesquisa: r[extColIdx.id_pesquisa],
    clientCode,
    clientName,
    consultor,
    data_visita: visitDateIso,
    visita_aconteceu: aconteceu,
    totalOrdersOverall: matchedOrders.length,
    ordersBeforeCount: ordersBefore.length,
    ordersAfterCount: ordersAfter.length,
    lastOrderBeforeDate: lastBefore,
    firstOrderAfterDate: firstAfter,
    allOrderDatesBefore: ordersBefore.map(o => o.data_criacao),
    allOrderDatesAfter: ordersAfter.map(o => o.data_criacao),
    revenueBefore: revBefore,
    revenueAfter: revAfter,
    status: r[extColIdx.status] || ""
  });
}

console.log(`Matched ${results.length} visits against INFO-PED.`);

// Filter for visits that happened
const happened = results.filter(r => r.visita_aconteceu);
console.log(`Visits that happened (SIM): ${happened.length}`);

// Let's print the top 25 happened visits
console.log("\n=== CROSS MATCH RESULTS (Happened = SIM) ===");
happened.slice(0, 30).forEach(h => {
  console.log(`[Code: ${h.clientCode || "N/A"}] ${h.clientName.slice(0, 35)} | Visit: ${h.data_visita} (${h.consultor}) => Total Orders: ${h.totalOrdersOverall} | Before: ${h.ordersBeforeCount} (${h.lastOrderBeforeDate.slice(0,10)}) | After: ${h.ordersAfterCount} (${h.firstOrderAfterDate.slice(0,10)})`);
});

fs.writeFileSync("crossResults.json", JSON.stringify(results, null, 2));
