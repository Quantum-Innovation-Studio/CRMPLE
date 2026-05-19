import { useState, useCallback } from 'react';
import UploadZone from './components/UploadZone/UploadZone';

const FILETYPE_LABEL: Record<string, string> = {
  customers: 'Customer List (.csv)',
  alm: 'ALM Delist Report (.txt)',
  ontap: 'OnTap Scan Data (.txt)',
};

export default function App() {
  const [activeFileType, setActiveFileType] = useState<'customers' | 'alm' | 'ontap'>('customers');
  const [lastUpload, setLastUpload] = useState<{ type: string; rows: number; errors: string[] } | null>(null);

  const handleParsed = useCallback((type: string, rows: number, errors: string[]) => {
    setLastUpload({ type, rows, errors });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <h1 className="text-2xl font-bold tracking-tight">CRMPLE</h1>
        <p className="text-zinc-500 text-sm">Sales Intelligence Dashboard · OLD YOUNG'S</p>
      </header>

      {/* Upload tabs */}
      <nav className="flex border-b border-zinc-800">
        {(['customers', 'alm', 'ontap'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveFileType(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeFileType === t
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {FILETYPE_LABEL[t]}
          </button>
        ))}
      </nav>

      {/* Upload zone */}
      <main className="p-4">
        <UploadZone fileType={activeFileType} onParsed={handleParsed} />

        {lastUpload && (
          <div className={`mt-4 rounded-lg p-4 ${lastUpload.errors.length ? 'bg-red-950/40 border border-red-800' : 'bg-zinc-900 border border-zinc-800'}`}>
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
      </main>
    </div>
  );
}
