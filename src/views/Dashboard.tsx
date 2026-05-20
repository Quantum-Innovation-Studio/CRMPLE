import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  collection, getDocs, query as fbquery, orderBy, limit,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type { Customer, ScanData, DelistEvent } from '../types';

// ── helpers ───────────────────────────────────────────────
function gb<T>(arr: T[], fn: (v: T) => string): Record<string, T[]> {
  return arr.reduce((acc, v) => {
    const k = fn(v); (acc[k] ??= []).push(v); return acc;
  }, {} as Record<string, T[]>);
}

function sum(nums: number[]): number { return nums.reduce((a, b) => a + b, 0); }

function monthKey(p: string): string {
  const m = p.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]!}-${m[2]!.padStart(2, '0')}`;  // YYYY-MM
  return p.slice(0, 7);
}

// ── Firestore fetch ───────────────────────────────────────
async function fetchColl<T>(
  name: string,
  orderField: string = 'venue_name',
  limitSize: number = 5000,
): Promise<T[]> {
  const db   = getDb();
  const snap = await getDocs(fbquery(collection(db, name), orderBy(orderField), limit(limitSize)));
  return snap.docs.map(d => d.data() as T);
}

// ── Component ─────────────────────────────────────────────
export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [scans, setScans]         = useState<ScanData[]>([]);
  const [delists, setDelists]     = useState<DelistEvent[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, s, d] = await Promise.all([
          fetchColl<Customer>('customers'),
          fetchColl<ScanData>('scan_data', 'upload_date', 10000),
          fetchColl<DelistEvent>('delist_events', 'upload_date', 1000),
        ]);
        setCustomers(c);
        setScans(s);
        setDelists(d);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived ────────────────────────────────────────────
  const territories = useMemo(
    () => [...new Set(customers.map(c => c.territory))].sort(),
    [customers],
  );
  const reps = useMemo(
    () => [...new Set(customers.map(c => c.rep_name))].sort(),
    [customers],
  );
  const totalAccounts  = customers.length;
  const totalScanLines = scans.length;
  const totalDelists   = delists.length;

  const monthlyData = useMemo(() => {
    const byPeriod = gb(scans, s => monthKey(s.period));
    return Object.entries(byPeriod)
      .map(([period, rows]) => ({ period, units: sum(rows.map(r => r.units_sold)) }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-12);
  }, [scans]);

  const topVenues = useMemo(() => {
    const byVenue = gb(scans, s => s.venue_name);
    return Object.entries(byVenue)
      .map(([name, rows]) => ({ name, units: sum(rows.map(r => r.units_sold)) }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [scans]);

  // ── Render ─────────────────────────────────────────────
  if (loading) return <div className="p-4 text-zinc-500 animate-pulse">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Sales Intelligence Dashboard</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {totalAccounts} accounts · {territories.length} territories · {reps.length} reps
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Accounts',   value: totalAccounts,  sub: `${territories.length} states/territories` },
          { label: 'Scan Lines', value: totalScanLines, sub: 'OnTap rows loaded' },
          { label: 'Delist Flags', value: totalDelists,  sub: 'ALM events loaded' },
          { label: 'Latest Upload', value: totalScanLines > 0 ? 'Recent' : '—', sub: 'in-scope data' },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{k.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{k.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly Scan Volume */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Monthly Scan Volume</h3>
        {monthlyData.length === 0 ? (
          <p className="text-zinc-500 text-sm">Upload OnTap data to see volume trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#71717a' }}
                tickFormatter={v => (v as string).slice(0, 7)} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                labelFormatter={v => (v as string).slice(0, 7)}
              />
              <Bar dataKey="units" fill="#d4a373" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Venues */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Top Venues by Scan Volume</h3>
        {topVenues.length === 0 ? (
          <p className="text-zinc-500 text-sm">No scan data yet.</p>
        ) : (
          <div className="space-y-2">
            {topVenues.map((v, idx) => (
              <div key={v.name} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-4 text-right">{idx + 1}</span>
                <span className="text-sm text-white flex-1 truncate" title={v.name}>{v.name}</span>
                <span className="text-sm font-mono">{v.units.toLocaleString()} units</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
