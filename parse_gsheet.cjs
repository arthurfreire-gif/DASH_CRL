const fs = require("fs");

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i+1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push("");
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") lines.push(row);
  return lines;
}

const csvData = fs.readFileSync("google_sheet_clients.csv", "utf8");
const rows = parseCSV(csvData);

const header = rows[0];
console.log("Header columns:", header);

const records = rows.slice(1);
console.log("Total records in spreadsheet:", records.length);

const stateCounts = {};

records.forEach(r => {
  const uf = (r[7] || "").trim();
  stateCounts[uf] = (stateCounts[uf] || 0) + 1;
});

console.log("State counts in spreadsheet:");
console.log(JSON.stringify(stateCounts, null, 2));
