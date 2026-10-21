import { useState } from 'react';
import { api } from '../services/api.js';
import useFetch from '../utils/useFetch.js';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageHeader, ProgressBar, StatCard, TableWrap } from '../components/ui.jsx';
import { formatDate, formatPercent, todayIST } from '../utils/format.js';

const TABS = [
  { id: 'today', label: "Today's Attendance" },
  { id: 'subjects', label: 'Subject-Wise Attendance' },
  { id: 'all', label: 'All Attendance' },
];

function Today() {
  const { data, loading, error, reload } = useFetch(() => api.myToday());
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (data.records.length === 0) return <EmptyState icon="🗓️" title="No attendance record found for today." text={`Date: ${formatDate(data.date)}`} />;
  return (
    <TableWrap>
      <thead><tr><th className="th">Date</th><th className="th">Subject</th><th className="th">Attendance Status</th></tr></thead>
      <tbody className="divide-y divide-blue-50">
        {data.records.map((r) => <tr key={r.id}><td className="td">{formatDate(r.date)}</td><td className="td">{r.subject}</td><td className="td"><Badge>{r.status}</Badge></td></tr>)}
      </tbody>
    </TableWrap>
  );
}

function Subjects() {
  const { data, loading, error, reload } = useFetch(() => api.mySubjects());
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  return (
    <div>
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <strong>How the percentage is calculated:</strong> Present ÷ (Present + Absent) × 100.{' '}
        {data.leaveCountsAsEligible ? 'Leave is counted as a class.' : 'Classes marked Leave are not counted as classes.'}
      </div>
      <TableWrap>
        <thead><tr><th className="th">Subject Name</th><th className="th">Total Classes Recorded</th><th className="th">Present</th><th className="th">Absent</th><th className="th">Marked Leave</th><th className="th min-w-[220px]">Attendance Percentage</th></tr></thead>
        <tbody className="divide-y divide-blue-50">
          {data.subjects.map((s) => (
            <tr key={s.subject}>
              <td className="td font-medium">{s.subject}</td><td className="td">{s.total}</td><td className="td">{s.present}</td><td className="td">{s.absent}</td><td className="td">{s.leave}</td>
              <td className="td"><ProgressBar percentage={s.percentage} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

function AllAttendance() {
  const meta = useFetch(() => api.meta());
  const [filters, setFilters] = useState({ subject: '', from: '', to: '' });
  const { data, loading, error, reload } = useFetch(() => api.myAttendance(filters), [filters.subject, filters.from, filters.to]);
  const invalidRange = filters.from && filters.to && filters.from > filters.to;
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="card mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><label className="label" htmlFor="m-subject">Subject</label>
          <select id="m-subject" className="input" value={filters.subject} onChange={set('subject')}>
            <option value="">All subjects</option>{((meta.data && meta.data.subjects) || []).map((s) => <option key={s}>{s}</option>)}
          </select></div>
        <div><label className="label" htmlFor="m-from">Start date</label><input id="m-from" type="date" className="input" max={todayIST()} value={filters.from} onChange={set('from')} /></div>
        <div><label className="label" htmlFor="m-to">End date</label><input id="m-to" type="date" className="input" max={todayIST()} value={filters.to} onChange={set('to')} /></div>
        <div className="flex items-end"><button className="btn-secondary" onClick={() => setFilters({ subject: '', from: '', to: '' })}>Clear filters</button></div>
        {invalidRange && <p className="field-error sm:col-span-2 xl:col-span-4">Start date must not be after the end date.</p>}
      </div>

      {invalidRange ? null : loading && !data ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard icon="📈" label="Overall Attendance" value={formatPercent(data.summary.percentage)} />
            <StatCard icon="🗓️" label="Total Classes Recorded" value={data.summary.total} />
            <StatCard icon="✅" label="Classes Attended" value={data.summary.present} />
          </div>
          {data.records.length === 0 ? <EmptyState title="No attendance records found" text="Try changing the subject or the date range." /> : (
            <TableWrap>
              <thead><tr><th className="th">Date</th><th className="th">Subject</th><th className="th">Attendance Status</th></tr></thead>
              <tbody className="divide-y divide-blue-50">
                {data.records.map((r) => <tr key={r.id}><td className="td">{formatDate(r.date)}</td><td className="td">{r.subject}</td><td className="td"><Badge>{r.status}</Badge></td></tr>)}
              </tbody>
            </TableWrap>
          )}
        </>
      )}
    </div>
  );
}

export default function MyAttendance() {
  const [tab, setTab] = useState('today');
  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Your own attendance records" />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'btn-primary' : 'btn-secondary'}>{t.label}</button>
        ))}
      </div>
      {tab === 'today' && <Today />}
      {tab === 'subjects' && <Subjects />}
      {tab === 'all' && <AllAttendance />}
    </div>
  );
}
