import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// One layout used by both portals; only the menu links differ.
export default function PortalLayout({ portalName, links }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-blue-800 shadow' : 'text-blue-100 hover:bg-blue-700/60'}`;

  return (
    <div className="min-h-screen md:flex">
      {/* mobile top bar */}
      <header className="flex items-center justify-between bg-blue-800 px-4 py-3 text-white md:hidden">
        <span className="font-bold">🎓 {portalName}</span>
        <button onClick={() => setOpen((o) => !o)} className="rounded p-2 hover:bg-blue-700" aria-label="Toggle menu" aria-expanded={open}>☰</button>
      </header>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-blue-800 to-blue-900 p-4 text-white transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-6 px-2 pt-2">
          <div className="text-xl font-bold">🎓 College Attendance</div>
          <div className="text-xs uppercase tracking-wider text-blue-200">{portalName}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1" onClick={() => setOpen(false)}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              <span aria-hidden="true">{l.icon}</span> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-blue-700 pt-4">
          <p className="truncate px-2 text-sm font-semibold">{user && user.name}</p>
          <p className="truncate px-2 pb-3 text-xs text-blue-200">{user && user.email}</p>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100 hover:bg-red-600/80 hover:text-white">
            <span aria-hidden="true">🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
