import { useState, useMemo } from 'react';
import type { Customer } from '../../types';

interface AccountTableProps {
  customers: Customer[];
  onRowClick?: (c: Customer) => void;
}

type SortKey = 'venue_name' | 'territory' | 'rep_name' | 'category' | 'suburb';
type SortDir = 'asc' | 'desc';

export default function AccountTable({ customers, onRowClick }: AccountTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('venue_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const territories = useMemo(
    () => [...new Set(customers.map(c => c.territory))].sort(),
    [customers],
  );

  // Collect reps only from customer rows that pass the territory filter
  const reps = useMemo(() => {
    const base = territoryFilter === 'all'
      ? customers
      : customers.filter(c => c.territory === territoryFilter);
    return [...new Set(base.map(c => c.rep_name))].sort();
  }, [customers, territoryFilter]);

  const filtered = useMemo(() => {
    let rows = [...customers];
    if (territoryFilter !== 'all') rows = rows.filter(c => c.territory === territoryFilter);
    if (repFilter !== 'all') rows = rows.filter(c => c.rep_name === repFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(c =>
        c.venue_name.toLowerCase().includes(q) ||
        c.suburb.toLowerCase().includes(q) ||
        c.account_id.includes(q),
      );
    }
    rows.sort((a, b) => {
      const aV = a[sortKey] ?? '';
      const bV = b[sortKey] ?? '';
      return sortDir === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
    });
    return rows;
  }, [customers, territoryFilter, repFilter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (!customers.length) {
    return (
      <div className="p-8 text-center text-zinc-500">
        No customer data loaded yet. Upload a Customer List CSV to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-zinc-900 rounded-lg">
        <input
          type="text"
          placeholder="Search venue, suburb, OutletID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-1.5 rounded bg-zinc-800 text-sm text-white placeholder-zinc-500"
        />
        <select
          value={territoryFilter}
          onChange={e => { setTerritoryFilter(e.target.value); setRepFilter('all'); }}
          className="px-2 py-1.5 rounded bg-zinc-800 text-sm"
        >
          <option value="all">All Territories</option>
          {territories.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={repFilter}
          onChange={e => setRepFilter(e.target.value)}
          className="px-2 py-1.5 rounded bg-zinc-800 text-sm"
        >
          <option value="all">All Reps</option>
          {reps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-zinc-500 ml-auto">{filtered.length} accounts</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              {(['OutletID', 'venue_name', 'territory', 'rep_name', 'category', 'suburb'] as SortKey[]).map(k => (
                <th
                  key={k}
                  onClick={() => toggleSort(k)}
                  className="px-3 py-2 text-left cursor-pointer hover:text-white whitespace-nowrap"
                >
                  {k === 'venue_name' ? 'Venue' : k.replace('_', ' ')}
                  {sortKey === k && <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((c) => (
              <tr
                key={c.account_id}
                onClick={() => onRowClick?.(c)}
                className="hover:bg-zinc-800/60 cursor-pointer"
              >
                <td className="px-3 py-2 font-mono text-xs text-amber-500">{c.account_id}</td>
                <td className="px-3 py-2">{c.venue_name}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">{c.territory}</span>
                </td>
                <td className="px-3 py-2 text-zinc-300">{c.rep_name}</td>
                <td className="px-3 py-2 text-zinc-500">{c.category}</td>
                <td className="px-3 py-2 text-zinc-500">{c.suburb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
