import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import UploadZone from './components/UploadZone/UploadZone';
import Dashboard    from './views/Dashboard';
import Accounts     from './views/Accounts';
import AccountDetail from './views/AccountDetail';
import ScanVelocity from './views/ScanVelocity';
import DelistImpact from './views/DelistImpact';

const FILETYPE_LABEL: Record<string, string> = {
  customers: 'Customer List (.csv)',
  alm:       'ALM Delist Report (.txt)',
  ontap:     'OnTap Scan Data (.txt)',
};

function UploadPage() {
  const [activeFileType, setActiveFileType] = useState<'customers' | 'alm' | 'ontap'>('customers');
  const [lastUpload, setLastUpload] = useState<{ type: string; rows: number; errors: string[] } | null>(null);
  const handleParsed = (type: string, rows: number, errors: string[]) => setLastUpload({ type, rows, errors });
  return (
    <div className="space-y-2">
      {/* Upload tabs */}
      <nav className="flex border-b border-zinc-800">
        {(['customers', 'alm', 'ontap'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveFileType(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeFileType === t ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {FILETYPE_LABEL[t]}
          </button>
        ))}
      </nav>
      <UploadZone fileType={activeFileType} onParsed={handleParsed} />
      {lastUpload && (
        <div className={`rounded-lg p-4 mt-2 ${lastUpload.errors.length ? 'bg-red-950/40 border border-red-800' : 'bg-zinc-900 border border-zinc-800'}`}>
          <p className="text-sm">
            <span className="font-semibold">{FILETYPE_LABEL[lastUpload.type]}</span> ·{' '}
            <span className="text-zinc-400">{lastUpload.rows} rows processed</span>
          </p>
          {lastUpload.errors.length > 0 && (
            <ul className="mt-2 text-xs text-red-400 space-y-1">
              {lastUpload.errors.map((e, i) => <li key={i}>⚠ {e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const links = [
    { to: '/',        label: 'Dashboard',   end: true },
    { to: '/accounts', label: 'Accounts' },
    { to: '/scan-velocity', label: 'Scan Velocity' },
    { to: '/delist-impact', label: 'Delist Impact' },
    { to: '/upload',  label: 'Upload Data' },
  ];
  return (
    <aside className="w-44 shrink-0 border-r border-zinc-800 p-3 space-y-1">
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            `block px-3 py-2 rounded text-sm transition-colors ${isActive ? 'bg-zinc-800 text-amber-500 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <header className="border-b border-zinc-800 px-4 py-4">
            <h1 className="text-2xl font-bold tracking-tight">CRMPLE</h1>
            <p className="text-zinc-500 text-sm">Sales Intelligence Dashboard · OLD YOUNG'S</p>
          </header>
          <main className="p-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              <Route path="/scan-velocity" element={<ScanVelocity />} />
              <Route path="/delist-impact" element={<DelistImpact />} />
              <Route path="/upload" element={<UploadPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
