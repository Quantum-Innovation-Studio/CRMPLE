import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  collection, getDocs, query as fbquery, orderBy, limit,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type { ScanData } from '../types';

async function fetchScanData(): Promise<ScanData[]> {
  const db   = getDb();
  const snap = await getDocs(fbquery(collection(db, 'scan_data'), orderBy('upload_date', 'desc'), limit(10000)));
  return snap.docs.map(d => d.data() as ScanData);
}

export default function ScanVelocity() {
  const [scans, setScans]     = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setScans(await fetchScanData());
      setLoading(false);
    })();
  }, []);

  const venueData = useMemo(() => {
    const byVenue: Record<string, number> = {};
    for (const s of scans) byVenue[s.venue_name] = (byVenue[s.venue_name] ?? 0) + (s.units_sold || 0);
    return Object.entries(byVenue)
      .map(([venue, units]) => ({ venue, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 20);
  }, [scans]);

  if (loading) return <div className="p-4 text-zinc-500 animate-pulse">Loading scan velocity…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Scan Velocity</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{scans.length} scan lines · units sold per venue</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Top 20 Venues — Units Sold</h3>
        {venueData.length === 0 ? (
          <p className="text-zinc-500 text-sm">Upload OnTap scan data to see velocity.</p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={venueData} layout="vertical" margin={{ left: 120 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis type="category" dataKey="venue" tick={{ fontSize: 11, fill: '#a1a1aa' }} width={120} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
              <Bar dataKey="units" fill="#d4a373" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
