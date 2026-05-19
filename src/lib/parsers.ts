import type { Customer, DelistEvent, ScanData, ParseResult } from '../types';

// ── Customer CSV parser ──────────────────────────────────────
export function parseCustomerCSV(raw: string): ParseResult<Customer> {
  const errors: string[] = [];
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['File is empty or has no data rows'] };

  const headers = splitCsvLine(lines[0]);
  const col: Record<string, number> = {};
  const wanted = ['OutletID','Outlet Name','Suburb','Address State','Area Manager','Address','Major Group Last','Subgroup Last'];
  for (const h of headers) col[h.trim()] = headers.indexOf(h);

  const missing = wanted.filter(w => col[w] === undefined && w !== 'Address' && w !== 'Major Group Last' && w !== 'Subgroup Last');
  if (missing.length) errors.push(`Missing columns: ${missing.join(', ')}`);

  const rows: Customer[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    if (fields.length < headers.length) { errors.push(`Row ${i+1}: fewer fields than header`); continue; }
    const rep = (fields[col['Area Manager']] || '').trim();
    rows.push({
      account_id:    (fields[col['OutletID']] || '').trim(),
      venue_name:    (fields[col['Outlet Name']] || '').trim(),
      suburb:        (fields[col['Suburb']] || '').trim(),
      territory:     (fields[col['Address State']] || '').trim().toUpperCase(),
      rep_name:      rep && rep !== 'WA_UNALLOCATED' ? rep : 'Unassigned',
      category:      (fields[col['Subgroup Last']] || fields[col['Major Group Last']] || '').trim(),
      address:       (fields[col['Address']] || '').trim(),
      created_at:    new Date(),
    });
  }
  return { rows, errors };
}

// ── ALM pipe-delimited parser ────────────────────────────────
export function parseALM(raw: string): ParseResult<DelistEvent> {
  const errors: string[] = [];
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const rows: DelistEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('|');
    const recType = parts[0]?.trim();
    if (recType !== '5') continue;          // skip header/meta rows
    if (parts.length < 20) { errors.push(`Row ${i+1}: too few columns`); continue; }

    const outletId   = parts[4]?.trim() || '';   // WH_OutletID
    const outletNum  = parts[3]?.trim() || '';   // WH_Customer_Number
    const sku        = parts[10].trim().replace(/^0+/, ''); // strip leading zeros from Product_Code
    const prodName   = parts[11].trim();
    const effDate    = parts[8]?.trim() || '';   // effective_from

    if (!sku || !prodName) { errors.push(`Row ${i+1}: missing SKU or product`); continue; }

    rows.push({
      sku_code: sku,
      product_name: prodName,
      category: '', // ALM pipe doesn't include category desc — leave blank
      effective_date: effDate,
      outlet_number: outletNum,
      outlet_id: outletId,
      upload_date: new Date(),
    });
  }
  return { rows, errors };
}

// ── OnTap pipe-delimited parser ─────────────────────────────
export function parseOnTap(raw: string): ParseResult<ScanData> {
  const errors: string[] = [];
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['No data rows'] };

  // Detect header row — first row that looks like column names (non-numeric first field)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (!/^\d+$/.test(lines[i].split('|')[0]?.trim() || '')) { headerIdx = i; break; }
  }

  const headers = lines[headerIdx].split('|').map(h => h.trim());
  const col: Record<string, number> = {};
  for (const h of headers) col[h] = headers.indexOf(h);

  const missing: string[] = [];
  for (const k of ['OTD_OutletID','OTD_Outlet_Name','Product_Code','Product_Description','Delivered_Qty_(in_Units)','Invoice_Date']) {
    if (col[k] === undefined) missing.push(k);
  }
  if (missing.length) errors.push(`Missing columns: ${missing.join(', ')}`);

  const rows: ScanData[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = lines[i].split('|');
    const outletId   = (fields[col['OTD_OutletID']] || '').trim();
    const venueName  = (fields[col['OTD_Outlet_Name']] || '').trim();
    const sku        = (fields[col['Product_Code']] || '').trim().replace(/^0+/, '');
    const product    = (fields[col['Product_Description']] || '').trim();
    const qty        = parseInt((fields[col['Delivered_Qty_(in_Units)']] || '0').trim(), 10) || 0;
    const invoiceDt  = (fields[col['Invoice_Date']] || '').trim();

    if (!outletId && !venueName) continue;
    rows.push({ venue_name: venueName || outletId, sku_code: sku, product_description: product, units_sold: qty, period: invoiceDt, upload_date: new Date() });
  }
  return { rows, errors };
}

// ── helpers ─────────────────────────────────────────────────
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}
