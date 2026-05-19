export interface Customer {
  account_id: string;
  venue_name: string;
  suburb: string;
  territory: string;   // state code: WA / SA / NSW / VIC / QLD / NT / TAS
  rep_name: string;
  category: string;
  address: string;
  created_at: unknown; // Firestore Timestamp
}

export interface DelistEvent {
  sku_code: string;
  product_name: string;
  category: string;
  effective_date: string; // DD/MM/YYYY or YYYY-MM-DD
  outlet_number: string;
  outlet_id: string;
  upload_date: unknown;
}

export interface DelistImpact {
  venue_name: string;
  sku_code: string;
  rep_name: string;
  territory: string;
  flagged_date: unknown;
}

export interface ScanData {
  venue_name: string;
  sku_code: string;
  units_sold: number;
  period: string;
  upload_date: unknown;
  product_description?: string;
}

export interface UploadLogEntry {
  id?: string;
  file_type: 'customers' | 'alm' | 'ontap';
  filename: string;
  rows_processed: number;
  upload_date: unknown;
  errors: string[];
}

export type FileType = 'customers' | 'alm' | 'ontap';

export interface ParseResult<T> {
  rows: T[];
  errors: string[];
}
