import { useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../utils/useFetch.js';
import FileDrop from '../components/FileDrop.jsx';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Spinner } from '../components/ui.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

function SubmitBox({ assignment, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!file) return toast.error('Choose your completed work first');
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      await api.submitWork(assignment.id, form);
      toast.success('Your work was submitted');
      setFile(null);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-blue-100 pt-4">
      <p className="mb-2 text-sm font-medium text-slate-700">{assignment.submission ? 'Replace your submission' : 'Submit your work'}</p>
      <FileDrop id={`file-${assignment.id}`} file={file} onChange={setFile} />
      <button className="btn-primary btn-sm mt-3" onClick={send} disabled={busy || !file}>{busy && <Spinner className="h-4 w-4" />} Upload submission</button>
    </div>
  );
}

export default function MyAssignments() {
  const { data, loading, error, reload } = useFetch(() => api.listAssignments());
  const [openId, setOpenId] = useState(null);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader title="My Assignments" subtitle="Assignments for your class and section" />
      {data.assignments.length === 0 ? (
        <EmptyState icon="📚" title="No assignments yet" text="When your teachers upload assignments for your class, they will appear here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.assignments.map((a) => (
            <article key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-blue-900">{a.title}</h2>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{a.subject}</p>
                </div>
                <div className="flex gap-1">
                  <Badge>{a.submissionStatus}</Badge>
                  {a.submission && a.submission.late && <Badge>Late</Badge>}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{a.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-slate-400">Uploaded</dt><dd>{formatDate(a.uploadedDate)}</dd></div>
                <div><dt className="text-xs text-slate-400">Due date</dt><dd className={a.submissionStatus === 'Overdue' ? 'font-semibold text-red-600' : ''}>{formatDate(a.dueDate)}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn-primary btn-sm" href={api.assignmentFileUrl(a.id)} target="_blank" rel="noreferrer">View</a>
                <a className="btn-secondary btn-sm" href={api.assignmentFileUrl(a.id, true)}>Download</a>
                <button className="btn-secondary btn-sm" onClick={() => setOpenId(openId === a.id ? null : a.id)}>{a.submission ? 'Change submission' : 'Submit work'}</button>
              </div>
              {a.submission && (
                <p className="mt-3 text-xs text-slate-500">
                  Submitted {formatDateTime(a.submission.submittedAt)} ·{' '}
                  <a className="font-semibold text-blue-700 underline" href={api.submissionFileUrl(a.submission.id)} target="_blank" rel="noreferrer">{a.submission.originalName}</a>
                </p>
              )}
              {openId === a.id && <SubmitBox assignment={a} onDone={() => { setOpenId(null); reload(); }} />}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
