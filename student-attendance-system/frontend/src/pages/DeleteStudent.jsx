import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../utils/useFetch.js';
import { ConfirmDialog, EmptyState, ErrorBlock, LoadingBlock, PageHeader, TableWrap } from '../components/ui.jsx';

export default function DeleteStudent() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const list = useFetch(() => api.listStudents({ search: debounced }), [debounced]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.deleteStudent(target.id);
      toast.success(`${target.name} was deleted`);
      setTarget(null);
      list.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Delete Student" subtitle="Removes the student and their login account">
        <input className="input max-w-xs" type="search" placeholder="Search by name or roll number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
      </PageHeader>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>What happens to related data:</strong> the login account and the student's assignment submissions (and uploaded files) are deleted.
        Past attendance records are kept for reporting, marked as belonging to a deleted student, and are left out of class summaries.
      </div>

      {list.loading && !list.data ? <LoadingBlock /> : list.error ? <ErrorBlock message={list.error} onRetry={list.reload} /> :
        list.data.students.length === 0 ? <EmptyState title="No students found" text={debounced ? 'Try a different name or roll number.' : 'There are no students to delete.'} /> : (
          <TableWrap>
            <thead><tr><th className="th">Student Name</th><th className="th">Roll No</th><th className="th">Email</th><th className="th">Class</th><th className="th">Section</th><th className="th">Action</th></tr></thead>
            <tbody className="divide-y divide-blue-50">
              {list.data.students.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/40">
                  <td className="td font-medium">{s.name}</td><td className="td">{s.rollNo}</td><td className="td">{s.email}</td><td className="td">{s.className}</td><td className="td">{s.section}</td>
                  <td className="td"><button className="btn-danger btn-sm" onClick={() => setTarget(s)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}

      <ConfirmDialog open={!!target} busy={busy} title="Delete this student?" confirmText="Yes, delete"
        message={target ? `${target.name} (${target.rollNo}) will be removed together with their login account and submissions. Attendance history is kept for reporting. This cannot be undone.` : ''}
        onConfirm={confirmDelete} onCancel={() => !busy && setTarget(null)} />
    </div>
  );
}
