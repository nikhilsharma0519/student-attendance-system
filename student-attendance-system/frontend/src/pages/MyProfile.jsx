import { api } from '../services/api.js';
import useFetch from '../utils/useFetch.js';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/ui.jsx';

export default function MyProfile() {
  const { data, loading, error, reload } = useFetch(() => api.myProfile());
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const s = data.student;
  const rows = [['Student Name', s.name], ['Roll Number', s.rollNo], ['Email', s.email], ['Class', s.className], ['Section', s.section]];
  return (
    <div>
      <PageHeader title="My Profile" />
      <div className="card max-w-2xl">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-700 text-2xl font-bold text-white">{s.name.charAt(0)}</div>
          <div><p className="text-lg font-bold text-blue-900">{s.name}</p><p className="text-sm text-slate-500">{s.className}-{s.section} · {s.rollNo}</p></div>
        </div>
        <dl className="divide-y divide-blue-50">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-4 py-3 text-sm"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 font-medium">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Your roll number, class and section can only be changed by the administrator.</p>
      </div>
    </div>
  );
}
