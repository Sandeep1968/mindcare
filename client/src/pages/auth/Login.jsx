import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

/** Must match server/src/demo.js DEMO_IDS */
const DEMO_STAFF = [
  { id: 'a1000001-0000-4000-8000-000000000001', label: 'Admin', name: 'Admin User', hint: 'Full clinic control' },
  { id: 'a1000001-0000-4000-8000-000000000002', label: 'Doctor', name: 'Dr. Sarah Williams', hint: 'Practitioner workspace' },
  { id: 'a1000001-0000-4000-8000-000000000003', label: 'Help desk', name: 'Maya Chen — Help Desk', hint: 'Bookings & front desk' },
];

const DEMO_PATIENT = {
  id: 'a1000001-0000-4000-8000-000000000004',
  name: 'Alex Rivera',
};

const DEMO_PASSWORD = 'mindcare123';

export default function Login() {
  const { login, setup, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get('intent') === 'patient' ? 'patient' : 'staff';
  const [needsSetup, setNeedsSetup] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ userId: '', password: DEMO_PASSWORD, name: '', email: '', password2: '' });

  useEffect(() => {
    if (user) navigate(user.role === 'patient' ? '/dashboard/portal' : '/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api('/auth/bootstrap')
      .then((d) => {
        setNeedsSetup(Boolean(d.needsSetup));
        setDemoMode(Boolean(d.demoMode));
      })
      .catch(() => setDemoMode(true));
    api(`/auth/users?intent=${intent}`)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [intent]);

  async function enterAs(userId) {
    setError('');
    setBusy(true);
    try {
      const u = await login({ userId, password: DEMO_PASSWORD });
      navigate(u.role === 'patient' ? '/dashboard/portal' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login({ userId: form.userId, password: form.password });
      navigate(u.role === 'patient' ? '/dashboard/portal' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSetup(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) {
      setError('Passwords do not match');
      return;
    }
    try {
      await setup({ name: form.name, email: form.email, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b2540] p-5">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 shadow-2xl">
        <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-mc-gold-deep">
          MindCare workspace
        </div>
        <div className="mb-4 flex justify-center">
          <BrandLogo className="h-14 max-w-[260px]" />
        </div>

        {demoMode && (
          <div className="mb-4 rounded-xl border border-mc-gold/40 bg-mc-gold-soft px-3 py-2 text-center text-xs text-mc-ink">
            <strong>Demo mode</strong> — Neon DB optional. Password for all demo users:{' '}
            <code className="font-bold">{DEMO_PASSWORD}</code>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-mc-cream p-1">
          <Link
            to="/dashboard/login"
            className={`rounded-lg py-2 text-center text-sm font-bold ${
              intent === 'staff' ? 'bg-mc-navy text-white' : 'text-mc-ink-soft'
            }`}
          >
            Staff / Admin
          </Link>
          <Link
            to="/dashboard/login?intent=patient"
            className={`rounded-lg py-2 text-center text-sm font-bold ${
              intent === 'patient' ? 'bg-mc-navy text-white' : 'text-mc-ink-soft'
            }`}
          >
            Existing patient
          </Link>
        </div>

        {intent === 'staff' && demoMode && (
          <div className="mb-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-mc-ink-soft">One-click enter</p>
            {DEMO_STAFF.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={busy}
                onClick={() => enterAs(d.id)}
                className="flex w-full items-center justify-between rounded-xl border border-mc-line bg-white px-3 py-3 text-left transition hover:border-mc-navy hover:bg-mc-navy-soft disabled:opacity-60"
              >
                <span>
                  <span className="block text-sm font-bold text-mc-navy">{d.label}</span>
                  <span className="block text-xs text-mc-ink-soft">{d.name} · {d.hint}</span>
                </span>
                <span className="text-sm font-bold text-mc-gold-deep">Enter →</span>
              </button>
            ))}
          </div>
        )}

        {intent === 'patient' && demoMode && (
          <div className="mb-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => enterAs(DEMO_PATIENT.id)}
              className="flex w-full items-center justify-between rounded-xl border border-mc-line bg-white px-3 py-3 text-left transition hover:border-mc-navy hover:bg-mc-navy-soft disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-bold text-mc-navy">Existing patient</span>
                <span className="block text-xs text-mc-ink-soft">{DEMO_PATIENT.name}</span>
              </span>
              <span className="text-sm font-bold text-mc-gold-deep">Enter →</span>
            </button>
          </div>
        )}

        {needsSetup && intent === 'staff' && !demoMode ? (
          <form onSubmit={onSetup} className="space-y-3">
            <h2 className="text-base font-bold text-mc-navy">Set up the first admin account</h2>
            <label className="block text-xs font-semibold text-mc-ink-soft">Your name
              <input required className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-mc-ink-soft">Email
              <input required type="email" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-mc-ink-soft">Password
              <input required minLength={4} type="password" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-mc-ink-soft">Confirm password
              <input required minLength={4} type="password" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button className="w-full rounded-lg bg-mc-gold py-2.5 text-sm font-bold text-mc-ink">Create account</button>
          </form>
        ) : (
          <form onSubmit={onLogin} className="space-y-3 border-t border-mc-line pt-4">
            <h2 className="text-sm font-bold text-mc-navy">
              {demoMode ? 'Or pick from list' : intent === 'patient' ? 'Patient portal sign-in' : 'Staff / Admin sign-in'}
            </h2>
            {!users.length ? (
              <p className="text-sm text-mc-ink-soft">No accounts loaded. Is the API running on port 4000?</p>
            ) : (
              <>
                <label className="block text-xs font-semibold text-mc-ink-soft">User
                  <select required className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                    <option value="">Select…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-mc-ink-soft">Password
                  <input required type="password" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </label>
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button disabled={busy} className="w-full rounded-lg bg-mc-gold py-2.5 text-sm font-bold text-mc-ink disabled:opacity-60">
                  Enter workspace
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
