import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/ui.jsx';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (!loading && user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const next = {};
    if (!identifier.trim()) next.identifier = 'Enter your email or username';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const u = await login(identifier.trim(), password);
      navigate(u.role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-800 via-blue-700 to-blue-500 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-3xl text-white">🎓</div>
          <h1 className="text-2xl font-bold text-blue-900">Student Attendance System</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to the Admin or Student portal</p>
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          {serverError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

          <div>
            <label className="label" htmlFor="identifier">Email or username</label>
            <input id="identifier" className={`input ${errors.identifier ? 'input-error' : ''}`} autoComplete="username" autoFocus
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or roll number" />
            {errors.identifier && <p className="field-error">{errors.identifier}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} className={`input pr-16 ${errors.password ? 'input-error' : ''}`} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-blue-700">{show ? 'Hide' : 'Show'}</button>
            </div>
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
            {busy ? (<><Spinner className="h-4 w-4" /> Signing in...</>) : 'Login'}
          </button>
        </form>

        {/* Shown only by "npm run dev" - never in a production build */}
        {import.meta.env.DEV && (
          <div className="mt-6 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Local demo logins</p>
            <p>Admin: <code>admin@college.edu</code> / <code>Admin@123</code></p>
            <p>Student: <code>rahul101@example.com</code> or <code>cse101</code> / <code>Student@123</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
