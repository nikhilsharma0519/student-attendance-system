import { useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../utils/useFetch.js';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageHeader, ProgressBar, Spinner, StatCard, TableWrap } from '../components/ui.jsx';
import { formatPercent, todayIST } from '../utils/format.js';

const STATUSES = ['Present', 'Absent', 'Leave'];
const ACTIVE = {
  Present: 'bg-green-600 text-white border-green-600',
  Absent: 'bg-red-600 text-white border-red-600',
  Leave: 'bg-amber-500 text-white border-amber-500',
};

export default function Attendance() {
  const toast = useToast();
  const meta = useFetch(() => api.meta());

  const [filters, setFilters] = useState({ className: '', section: '', date: todayIST(), subject: '' });
  const [roster, setRoster] = useState(null);      // { key, students: [...] } once "Show Student Records" is pressed
  const [marks, setMarks] = useState({});          // studentId -> status
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState('roster');      // 'roster' | 'summary'

  // summary
  const [sf, setSf] = useState({ className: '', section: '', subject: '', from: '', to: '' });
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const classes = (meta.data && meta.data.classes) || [];
  const subjects = (meta.data && meta.data.subjects) || [];
  const sectionsFor = (cls) => (classes.find((c) => c.className === cls) || { sections: [] }).sections;

  const changeFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'className' ? { section: '' } : {}) }));
    // the old table belongs to the old selection, so hide it
    setRoster(null); setMarks({}); setDirty(false);
  };

  const showRecords = async () => {
    const missing = [];
    if (!filters.className) missing.push('class');
    if (!filters.section) missing.push('section');
    if (!filters.date) missing.push('date');
    if (!filters.subject) missing.push('subject');
    if (missing.length) return toast.error(`Please select the ${missing.join(', ')}`);
    if (filters.date > todayIST()) return toast.error('Attendance cannot be marked for a future date');

    setView('roster');
    setLoadingRoster(true);
    try {
      const res = await api.roster(filters);
      setRoster({ key: { ...filters }, students: res.students });
      setMarks(Object.fromEntries(res.students.filter((s) => s.status).map((s) => [s.studentId, s.status])));
      setDirty(false);
      if (res.students.length === 0) toast.info('No students found in this class and section');
    } catch (err) {
      setRoster(null);
      toast.error(err.message);
    } finally {
      setLoadingRoster(false);
    }
  };

  const mark = (studentId, status) => { setMarks((m) => ({ ...m, [studentId]: status })); setDirty(true); };
  const markAll = (status) => { setMarks(Object.fromEntries(roster.students.map((s) => [s.studentId, status]))); setDirty(true); };

  const save = async () => {
    if (!roster || roster.students.length === 0) return toast.error('Load the student records first');
    const left = roster.students.filter((s) => !marks[s.studentId]).length;
    if (left > 0) return toast.error(`Mark attendance for every student (${left} still unmarked)`);
    setSaving(true);
    try {
      const k = roster.key;
      const res = await api.saveAttendance({
        ...k, records: roster.students.map((s) => ({ studentId: s.studentId, status: marks[s.studentId] })),
      });
      // success is shown only after the server confirmed the save; reload to show exactly what is stored
      const fresh = await api.roster(k);
      setRoster({ key: k, students: fresh.students });
      setMarks(Object.fromEntries(fresh.students.filter((s) => s.status).map((s) => [s.studentId, s.status])));
      setDirty(false);
      toast.success(`Attendance saved (${res.created} new, ${res.updated} updated, ${res.unchanged} unchanged)`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadSummary = async (params) => {
    setLoadingSummary(true); setSummaryError('');
    try { setSummary(await api.attendanceSummary(params)); }
    catch (err) { setSummary(null); setSummaryError(err.message); }
    finally { setLoadingSummary(false); }
  };

  const openSummary = () => {
    setView('summary');
    const initial = { className: filters.className, section: filters.section, subject: filters.subject, from: '', to: '' };
    setSf(initial);
    loadSummary(initial);
  };

  const counts = roster ? STATUSES.map((s) => [s, Object.values(marks).filter((v) => v === s).length]) : [];

  const select = (value, onChange, options, placeholder, id) => (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  if (meta.loading) return <LoadingBlock />;
  if (meta.error) return <ErrorBlock message={meta.error} onRetry={meta.reload} />;

  return (
    <div>
      <PageHeader title="Attendance Management" subtitle="Choose a class, section, date and subject, then mark each student" />

      <div className="card grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><label className="label" htmlFor="f-class">Select Class</label>{select(filters.className, (v) => changeFilter('className', v), classes.map((c) => c.className), 'Select class', 'f-class')}</div>
        <div><label className="label" htmlFor="f-section">Select Section</label>{select(filters.section, (v) => changeFilter('section', v), sectionsFor(filters.className), 'Select section', 'f-section')}</div>
        <div><label className="label" htmlFor="f-date">Select Date</label><input id="f-date" type="date" className="input" value={filters.date} max={todayIST()} onChange={(e) => changeFilter('date', e.target.value)} /></div>
        <div><label className="label" htmlFor="f-subject">Select Subject</label>{select(filters.subject, (v) => changeFilter('subject', v), subjects, 'Select subject', 'f-subject')}</div>

        <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-4">
          <button className="btn-primary" onClick={showRecords} disabled={loadingRoster}>{loadingRoster && <Spinner className="h-4 w-4" />} Show Student Records</button>
          <button className="btn-primary" onClick={save} disabled={saving || !roster || roster.students.length === 0}>{saving && <Spinner className="h-4 w-4" />} Save Attendance</button>
          <button className="btn-secondary" onClick={openSummary}>View Attendance Summary</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="mt-6">
          {loadingRoster ? <LoadingBlock text="Loading students..." /> : !roster ? (
            <EmptyState icon="👆" title="No student list yet" text={'Select the class, section, date and subject, then press "Show Student Records".'} />
          ) : roster.students.length === 0 ? (
            <EmptyState title="No students in this class and section" text="Add students first, or choose a different class or section." />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  <strong>{roster.key.className}-{roster.key.section}</strong> · {roster.key.subject} · {roster.key.date} · {roster.students.length} students
                  {dirty && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Unsaved changes</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {counts.map(([s, n]) => <span key={s} className="flex items-center gap-1"><Badge>{s}</Badge> {n}</span>)}
                  <button className="btn-secondary btn-sm" onClick={() => markAll('Present')}>Mark all Present</button>
                </div>
              </div>
              <TableWrap>
                <thead><tr><th className="th">Roll Number</th><th className="th">Student Name</th><th className="th">Attendance Status</th></tr></thead>
                <tbody className="divide-y divide-blue-50">
                  {roster.students.map((s) => (
                    <tr key={s.studentId} className={marks[s.studentId] ? '' : 'bg-amber-50/60'}>
                      <td className="td font-medium">{s.rollNo}</td>
                      <td className="td">{s.name}</td>
                      <td className="td">
                        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300" role="radiogroup" aria-label={`Status for ${s.name}`}>
                          {STATUSES.map((st) => (
                            <button key={st} type="button" role="radio" aria-checked={marks[s.studentId] === st} onClick={() => mark(s.studentId, st)}
                              className={`border-r border-slate-300 px-3 py-1.5 text-xs font-semibold last:border-r-0 ${marks[s.studentId] === st ? ACTIVE[st] : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
        </div>
      )}

      {view === 'summary' && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-blue-900">Attendance Summary</h2>
          <div className="card mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div><label className="label" htmlFor="s-class">Class</label>
              <select id="s-class" className="input" value={sf.className} onChange={(e) => setSf({ ...sf, className: e.target.value, section: '' })}>
                <option value="">All classes</option>{classes.map((c) => <option key={c.className}>{c.className}</option>)}
              </select></div>
            <div><label className="label" htmlFor="s-section">Section</label>
              <select id="s-section" className="input" value={sf.section} onChange={(e) => setSf({ ...sf, section: e.target.value })}>
                <option value="">All sections</option>
                {(sf.className ? sectionsFor(sf.className) : [...new Set(classes.flatMap((c) => c.sections))]).map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div><label className="label" htmlFor="s-subject">Subject</label>
              <select id="s-subject" className="input" value={sf.subject} onChange={(e) => setSf({ ...sf, subject: e.target.value })}>
                <option value="">All subjects</option>{subjects.map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div><label className="label" htmlFor="s-from">From date</label><input id="s-from" type="date" className="input" value={sf.from} max={todayIST()} onChange={(e) => setSf({ ...sf, from: e.target.value })} /></div>
            <div><label className="label" htmlFor="s-to">To date</label><input id="s-to" type="date" className="input" value={sf.to} max={todayIST()} onChange={(e) => setSf({ ...sf, to: e.target.value })} /></div>
            <div className="flex gap-3 sm:col-span-2 xl:col-span-5">
              <button className="btn-primary" onClick={() => loadSummary(sf)} disabled={loadingSummary}>{loadingSummary && <Spinner className="h-4 w-4" />} Apply Filters</button>
              <button className="btn-secondary" onClick={() => { const empty = { className: '', section: '', subject: '', from: '', to: '' }; setSf(empty); loadSummary(empty); }}>Reset</button>
            </div>
          </div>

          {loadingSummary ? <LoadingBlock /> : summaryError ? <ErrorBlock message={summaryError} /> : summary && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard icon="🧑‍🎓" label="Total Students" value={summary.totalStudents} />
                <StatCard icon="✅" label="Present Count" value={summary.present} />
                <StatCard icon="❌" label="Absent Count" value={summary.absent} />
                <StatCard icon="📝" label="Leave Count" value={summary.leave} />
                <StatCard icon="📈" label="Attendance %" value={formatPercent(summary.percentage)} hint="Present ÷ (Present + Absent); Leave excluded" />
              </div>

              {summary.total === 0 ? (
                <div className="mt-4"><EmptyState title="No attendance records match these filters" /></div>
              ) : (
                <div className="mt-6 grid gap-6 xl:grid-cols-3">
                  <section className="xl:col-span-1">
                    <h3 className="mb-2 font-semibold text-blue-900">By subject</h3>
                    <div className="card space-y-4">
                      {summary.bySubject.map((s) => (
                        <div key={s.subject}><p className="mb-1 text-sm font-medium">{s.subject} <span className="text-xs text-slate-400">({s.present}P / {s.absent}A / {s.leave}L)</span></p><ProgressBar percentage={s.percentage} /></div>
                      ))}
                    </div>
                  </section>
                  <section className="xl:col-span-2">
                    <h3 className="mb-2 font-semibold text-blue-900">By student</h3>
                    <TableWrap>
                      <thead><tr><th className="th">Roll No</th><th className="th">Name</th><th className="th">Present</th><th className="th">Absent</th><th className="th">Leave</th><th className="th min-w-[160px]">Attendance</th></tr></thead>
                      <tbody className="divide-y divide-blue-50">
                        {summary.students.map((s) => (
                          <tr key={s.studentId}><td className="td font-medium">{s.rollNo}</td><td className="td">{s.name}</td><td className="td">{s.present}</td><td className="td">{s.absent}</td><td className="td">{s.leave}</td><td className="td"><ProgressBar percentage={s.percentage} /></td></tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
