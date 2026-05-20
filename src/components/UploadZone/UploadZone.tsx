import { useState, useCallback, useRef } from 'react';
import {
  writeCustomers,
  writeDelistEvents,
  writeScanData,
  writeDelistImpacts,
  logUpload,
  readAllCustomers,
} from '../../lib/firebase';
import { parseCustomerCSV, parseALM, parseOnTap } from '../../lib/parsers';

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
    const allErrors: string[] = [];
    let rowsProcessed = 0;

    try {
      const raw = await file.text();

      if (fileType === 'customers') {
        const result = parseCustomerCSV(raw);
        rowsProcessed = result.rows.length;
        allErrors.push(...result.errors);
        if (result.rows.length > 0) {
          try {
            const count = await writeCustomers(result.rows);
            await logUpload('customers', file.name, count, result.errors);
          } catch (fbErr) {
            allErrors.push(`Firebase write failed: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`);
          }
        }

      } else if (fileType === 'alm') {
        const result = parseALM(raw);
        rowsProcessed = result.rows.length;
        allErrors.push(...result.errors);
        if (result.rows.length > 0) {
          try {
            // fetch all customers for cross-reference
            const customers = await readAllCustomers();
            const evtCount = await writeDelistEvents(result.rows);
            const impactCount = await writeDelistImpacts(result.rows, customers);
            await logUpload('alm', file.name, evtCount, result.errors);
            allErrors.push(`Cross-referenced ${impactCount} delist events to customer accounts.`);
          } catch (fbErr) {
            allErrors.push(`Firebase write failed: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`);
          }
        }

      } else if (fileType === 'ontap') {
        const result = parseOnTap(raw);
        rowsProcessed = result.rows.length;
        allErrors.push(...result.errors);
        if (result.rows.length > 0) {
          try {
            const count = await writeScanData(result.rows);
            await logUpload('ontap', file.name, count, result.errors);
          } catch (fbErr) {
            allErrors.push(`Firebase write failed: ${fbErr instanceof Error ? fbErr.message : String(fbErr)}`);
          }
        }
      }

    } catch (e: unknown) {
      allErrors.push(e instanceof Error ? e.message : 'Unknown error');
    }

    onParsed(fileType, rowsProcessed, allErrors);
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
