import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type { Customer } from '../types';
import AccountTable from '../components/AccountTable/AccountTable';

export default function Accounts() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const db   = getDb();
        const snap = await getDocs(query(collection(db, 'customers'), orderBy('venue_name'), limit(5000)));
        setCustomers(snap.docs.map(d => d.data() as Customer));
      } catch (e) {
        console.error('fetch customers:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRowClick = (_c: Customer) => { /* optional: navigate to detail */ };

  if (loading) return <div className="p-4 text-zinc-500">Loading accounts…</div>;
  if (!customers.length) {
    return (
      <div className="p-8 text-center text-zinc-500">
        No customer data loaded yet. Upload a Customer List CSV to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-white">Account Table</h2>
      <p className="text-xs text-zinc-500">{customers.length} accounts — sortable · searchable · filterable</p>
      <AccountTable customers={customers} onRowClick={onRowClick} />
    </div>
  );
}
