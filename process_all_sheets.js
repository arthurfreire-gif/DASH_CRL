import fs from 'fs';

function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal);
      if (currentRow.some(c => c.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.some(c => c.trim() !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
}

const p1 = parseCSV(fs.readFileSync('primeira_visita.csv', 'utf8'));
const p2 = parseCSV(fs.readFileSync('segunda_visita.csv', 'utf8'));
const infoped = parseCSV(fs.readFileSync('infoped.csv', 'utf8'));

console.log('p1 rows:', p1.length - 1);
console.log('p2 rows:', p2.length - 1);
console.log('infoped rows:', infoped.length - 1);

// Unique consultants
const notifiers = new Set();
for (let i = 1; i < p1.length; i++) notifiers.add(p1[i][9]);
for (let i = 1; i < p2.length; i++) notifiers.add(p2[i][9]);
console.log('Consultores Notificantes:', Array.from(notifiers));

// Check date formats
console.log('Sample dates p1:', p1.slice(1, 10).map(r => r[8]));
console.log('Sample dates p2:', p2.slice(1, 10).map(r => r[8]));
console.log('Sample dates infoped:', infoped.slice(1, 10).map(r => r[1]));
