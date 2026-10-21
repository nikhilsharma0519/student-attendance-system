import { useRef, useState } from 'react';
import { formatSize } from '../utils/format.js';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

// Click-or-drop upload area. The server re-checks everything; this is only for fast feedback.
export default function FileDrop({ file, onChange, maxMb = 5, error, id = 'file-input' }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');

  const pick = (f) => {
    setLocalError('');
    if (!f) return onChange(null);
    const okExt = /\.(pdf|jpe?g|png)$/i.test(f.name);
    if (!ALLOWED.includes(f.type) || !okExt) { setLocalError('Only PDF, JPG, JPEG or PNG files are allowed'); return onChange(null); }
    if (f.size > maxMb * 1024 * 1024) { setLocalError(`File is larger than ${maxMb} MB`); return onChange(null); }
    return onChange(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current.click(); } }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50'}
          ${error || localError ? 'border-red-300' : ''}`}
      >
        <span className="text-2xl" aria-hidden="true">📎</span>
        {file ? (
          <p className="mt-1 text-sm font-medium text-blue-800">{file.name} <span className="text-slate-500">({formatSize(file.size)})</span></p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Click to choose a file or drag it here<br /><span className="text-xs text-slate-400">PDF, JPG, JPEG or PNG, up to {maxMb} MB</span></p>
        )}
        <input ref={inputRef} id={id} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden"
          onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {(localError || error) && <p className="field-error">{localError || error}</p>}
    </div>
  );
}
