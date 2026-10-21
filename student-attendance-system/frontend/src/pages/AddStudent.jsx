import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../utils/useFetch.js';
import { EmptyState, ErrorBlock, Field, LoadingBlock, PageHeader, Spinner, TableWrap } from '../components/ui.jsx';

const EMPTY = { name: '', rollNo: '', email: '', className: '', section: '' };

function validate(f) {
  const e = {};
  if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(f.name.trim())) e.name = 'Enter the full name (letters only, 2-60 characters)';
  if (!/^[A-Za-z0-9-]{2,20}$/.test(f.rollNo.trim())) e.rollNo = 'Roll number must be 2-20 letters or numbers';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (!/^[A-Za-z0-9 ]{1,20}$/.test(f.className.trim())) e.className = 'Enter the class, for example CSE';
  if (!/^[A-Za-z0-9]{1,5}$/.test(f.section.trim())) e.section = 'Enter the section, for example A';
  return e;
}

export default function AddStudent() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null); // shows the one-time temporary password
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const meta = useFetch(() => api.meta());
  const list = useFetch(() => api.listStudents({ search: debounced }), [debounced]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return toast.error('Please fix the highlighted fields');
    setBusy(true);
    try {
      const res = await api.addStudent(form);
      toast.success(`${res.student.name} was added successfully`);
      setCreated({ name: res.student.name, email: res.student.email, rollNo: res.student.rollNo, password: res.temporaryPassword });
      setForm(EMPTY);
      list.reload();
      meta.reload();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const classes = (meta.data && meta.data.classes) || [];
  const sectionHints = [...new Set(classes.flatMap((c) => c.sections))];

  return (
    <div>
      <PageHeader title="Add Student" subtitle="Register a new student. A login account is created automatically." />

      <form onSubmit={submit} noValidate className="card grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Student Name" error={errors.name} htmlFor="name">
          <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} placeholder="e.g. Rahul Sharma" />
        </Field>
        <Field label="Roll Number" error={errors.rollNo} htmlFor="rollNo">
          <input id="rollNo" className={`input ${errors.rollNo ? 'input-error' : ''}`} value={form.rollNo} onChange={set('rollNo')} placeholder="e.g. CSE109" />
        </Field>
        <Field label="Email" error={errors.email} htmlFor="email">
          <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="name@example.com" />
        </Field>
        <Field label="Class" error={errors.className} htmlFor="className">
          <input id="className" list="class-hints" className={`input ${errors.className ? 'input-error' : ''}`} value={form.className} onChange={set('className')} placeholder="e.g. CSE" />
          <datalist id="class-hints">{classes.map((c) => <option key={c.className} value={c.className} />)}</datalist>
        </Field>
        <Field label="Section" error={errors.section} htmlFor="section">
          <input id="section" list="section-hints" className={`input ${errors.section ? 'input-error' : ''}`} value={form.section} onChange={set('section')} placeholder="e.g. A" />
          <datalist id="section-hints">{sectionHints.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <div className="flex items-end gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Add Student</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setForm(EMPTY); setErrors({}); }}>Clear Form</button>
        </div>
      </form>

      {created && (
        <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900" role="status">
          <p className="font-semibold">Login created for {created.name} ({created.rollNo})</p>
          <p className="mt-1">Username: <code className="rounded bg-white px-1">{created.email}</code> or <code className="rounded bg-white px-1">{created.rollNo.toLowerCase()}</code></p>
          <p>Temporary password: <code className="rounded bg-white px-1 font-bold">{created.password}</code></p>
          <p className="mt-1 text-xs text-green-700">Copy it now - for security it is not shown again and only a hash is stored.</p>
          <button className="btn-secondary btn-sm mt-2" onClick={() => setCreated(null)}>Dismiss</button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-blue-900">Registered students {list.data && <span className="text-sm font-normal text-slate-500">({list.data.students.length})</span>}</h2>
        <input className="input max-w-xs" type="search" placeholder="Search by name or roll number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
      </div>
      <div className="mt-3">
        {list.loading && !list.data ? <LoadingBlock /> : list.error ? <ErrorBlock message={list.error} onRetry={list.reload} /> :
          list.data.students.length === 0 ? <EmptyState title="No students found" text={debounced ? 'Try a different name or roll number.' : 'Add the first student using the form above.'} /> : (
            <TableWrap>
              <thead><tr><th className="th">Roll No</th><th className="th">Name</th><th className="th">Email</th><th className="th">Class</th><th className="th">Section</th></tr></thead>
              <tbody className="divide-y divide-blue-50">
                {list.data.students.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/40"><td className="td font-medium">{s.rollNo}</td><td className="td">{s.name}</td><td className="td">{s.email}</td><td className="td">{s.className}</td><td className="td">{s.section}</td></tr>
                ))}
              </tbody>
            </TableWrap>
          )}
      </div>
    </div>
  );
}
