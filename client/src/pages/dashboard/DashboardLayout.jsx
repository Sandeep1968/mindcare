import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { NAV, TITLES, canSeeNavItem, roleLabel } from './navConfig';
import NavIcon from './NavIcon';
import BugReportButton from '../../components/BugReportButton';

export default function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [clinicalOpen, setClinicalOpen] = useState(
    () => location.pathname.startsWith('/dashboard/clinical'),
  );
  const [badge, setBadge] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  /* Notifications: read localStorage once on mount, not on every route change */
  const [notifications, setNotifications] = useState(() => {
    try {
      const msgs = JSON.parse(localStorage.getItem('mindcare.demo.messages') || '[]');
      const unread = msgs.filter((m) => m.unread).slice(0, 3);
      if (unread.length) {
        return unread.map((m) => ({ id: m.id, title: m.from, body: m.preview, to: '/dashboard/communication' }));
      }
    } catch { /* ignore */ }
    return [
      { id: 'n1', title: 'Website booking', body: 'New virtual intake to review', to: '/dashboard/bookings' },
      { id: 'n2', title: 'Clinical note', body: '2 notes need attention', to: '/dashboard/clinical/notes' },
      { id: 'n3', title: 'Message', body: 'Client replied in inbox', to: '/dashboard/communication' },
    ];
  });

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/clinical')) setClinicalOpen(true);
  }, [location.pathname]);

  /* Badge: fetch once on mount only, not on every navigation */
  useEffect(() => {
    api('/dashboard/overview')
      .then((d) => setBadge(d.newRequests || 0))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpen(false);
    setNotifOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  /* Search: 300ms debounce — prevents API call on every keystroke */
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return undefined;
    }
    const q = search.trim().toLowerCase();
    let cancelled = false;
    const timer = setTimeout(() => {
      Promise.all([
        api(`/patients?q=${encodeURIComponent(search)}`).catch(() => []),
        api('/appointments?filter=upcoming').catch(() => []),
      ]).then(([patients, appts]) => {
        if (cancelled) return;
        const pHits = (patients || []).slice(0, 5).map((p) => ({
          type: 'patient',
          id: p.id,
          label: p.name,
          sub: p.email || p.phone || 'Client',
          to: `/dashboard/patients/${p.id}`,
        }));
        const aHits = (appts || [])
          .filter((a) => (a.patientName || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q))
          .slice(0, 5)
          .map((a) => ({
            type: 'appt',
            id: a.id,
            label: a.patientName,
            sub: `${a.date} · ${a.time} · ${a.type}`,
            to: '/dashboard/appointments',
          }));
        setResults([...pHits, ...aHits]);
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('dash-search')?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const title = useMemo(() => {
    const exact = TITLES[location.pathname];
    if (exact) return exact;
    if (location.pathname.startsWith('/dashboard/patients')) return 'Patients';
    return 'MindCare workspace';
  }, [location.pathname]);

  if (loading) return <div className="grid min-h-screen place-items-center text-mc-ink-soft">Loading…</div>;
  if (!user) return <Navigate to="/dashboard/login" replace />;
  if (user.role === 'patient') return <Navigate to="/dashboard/portal" replace />;

  const visible = NAV.filter((item) => canSeeNavItem(item, user.role));
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f3f5f8]">
      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#e8ecf1] bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[#e8ecf1] px-4 py-4">
          <BrandLogo className="h-12 max-w-[210px]" />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Primary">
          {visible.map((item) => {
            if (item.children) {
              return (
                <div key={item.id} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() => setClinicalOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#f3f5f8]"
                    aria-expanded={clinicalOpen}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <NavIcon name={item.icon} />
                      {item.label}
                    </span>
                    <span className={`text-xs transition ${clinicalOpen ? 'rotate-90' : ''}`}>›</span>
                  </button>
                  {clinicalOpen && (
                    <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-[#e8ecf1] pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.id}
                          to={child.to}
                          className={({ isActive }) =>
                            `rounded-lg px-3 py-2 text-[13px] font-semibold ${
                              isActive ? 'bg-[#fff3d6] text-mc-gold-deep' : 'text-slate-600 hover:bg-[#f3f5f8]'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    isActive ? 'bg-[#fff3d6] text-mc-gold-deep' : 'text-slate-700 hover:bg-[#f3f5f8]'
                  }`
                }
              >
                <span className="inline-flex items-center gap-2.5">
                  <NavIcon name={item.icon} />
                  {item.label}
                </span>
                {item.badgeKey === 'newRequests' && badge > 0 && (
                  <span className="rounded-full bg-mc-navy px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#e8ecf1] p-4">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-[#fff8e8] to-[#eef4fb] p-3">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm" aria-hidden>
              🧠
            </div>
            <p className="text-[12px] font-semibold leading-snug text-mc-navy">
              Take care of your mind, so you can take care of everything else.
            </p>
          </div>
          <div className="text-xs text-slate-500">Signed in as <strong className="text-mc-navy">{user.name}</strong></div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[#e8ecf1] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <button type="button" className="rounded-lg border border-[#e8ecf1] px-2.5 py-1.5 text-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            ☰
          </button>
          <h1 className="text-lg font-bold text-mc-navy">{title}</h1>

          <div className="relative mx-auto w-full max-w-md flex-1">
            <input
              id="dash-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients, appointments…"
              className="w-full rounded-xl border border-[#e8ecf1] bg-[#f7f9fc] py-2.5 pl-3 pr-14 text-sm outline-none focus:border-mc-navy"
              aria-label="Search"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-[#dde3ea] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              ⌘K
            </span>
            {search.trim() && (
              <div className="absolute left-0 right-0 top-[110%] z-30 overflow-hidden rounded-xl border border-[#e8ecf1] bg-white shadow-lg">
                {!results.length ? (
                  <p className="px-3 py-3 text-sm text-slate-500">No matches</p>
                ) : (
                  results.map((r) => (
                    <NavLink
                      key={`${r.type}-${r.id}`}
                      to={r.to}
                      onClick={() => setSearch('')}
                      className="block border-b border-[#f0f2f5] px-3 py-2.5 last:border-0 hover:bg-[#f3f5f8]"
                    >
                      <div className="text-sm font-semibold text-mc-navy">{r.label}</div>
                      <div className="text-xs text-slate-500">{r.sub}</div>
                    </NavLink>
                  ))
                )}
              </div>
            )}
          </div>

          <BugReportButton />

          <div className="relative">
            <button
              type="button"
              onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
              className="relative rounded-xl border border-[#e8ecf1] p-2.5 text-mc-navy hover:bg-[#f3f5f8]"
              aria-label="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e25555] px-1 text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-[115%] z-40 w-72 overflow-hidden rounded-xl border border-[#e8ecf1] bg-white shadow-xl">
                <div className="border-b border-[#e8ecf1] px-3 py-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Notifications</div>
                {notifications.map((n) => (
                  <Link key={n.id} to={n.to} onClick={() => setNotifOpen(false)} className="block border-b border-[#f0f2f5] px-3 py-2.5 last:border-0 hover:bg-[#f3f5f8]">
                    <div className="text-sm font-semibold text-mc-navy">{n.title}</div>
                    <div className="text-xs text-slate-500">{n.body}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 rounded-xl border border-[#e8ecf1] py-1.5 pl-1.5 pr-2.5 hover:bg-[#f3f5f8]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mc-navy text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold text-mc-navy">{user.name}</span>
                <span className="block text-[11px] text-slate-500">{roleLabel(user.role)}</span>
              </span>
              <span className="text-slate-400">▾</span>
            </button>
            {userOpen && (
              <div className="absolute right-0 top-[115%] z-40 w-48 overflow-hidden rounded-xl border border-[#e8ecf1] bg-white shadow-xl">
                <button type="button" onClick={logout} className="block w-full px-3 py-2.5 text-left text-sm font-semibold text-mc-navy hover:bg-[#f3f5f8]">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
