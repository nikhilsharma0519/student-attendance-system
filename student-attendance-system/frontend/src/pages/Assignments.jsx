import { useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../utils/useFetch.js';
import FileDrop from '../components/FileDrop.jsx';
import { Badge, ConfirmDialog, EmptyState, ErrorBlock, Field, LoadingBlock, Modal, PageHeader, Spinner, TableWrap } from '../components/ui.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

const EMPTY = { title: '', description: '', className: '', section: '', subject: '', dueDate: '' };

export default function Assignments() {
  const toast = useToast();
  const meta = useFetch(() => api.meta());
  const list = useFetch(() => api.listAssignments());

  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [subsFor, setSubsFor] = useState(null);       // assignment whose submissions are open
  const [subs, setSubs] = useState({ loading: false, error: '', items: [] });

  const classes = (meta.data && meta.data.classes) || [];
  const subjects = (meta.data && meta.data.subjects) || [];
  const sections = (classes.find((c) => c.className === form.className) || { sections: [] }).sections;

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v, ...(k === 'className' ? { section: '' } : {}) }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Enter a title (at least 3 characters)';
    if (!form.description.trim()) e.description = 'Enter a short description';
    if (!form.className) e.className = 'Select a class';
    if (!form.section) e.section = 'Select a section';
    if (!form.subject) e.subject = 'Select a subject';
    if (!form.dueDate) e.dueDate = 'Select the due date';
    if (!file) e.file = 'Choose a PDF, JPG or PNG file';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return toast.error('Please fix the highlighted fields');

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v.trim ? v.trim() : v));
    data.append('file', file); // the file goes last
    setBusy(true);
    try {
      await api.uploadAssignment(data);
      toast.success('Assignment uploaded successfully');
      setForm(EMPTY); setFile(null); setErrors({});
      list.reload();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deleteAssignment(toDelete.id);
      toast.success('Assignment deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openSubs = async (a) => {
    setSubsFor(a);
    setSubs({ loading: true, error: '', items: [] });
    try {
      const res = await api.listSubmissions({ assignmentId: a.id });
      setSubs({ loading: false, error: '', items: res.submissions });
    } catch (err) {
      setSubs({ loading: false, error: err.message, items: [] });
    }
  };

  const err = (k) => (errors[k] ? 'input-error' : '');

  return (
    <div>
      <PageHeader title="Assignment Management" subtitle="Upload assignments for a class and section; students can view and download them" />

      <form onSubmit={submit} noValidate className="card grid gap-4 md:grid-cols-2">
        <Field label="Assignment Title" error={errors.title} htmlFor="a-title">
          <input id="a-title" className={`input ${err('title')}`} value={form.title} onChange={set('title')} maxLength={120} />
        </Field>
        <Field label="Subject" error={errors.subject} htmlFor="a-subject">
          <select id="a-subject" className={`input ${err('subject')}`} value={form.subject} onChange={set('subject')}>
            <option value="">Select subject</option>{subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Description" error={errors.description} htmlFor="a-desc">
            <textarea id="a-desc" rows={3} maxLength={1000} className={`input ${err('description')}`} value={form.description} onChange={set('description')} />
          </Field>
        </div>
        <Field label="Class" error={errors.className} htmlFor="a-class">
          <select id="a-class" className={`input ${err('className')}`} value={form.className} onChange={set('className')}>
            <option value="">Select class</option>{classes.map((c) => <option key={c.className}>{c.className}</option>)}
          </select>
        </Field>
        <Field label="Section" error={errors.section} htmlFor="a-section">
          <select id="a-section" className={`input ${err('section')}`} value={form.section} onChange={set('section')}>
            <option value="">Select section</option>{sections.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Due Date" error={errors.dueDate} htmlFor="a-due">
          <input id="a-due" type="date" className={`input ${err('dueDate')}`} value={form.dueDate} onChange={set('dueDate')} />
        </Field>
        <div>
          <label className="label" htmlFor="file-input">Upload File</label>
          <FileDrop file={file} onChange={(f) => { setFile(f); setErrors((x) => ({ ...x, file: undefined })); }} error={errors.file} maxMb={(meta.data && meta.data.maxUploadMb) || 5} />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Upload Assignment</button>
        </div>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-blue-900">All assignments {list.data && <span className="text-sm font-normal text-slate-500">({list.data.assignments.length})</span>}</h2>
      {list.loading && !list.data ? <LoadingBlock /> : list.error ? <ErrorBlock message={list.error} onRetry={list.reload} /> :
        list.data.assignments.length === 0 ? <EmptyState title="No assignments yet" text="Upload the first assignment using the form above." /> : (
          <TableWrap>
            <thead><tr><th className="th">Assignment Title</th><th className="th">Class</th><th className="th">Section</th><th className="th">Subject</th><th className="th">Due Date</th><th className="th">Uploaded Date</th><th className="th">View / Download</th><th className="th">Delete</th></tr></thead>
            <tbody className="divide-y divide-blue-50">
              {list.data.assignments.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50/40">
                  <td className="td min-w-[180px] font-medium">{a.title}<div className="text-xs font-normal text-slate-400">{a.originalName}</div></td>
                  <td className="td">{a.className}</td><td className="td">{a.section}</td><td className="td">{a.subject}</td>
                  <td className="td whitespace-nowrap">{formatDate(a.dueDate)}</td><td className="td whitespace-nowrap">{formatDate(a.uploadedDate)}</td>
                  <td className="td whitespace-nowrap">
                    <div className="flex gap-2">
                      <a className="btn-secondary btn-sm" href={api.assignmentFileUrl(a.id)} target="_blank" rel="noreferrer">View</a>
                      <a className="btn-secondary btn-sm" href={api.assignmentFileUrl(a.id, true)}>Download</a>
                      <button className="btn-secondary btn-sm" onClick={() => openSubs(a)}>Submissions</button>
                    </div>
                  </td>
                  <td className="td"><button className="btn-danger btn-sm" onClick={() => setToDelete(a)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}

      <ConfirmDialog open={!!toDelete} busy={deleting} title="Delete this assignment?" confirmText="Yes, delete"
        message={toDelete ? `"${toDelete.title}" and its file will be deleted, together with any student submissions for it. This cannot be undone.` : ''}
        onConfirm={remove} onCancel={() => !deleting && setToDelete(null)} />

      <Modal open={!!subsFor} title={subsFor ? `Submissions: ${subsFor.title}` : ''} onClose={() => setSubsFor(null)}>
        {subs.loading ? <LoadingBlock /> : subs.error ? <ErrorBlock message={subs.error} /> : subs.items.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <TableWrap>
            <thead><tr><th className="th">Roll No</th><th className="th">Student</th><th className="th">Submitted</th><th className="th">File</th></tr></thead>
            <tbody className="divide-y divide-blue-50">
              {subs.items.map((s) => (
                <tr key={s.id}>
                  <td className="td">{s.rollNo}</td><td className="td">{s.studentName}</td>
                  <td className="td">{formatDateTime(s.submittedAt)} {s.late && <Badge>Late</Badge>}</td>
                  <td className="td"><a className="btn-secondary btn-sm" href={api.submissionFileUrl(s.id)} target="_blank" rel="noreferrer">View</a></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Modal>
    </div>
  );
}
