import { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, query as fbquery, orderBy, limit,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type { DelistImpact } from '../types';

async function fetchColl<T>(name: string, orderField: string = 'venue_name', limitSize: number = 5000): Promise<T[]> {
  const db   = getDb();
  const snap = await getDocs(fbquery(collection(db, name), orderBy(orderField), limit(limitSize)));
  return snap.docs.map(d => d.data() as T);
}

export default function DelistImpact() {
  const [impacts, setImpacts] = useState<DelistImpact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setImpacts(await fetchColl<DelistImpact>('delist_impacts', 'flagged_date', 5000));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const grouped = useMemo(() => {
    const byTerritory: Record<string, { venue: string; sku: string; rep: string }[]> = {};
    for (const imp of impacts) {
      (byTerritory[imp.territory] ??= []).push({
        venue: imp.venue_name,
        sku:   imp.sku_code,
        rep:   imp.rep_name,
      });
    }
    return byTerritory;
  }, [impacts]);

  const territories    = useMemo(() => Object.keys(grouped).sort(), [grouped]);
  const totalImpacted  = impacts.length;

  if (loading) return <div className="p-4 text-zinc-500 animate-pulse">Loading delist impacts…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-red-400">⚠ Delist Impact</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {totalImpacted} impacted accounts · {territories.length} territories
        </p>
      </div>

      {territories.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
          No delist data loaded. Upload an ALM Delist Report to see flagged accounts.
        </div>
      ) : (
        territories.map(terr => {
          const entries = grouped[terr] ?? [];
          return (
            <div key={terr} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-400 mb-2">{terr} · {entries.length} impacted</h3>
              <div className="space-y-1">
                {entries.slice(0, 20).map((e, i) => (
                  <div key={`${e.venue}-${e.sku}`} className="flex items-center gap-3 text-sm py-1 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-500 w-4">{i + 1}</span>
                    <span className="text-white flex-1 truncate">{e.venue}</span>
                    <span className="text-amber-500 text-xs font-mono">{e.sku}</span>
                    <span className="text-zinc-500 text-xs">{e.rep}</span>
                  </div>
                ))}
                {entries.length > 20 && (
                  <p className="text-xs text-zinc-500 pt-1">…and {entries.length - 20} more in this territory</p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
