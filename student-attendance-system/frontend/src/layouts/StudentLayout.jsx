import PortalLayout from './PortalLayout.jsx';

const links = [
  { to: '/student/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/student/attendance', label: 'My Attendance', icon: '✅' },
  { to: '/student/assignments', label: 'My Assignments', icon: '📄' },
  { to: '/student/profile', label: 'My Profile', icon: '👤' },
];

export default function StudentLayout() {
  return <PortalLayout portalName="Student Portal" links={links} />;
}
