import PortalLayout from './PortalLayout.jsx';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/add-student', label: 'Add Student', icon: '➕' },
  { to: '/admin/attendance', label: 'Attendance', icon: '✅' },
  { to: '/admin/assignments', label: 'Assignments', icon: '📄' },
  { to: '/admin/delete-student', label: 'Delete Student', icon: '🗑️' },
];

export default function AdminLayout() {
  return <PortalLayout portalName="Admin Portal" links={links} />;
}
