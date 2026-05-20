import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { Customer, DelistEvent, ScanData, DelistImpact } from '../types';

// ---- Firebase config — filled from env at build time ----
import.meta.env.VITE_FIREBASE_API_KEY;
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let _app: ReturnType<typeof initializeApp> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;

export function getDb() {
  if (_db) return _db;
  _app = initializeApp(firebaseConfig);
  _db = getFirestore(_app);
  return _db;
}

// ---- Collections ----
const col = {
  customers:     () => collection(getDb(), 'customers'),
  delistEvents:  () => collection(getDb(), 'delist_events'),
  delistImpacts: () => collection(getDb(), 'delist_impacts'),
  scanData:      () => collection(getDb(), 'scan_data'),
  uploadLog:     () => collection(getDb(), 'upload_log'),
};

// ---- Upload log ----
export async function logUpload(
  fileType: 'customers' | 'alm' | 'ontap',
  filename: string,
  rowsProcessed: number,
  errors: string[] = [],
) {
  await addDoc(col.uploadLog(), { file_type: fileType, filename, rows_processed: rowsProcessed, upload_date: Timestamp.now(), errors });
}

// ---- Idempotent customer writes (doc id = account_id) ----
export async function writeCustomers(customers: Customer[]) {
  const db = getDb();
  const batch = writeBatch(db);
  for (const c of customers) {
    batch.set(doc(db, `customers/${c.account_id}`), { ...c, created_at: Timestamp.now() });
  }
  await batch.commit();
  return customers.length;
}

// ---- Read all customers ----
export async function readAllCustomers(): Promise<Customer[]> {
  const snap = await getDocs(col.customers());
  return snap.docs.map(d => d.data() as unknown as Customer);
}

// ---- ALM delist events ----
export async function writeDelistEvents(events: DelistEvent[]) {
  const db = getDb();
  const batch = writeBatch(db);
  for (const e of events) {
    const id = `${e.outlet_id}_${e.sku_code}_${e.effective_date}`;
    batch.set(doc(db, `delist_events/${id}`), { ...e, upload_date: Timestamp.now() });
  }
  await batch.commit();
  return events.length;
}

// ---- Scan data ----
export async function writeScanData(scans: ScanData[]) {
  const db = getDb();
  const batch = writeBatch(db);
  for (const s of scans) {
    const id = `${s.venue_name}_${s.sku_code}_${s.period}`.replace(/\s+/g, '_');
    batch.set(doc(db, `scan_data/${id}`), { ...s, upload_date: Timestamp.now() });
  }
  await batch.commit();
  return scans.length;
}

// ---- Delist impacts (cross-reference) ----
function buildImpactId(venueName: string, sku: string): string {
  return `${venueName}_${sku}`.replace(/\s+/g, '_');
}

export async function writeDelistImpacts(
  events: DelistEvent[],
  customers: Customer[],
): Promise<number> {
  const db = getDb();
  const batch = writeBatch(db);
  const custMap = new Map<string, Customer>();
  for (const c of customers) custMap.set(c.account_id, c);

  let count = 0;
  for (const e of events) {
    const cust = custMap.get(e.outlet_id);
    if (!cust) continue;
    const id = buildImpactId(cust.venue_name, e.sku_code);
    batch.set(doc(db, `delist_impacts/${id}`), {
      venue_name: cust.venue_name,
      sku_code:   e.sku_code,
      rep_name:   cust.rep_name,
      territory:  cust.territory,
      flagged_date: Timestamp.now(),
    } as DelistImpact);
    count++;
  }
  await batch.commit();
  return count;
}

export async function readAllDelistImpacts(): Promise<DelistImpact[]> {
  const snap = await getDocs(col.delistImpacts());
  return snap.docs.map(d => d.data() as unknown as DelistImpact);
}
