import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, getDocs, query as fbquery, where, limit as qlimit,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type { Customer } from '../types';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const [cust, setCust] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { nav('/accounts'); return; }
    (async () => {
      try {
        const db   = getDb();
        const snap = await getDocs(fbquery(collection(db, 'customers'), where('__name__', '==', id!), qlimit(1)));
        if (!snap.empty) setCust(snap.docs[0]!.data() as Customer);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, nav]);

  if (loading) return <div className="p-4 text-zinc-500">Loading…</div>;
  if (!cust) return <div className="p-4 text-zinc-500">Account not found.<button onClick={() => nav(-1)} className="text-amber-500 ml-2">← Back</button></div>;

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="text-xs text-zinc-500 hover:text-white">← Back to Accounts</button>
      <h2 className="text-lg font-semibold text-white">{cust.venue_name}</h2>

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Account ID', cust.account_id],
          ['Venue', cust.venue_name],
          ['Suburb', cust.suburb],
          ['Territory', cust.territory],
          ['Rep', cust.rep_name],
          ['Category', cust.category || '—'],
          ['Address', cust.address || '—'],
        ].map(([label, value]) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{label as string}</p>
            <p className="text-sm text-white mt-1">{value as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
