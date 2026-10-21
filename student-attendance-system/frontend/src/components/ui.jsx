// Small shared UI pieces.
import { useEffect } from 'react';

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
    </svg>
  );
}

export function LoadingBlock({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-blue-700">
      <Spinner className="h-6 w-6" /> <span className="text-sm">{text}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && <button className="btn-secondary btn-sm mt-3" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden="true">{icon}</div>
      <p className="mt-2 font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, hint }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl" aria-hidden="true">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="truncate text-2xl font-bold text-blue-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

const BADGES = {
  Present: 'bg-green-100 text-green-800 ring-green-200',
  Absent: 'bg-red-100 text-red-800 ring-red-200',
  Leave: 'bg-amber-100 text-amber-800 ring-amber-200',
  Pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  Overdue: 'bg-red-100 text-red-800 ring-red-200',
  Submitted: 'bg-green-100 text-green-800 ring-green-200',
  Late: 'bg-orange-100 text-orange-800 ring-orange-200',
};
export function Badge({ children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGES[children] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
      {children}
    </span>
  );
}

// percentage may be null ("No records")
export function ProgressBar({ percentage }) {
  if (percentage === null || percentage === undefined) return <span className="text-sm text-slate-400">No records</span>;
  const color = percentage >= 75 ? 'bg-green-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-sm font-semibold text-slate-700">{percentage}%</span>
    </div>
  );
}

// Responsive table: scrolls sideways on small screens
export function TableWrap({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-blue-100">{children}</table>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmText = 'Confirm', busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />} {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-blue-900">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Field wrapper: label + input + error text
export function Field({ label, error, children, htmlFor }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
