import { useState, useCallback, useRef } from 'react';
import { writeCustomers, logUpload } from '../../lib/firebase';
import { parseCustomerCSV } from '../../lib/parsers';

interface UploadZoneProps {
  fileType: 'customers' | 'alm' | 'ontap';
  onParsed: (type: string, rows: number, errors: string[]) => void;
}

const ACCEPT: Record<string, string> = {
  customers: '.csv',
  alm: '.txt',
  ontap: '.txt',
};
const LABEL: Record<string, string> = {
  customers: 'Customer List',
  alm: 'ALM Delist Report',
  ontap: 'OnTap Scan Data',
};

export default function UploadZone({ fileType, onParsed }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setFileName(file.name);
    try {
      const raw = await file.text();
      if (fileType !== 'customers') {
        onParsed(fileType, 0, ['Parser not yet implemented for this file type.']);
        setBusy(false);
        return;
      }
      const result = parseCustomerCSV(raw);
      // Firebase write — will work once env vars are set
      try {
        const count = await writeCustomers(result.rows);
        await logUpload('customers', file.name, count, result.errors);
      } catch (fbErr) {
        result.errors.push(`Firebase write failed: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`);
      }
      onParsed('customers', result.rows.length, result.errors);
    } catch (e: unknown) {
      onParsed(fileType, 0, [e instanceof Error ? e.message : 'Unknown error']);
    }
    setBusy(false);
  }, [fileType, onParsed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all select-none
        ${dragging ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'}
        ${busy ? 'opacity-50' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[fileType]}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <div className="text-4xl mb-3">📁</div>
      <p className="font-medium">
        {busy ? 'Processing…' : fileName || `Drop your ${LABEL[fileType]} here`}
      </p>
      <p className="text-zinc-500 text-sm mt-1">
        {busy ? '' : `or click to browse · accepts ${ACCEPT[fileType]}`}
      </p>
    </div>
  );
}
