import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { seedPortalStores } from './portalData';
import NavIcon from '../dashboard/NavIcon';

export const PORTAL_NAV = [
  { to: '/dashboard/portal', end: true, label: 'Home', icon: 'home' },
  { to: '/dashboard/portal/messages', label: 'My messages', icon: 'message' },
  { to: '/dashboard/portal/tracking', label: 'My tracking', icon: 'calendar' },
  { to: '/dashboard/portal/assessments', label: 'My assessments', icon: 'clinical' },
  { to: '/dashboard/portal/prescriptions', label: 'My prescriptions', icon: 'billing' },
  { to: '/dashboard/portal/documents', label: 'My documents', icon: 'reports' },
  { to: '/dashboard/portal/billing', label: 'My bills', icon: 'inbox' },
];

export default function PortalLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'patient') return undefined;
    seedPortalStores(user.patientId);
    let cancelled = false;
    api('/portal/me')
      .then((d) => { if (!cancelled) setMe(d); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Unable to load your record.'); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (loading) return <div className="grid min-h-screen place-items-center text-mc-ink-soft">Loading…</div>;
  if (!user) return <Navigate to="/dashboard/login?intent=patient" replace />;
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />;

  const title = PORTAL_NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label || 'My care';

  return (
    <div className="flex min-h-screen bg-[#f3f5f8]">
      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#e8ecf1] bg-white transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="border-b border-[#e8ecf1] px-4 py-4">
          <BrandLogo className="h-12 max-w-[210px]" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-mc-gold-deep">Patient portal</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Patient">
          {PORTAL_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  isActive ? 'bg-[#fff3d6] text-mc-gold-deep' : 'text-slate-700 hover:bg-[#f3f5f8]'
                }`
              }
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[#e8ecf1] p-4 text-xs text-slate-500">
          Signed in as <strong className="text-mc-navy">{user.name}</strong>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#e8ecf1] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <button type="button" className="rounded-lg border border-[#e8ecf1] px-2.5 py-1.5 text-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
          <h1 className="text-lg font-bold text-mc-navy">{title}</h1>
          <div className="ml-auto">
            <button type="button" onClick={logout} className="rounded-lg border border-mc-line px-3 py-1.5 text-sm font-semibold">Sign out</button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <Outlet context={{ me, user }} />
        </main>
      </div>
    </div>
  );
}
