import type { Customer, DelistEvent, ScanData, ParseResult } from '../types';

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

function colIdx(headers: readonly string[], key: string): number {
  for (let i = 0; i < headers.length; i++) {
    if ((headers[i] ?? '').trim() === key) return i;
  }
  return -1;
}

function safe(fields: string[], idx: number): string {
  return idx >= 0 && idx < fields.length ? (fields[idx] ?? '') : '';
}

// ── Customer CSV parser ──────────────────────────────────────
export function parseCustomerCSV(raw: string): ParseResult<Customer> {
  const errors: string[] = [];
  const lines: string[] = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['File is empty or has no data rows'] };

  const headers: string[] = splitCsvLine(lines[0]!).map(h => (h ?? '').trim());

  const required = ['OutletID', 'Outlet Name', 'Suburb', 'Address State', 'Area Manager'];
  const missing = required.filter(w => colIdx(headers, w) === -1);
  if (missing.length) errors.push(`Missing columns: ${missing.join(', ')}`);

  const rows: Customer[] = [];
  for (let ri = 1; ri < lines.length; ri++) {
    const fields = splitCsvLine(lines[ri] as string);

    const iOutletId   = colIdx(headers, 'OutletID');
    const iOutletName = colIdx(headers, 'Outlet Name');
    const iSuburb     = colIdx(headers, 'Suburb');
    const iState       = colIdx(headers, 'Address State');
    const iManager    = colIdx(headers, 'Area Manager');
    const iAddress    = colIdx(headers, 'Address');
    const iSubgroup  = colIdx(headers, 'Subgroup Last');
    const iMajorGroup = colIdx(headers, 'Major Group Last');

    const repRaw = safe(fields, iManager);
    const rep    = repRaw.trim() === 'WA_UNALLOCATED' ? 'Unassigned' : repRaw.trim();
    const catIdx = iSubgroup >= 0 ? iSubgroup : iMajorGroup;

    rows.push({
      account_id:   safe(fields, iOutletId).trim(),
      venue_name:   safe(fields, iOutletName).trim(),
      suburb:       safe(fields, iSuburb).trim(),
      territory:    safe(fields, iState).trim().toUpperCase(),
      rep_name:     rep,
      category:     catIdx >= 0 ? safe(fields, catIdx).trim() : '',
      address:      iAddress >= 0 ? safe(fields, iAddress).trim() : '',
      created_at:   new Date(),
    });
  }
  return { rows, errors };
}

// ── helpers ─────────────────────────────────────────────────+
// ALM effective dates come as YYYYMMDD — normalise to DD/MM/YYYY
function normalizeAlmDate(raw: string): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  // e.g. "20260406" → "06/04/2026"
  if (v.length === 8 && /^\d{8}$/.test(v)) {
    const yyyy = v.slice(0, 4);
    const mm   = v.slice(4, 6);
    const dd   = v.slice(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }
  return v; // already in DD/MM/YYYY or YYYY-MM-DD — pass through
}

// ── ALM pipe-delimited parser ────────────────────────────────
export function parseALM(raw: string): ParseResult<DelistEvent> {
  const errors: string[] = [];
  const lines: string[] = raw.split(/\r?\n/).filter(l => l.trim());
  const rows: DelistEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = (lines[i] as string).split('|');
    if (parts.length < 20) continue;
    if ((parts[0] ?? '').trim() !== '5') continue;

    const skuRaw    = (parts[10] ?? '').trim().replace(/^0+/, '');
    const prodName  = (parts[11] ?? '').trim();
    if (!skuRaw || !prodName) { errors.push(`Row ${i + 1}: missing SKU or product`); continue; }

    const effectiveRaw = (parts[8] ?? '').trim();
    rows.push({
      sku_code: skuRaw,
      product_name: prodName,
      category:         (parts[6] ?? '').trim(),   // col 6 = Category_Desc
      effective_date:   normalizeAlmDate(effectiveRaw),
      outlet_number:    (parts[3] ?? '').trim(),
      outlet_id:        (parts[4] ?? '').trim().replace(/^0+/, ''),
      upload_date:   new Date(),
    });
  }
  return { rows, errors };
}

// ── OnTap pipe-delimited parser ─────────────────────────────
export function parseOnTap(raw: string): ParseResult<ScanData> {
  const errors: string[] = [];
  const lines: string[] = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['No data rows'] };

  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const firstField = ((lines[i] as string).split('|')[0] ?? '').trim();
    if (!/^\d+$/.test(firstField)) { headerIdx = i; break; }
  }

  const headers: string[] = (lines[headerIdx]!).split('|').map(h => h.trim());
  const requiredKeys = ['OTD_OutletID', 'OTD_Outlet_Name', 'Product_Code', 'Product_Description', 'Delivered_Qty_(in_Units)', 'Invoice_Date'];
  const missingCols = requiredKeys.filter(k => colIdx(headers, k) === -1);
  if (missingCols.length) errors.push(`Missing columns: ${missingCols.join(', ')}`);

  const g = (k: string): number => colIdx(headers, k);

  const rows: ScanData[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = (lines[i] as string).split('|');
    const outletId  = safe(fields, g('OTD_OutletID'));
    const venueName = safe(fields, g('OTD_Outlet_Name'));
    const sku       = safe(fields, g('Product_Code')).replace(/^0+/, '');
    const product   = safe(fields, g('Product_Description'));
    const qty       = parseInt(safe(fields, g('Delivered_Qty_(in_Units)')) || '0', 10) || 0;
    const invoiceDt = safe(fields, g('Invoice_Date'));

    if (!outletId && !venueName) continue;
    rows.push({
      venue_name: venueName || outletId,
      sku_code: sku,
      product_description: product,
      units_sold: qty,
      period: invoiceDt,
      upload_date: new Date(),
    });
  }
  return { rows, errors };
}
