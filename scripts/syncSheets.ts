import https from "https";
import fs from "fs";

function fetchCSV(sheetName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/15SpfzEEbTPFNCTP3T7U94ufcDk87vEQy5I-rF6cHuZQ/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  if (currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
}

async function run() {
  console.log("Fetching sheets...");
  const infoPedRaw = await fetchCSV("INFO-PED");
  const externosRaw = await fetchCSV("Externos");
  
  const infoPedRows = parseCSV(infoPedRaw);
  const infoPedHeader = infoPedRows[0];
  const infoPedData = infoPedRows.slice(1);
  
  const externosRows = parseCSV(externosRaw);
  const externosHeader = externosRows[0];
  const externosData = externosRows.slice(1);
  
  console.log("INFO-PED rows:", infoPedData.length);
  console.log("Externos rows:", externosData.length);
  
  fs.writeFileSync("infoPed.json", JSON.stringify({ header: infoPedHeader, rows: infoPedData }));
  fs.writeFileSync("externos.json", JSON.stringify({ header: externosHeader, rows: externosData }));
  
  console.log("Saved infoPed.json and externos.json successfully!");
}

run().catch(console.error);
