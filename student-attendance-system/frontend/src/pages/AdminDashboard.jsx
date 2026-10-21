import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import useFetch from '../utils/useFetch.js';
import { Badge, EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatCard, TableWrap } from '../components/ui.jsx';
import { formatDate, formatPercent } from '../utils/format.js';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch(() => api.adminDashboard());

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Live numbers calculated from the saved JSON records" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🧑‍🎓" label="Total Students" value={data.totalStudents} />
        <StatCard icon="🏫" label="Total Classes" value={data.totalClasses} hint={`${data.totalClassSections} class sections`} />
        <StatCard icon="🗓️" label="Attendance Records" value={data.totalAttendanceRecords.toLocaleString('en-IN')} />
        <StatCard icon="📄" label="Total Assignments" value={data.totalAssignments} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/admin/add-student" className="card block transition hover:border-blue-400 hover:shadow-md">
          <p className="text-2xl">➕</p><p className="mt-1 font-semibold text-blue-900">Add Student</p><p className="text-sm text-slate-500">Register a new student and login</p>
        </Link>
        <Link to="/admin/attendance" className="card block transition hover:border-blue-400 hover:shadow-md">
          <p className="text-2xl">✅</p><p className="mt-1 font-semibold text-blue-900">Mark Attendance</p><p className="text-sm text-slate-500">Take or edit a class roll call</p>
        </Link>
        <Link to="/admin/assignments" className="card block transition hover:border-blue-400 hover:shadow-md">
          <p className="text-2xl">📄</p><p className="mt-1 font-semibold text-blue-900">Assignments</p><p className="text-sm text-slate-500">Upload and manage assignments</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-blue-900">Recent attendance activity</h2>
          {data.recentAttendance.length === 0 ? (
            <EmptyState title="No attendance recorded yet" text="Use the Attendance page to take the first roll call." />
          ) : (
            <TableWrap>
              <thead><tr><th className="th">Date</th><th className="th">Class</th><th className="th">Subject</th><th className="th">Present</th><th className="th">%</th></tr></thead>
              <tbody className="divide-y divide-blue-50">
                {data.recentAttendance.map((r) => (
                  <tr key={`${r.className}${r.section}${r.date}${r.subject}`}>
                    <td className="td">{formatDate(r.date)}</td>
                    <td className="td">{r.className}-{r.section}</td>
                    <td className="td">{r.subject}</td>
                    <td className="td">{r.present}/{r.total}</td>
                    <td className="td">{formatPercent(r.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-blue-900">Recently added students</h2>
          {data.recentStudents.length === 0 ? (
            <EmptyState title="No students yet" />
          ) : (
            <TableWrap>
              <thead><tr><th className="th">Name</th><th className="th">Roll No</th><th className="th">Class</th></tr></thead>
              <tbody className="divide-y divide-blue-50">
                {data.recentStudents.map((s) => (
                  <tr key={s.id}><td className="td">{s.name}</td><td className="td"><Badge>{s.rollNo}</Badge></td><td className="td">{s.className}-{s.section}</td></tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>
      </div>
    </div>
  );
}
