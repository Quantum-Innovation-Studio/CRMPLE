import type { Customer, DelistEvent, DelistImpact, ScanData, UploadLog } from './types';

// ---- Firebase initialisation ----
// IMPORTANT: fill these values from Firebase Console → Project Settings → General → Web app config
// DO NOT commit real keys — use environment variables in production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

// Lazy init — only connect when first used
let _app: ReturnType<typeof initializeApp> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (_db) return _db;
  _app = initializeApp(firebaseConfig);
  _db = getFirestore(_app);
  return _db;
}

// ---- Collections ----
export const col = {
  customers: () => collection(getDb(), 'customers'),
  delistEvents: () => collection(getDb(), 'delist_events'),
  delistImpacts: () => collection(getDb(), 'delist_impacts'),
  scanData: () => collection(getDb(), 'scan_data'),
  uploadLog: () => collection(getDb(), 'upload_log'),
};

// ---- Upload log helper ----
export async function logUpload(
  fileType: 'customers' | 'alm' | 'ontap',
  filename: string,
  rowsProcessed: number,
  errors: string[] = [],
) {
  await addDoc(col.uploadLog(), {
    file_type: fileType,
    filename,
    rows_processed: rowsProcessed,
    upload_date: Timestamp.now(),
    errors,
  });
}

// ---- Customer writes (idempotent: use account_id as doc id) ----
export async function writeCustomers(customers: Customer[]) {
  const db = getDb();
  const batch = writeBatch(db);
  let count = 0;
  for (const c of customers) {
    const ref = doc(db, 'customers', c.account_id);
    batch.set(ref, { ...c, created_at: Timestamp.now() });
    count++;
  }
  await batch.commit();
  return count;
}

// ---- Read all customers ----
export async function readAllCustomers(): Promise<Customer[]> {
  const snap = await getDocs(col.customers());
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Customer));
}

// ---- ALM / delist writes ----
export async function writeDelistEvents(events: DelistEvent[]) {
  const db = getDb();
  const batch = writeBatch(db);
  for (const e of events) {
    const id = `${e.outlet_id}_${e.sku_code}_${e.effective_date}`;
    const ref = doc(db, 'delist_events', id);
    batch.set(ref, { ...e, upload_date: Timestamp.now() });
  }
  await batch.commit();
  return events.length;
}

// ---- Scan data writes ----
export async function writeScanData(scans: ScanData[]) {
  const db = getDb();
  const batch = writeBatch(db);
  for (const s of scans) {
    const id = `${s.venue_name}_${s.sku_code}_${s.period}`.replace(/\s+/g, '_');
    const ref = doc(db, 'scan_data', id);
    batch.set(ref, { ...s, upload_date: Timestamp.now() });
  }
  await batch.commit();
  return scans.length;
}
