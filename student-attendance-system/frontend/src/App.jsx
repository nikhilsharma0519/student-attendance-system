import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AddStudent from './pages/AddStudent.jsx';
import Attendance from './pages/Attendance.jsx';
import Assignments from './pages/Assignments.jsx';
import DeleteStudent from './pages/DeleteStudent.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import MyAttendance from './pages/MyAttendance.jsx';
import MyAssignments from './pages/MyAssignments.jsx';
import MyProfile from './pages/MyProfile.jsx';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="add-student" element={<AddStudent />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="delete-student" element={<DeleteStudent />} />
        </Route>
      </Route>

      <Route path="/student" element={<ProtectedRoute role="student" />}>
        <Route element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="assignments" element={<MyAssignments />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
