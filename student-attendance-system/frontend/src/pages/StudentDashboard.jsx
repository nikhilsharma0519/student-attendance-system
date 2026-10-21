import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import useFetch from '../utils/useFetch.js';
import { ErrorBlock, LoadingBlock, PageHeader, ProgressBar, StatCard } from '../components/ui.jsx';
import { formatPercent } from '../utils/format.js';

export default function StudentDashboard() {
  const { data, loading, error, reload } = useFetch(() => api.studentDashboard());
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const s = data.student;
  return (
    <div>
      <PageHeader title={`Welcome, ${s.name}`} subtitle={`Roll No ${s.rollNo} · Class ${s.className} · Section ${s.section}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🧑‍🎓" label="Student Name" value={s.name} />
        <StatCard icon="🆔" label="Roll Number" value={s.rollNo} />
        <StatCard icon="🏫" label="Class" value={s.className} />
        <StatCard icon="🔠" label="Section" value={s.section} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card md:col-span-2">
          <p className="text-sm text-slate-500">Overall Attendance Percentage</p>
          <p className="my-2 text-3xl font-bold text-blue-900">{formatPercent(data.attendancePercentage)}</p>
          <ProgressBar percentage={data.attendancePercentage} />
          <p className="mt-2 text-xs text-slate-400">Leave days are not counted as classes.</p>
        </div>
        <StatCard icon="🗓️" label="Total Classes Recorded" value={data.totalClassesRecorded} />
        <StatCard icon="✅" label="Classes Attended" value={data.classesAttended} />
        <StatCard icon="⏳" label="Pending Assignments" value={data.pendingAssignments} hint={data.overdueAssignments ? `${data.overdueAssignments} overdue` : 'None overdue'} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/student/attendance" className="btn-primary">View my attendance</Link>
        <Link to="/student/assignments" className="btn-secondary">View my assignments</Link>
      </div>
    </div>
  );
}
