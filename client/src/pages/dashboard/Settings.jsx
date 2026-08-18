import { useEffect, useMemo, useState } from 'react';
import { ModuleHeader } from './ModuleBits';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff', password: '' });
  const [restoreFile, setRestoreFile] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/settings').catch(() => null),
      api('/settings/users').catch(() => []),
    ]).then(([s, u]) => {
      setSettings(s);
      setUsers(u);
    });
  }, []);

  const roleSummary = useMemo(() => {
    const byRole = users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {});
    return `${byRole.practitioner || 0} practitioner · ${byRole.staff || 0} staff · ${byRole.admin || 0} admin`;
  }, [users]);

  async function addUser(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const payload = {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        ...(newUser.password.trim() ? { password: newUser.password.trim() } : {}),
      };
      const out = await api('/settings/users', { method: 'POST', body: JSON.stringify(payload) });
      setUsers((prev) => [...prev, out.user].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setMsg(`User created. Temporary password: ${out.temporaryPassword}`);
      setShowAdd(false);
      setNewUser({ name: '', email: '', role: 'staff', password: '' });
    } catch (e2) {
      setMsg(e2.message || 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(userId) {
    setBusy(true);
    setMsg('');
    try {
      const out = await api(`/settings/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({}) });
      setMsg(`Password reset. Temporary password: ${out.temporaryPassword}`);
    } catch (e2) {
      setMsg(e2.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  }

  async function exportBackup() {
    setBusy(true);
    setMsg('');
    try {
      const payload = await api('/settings/export');
      const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindcare-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Backup exported successfully.');
    } catch (e2) {
      setMsg(e2.message || 'Backup export failed');
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    if (!restoreFile) return;
    setBusy(true);
    setMsg('');
    try {
      const text = await restoreFile.text();
      const payload = JSON.parse(text);
      await api('/settings/restore', { method: 'POST', body: JSON.stringify(payload) });
      setMsg('Backup restored. Refreshing records...');
    } catch (e2) {
      setMsg(e2.message || 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  async function eraseAll() {
    if (!window.confirm('Erase all demo data? This cannot be undone.')) return;
    setBusy(true);
    setMsg('');
    try {
      await api('/settings/data', { method: 'DELETE' });
      localStorage.removeItem('mindcare.demo.notes');
      localStorage.removeItem('mindcare.demo.plans');
      localStorage.removeItem('mindcare.demo.clientForms');
      localStorage.removeItem('mindcare.demo.medications');
      localStorage.removeItem('mindcare.demo.adminNotes');
      localStorage.removeItem('mindcare.demo.messages');
      localStorage.removeItem('mindcare.demo.messages.v2');
      setMsg('All demo data erased.');
    } catch (e2) {
      setMsg(e2.message || 'Erase failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ModuleHeader title="Settings" lead="Your data lives on this browser — back it up regularly." />

      {msg && (
        <div className="mb-4 rounded-xl border border-mc-line bg-white px-4 py-2 text-sm text-mc-navy">{msg}</div>
      )}

      <section className="mb-4 rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-mc-navy">Users & access</h3>
            <p className="mt-1 text-sm text-mc-ink-soft">
              Three roles: <strong>Practitioner</strong>, <strong>Staff</strong>, and <strong>Admin</strong>. {roleSummary}
            </p>
            {settings && (
              <p className="mt-1 text-xs text-mc-ink-soft">
                {settings.clinic_name || 'MindCare Practice'} · {settings.email || 'clinic email'} · {settings.phone || 'clinic phone'}
              </p>
            )}
          </div>
          <button disabled={busy} type="button" onClick={() => setShowAdd(true)} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">
            + Add user
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-mc-line px-3 py-2">
              <div className="text-sm">
                <span className="font-semibold text-mc-ink">{u.name}</span>
                <span className="ml-2 rounded-full bg-mc-gold-soft px-2 py-0.5 text-[11px] font-semibold text-mc-gold-deep">{u.role}</span>
                {user?.id === u.id && <span className="ml-2 text-xs text-mc-ink-soft">(you)</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-mc-ink-soft">{u.email}</span>
                <button disabled={busy} type="button" onClick={() => resetPassword(u.id)} className="rounded-lg border border-mc-line px-2.5 py-1 text-xs font-semibold">
                  Reset password
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        <h3 className="font-bold text-mc-navy">Backup</h3>
        <p className="mt-1 text-sm text-mc-ink-soft">Export all patients, appointments, invoices and settings as a JSON file.</p>
        <button disabled={busy} type="button" onClick={exportBackup} className="mt-3 rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">
          ↓ Export backup
        </button>
      </section>

      <section className="mb-4 rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        <h3 className="font-bold text-mc-navy">Restore</h3>
        <p className="mt-1 text-sm text-mc-ink-soft">Import a previously exported backup file. This replaces current data (demo mode).</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="file" accept="application/json" onChange={(e) => setRestoreFile(e.target.files?.[0] || null)} />
          <button disabled={busy || !restoreFile} type="button" onClick={restoreBackup} className="rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold">
            Restore file
          </button>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        <h3 className="font-bold text-mc-navy">Danger zone</h3>
        <p className="mt-1 text-sm text-mc-ink-soft">Erase everything stored by this app in demo mode.</p>
        <button disabled={busy} type="button" onClick={eraseAll} className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">
          Erase all data
        </button>
      </section>

      <section className="rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        <h3 className="font-bold text-mc-navy">Privacy & compliance notes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mc-ink-soft">
          <li>Data is stored on this device in demo mode unless your backend database is configured.</li>
          <li>For US clinical use with PHI, run in secure production mode with encrypted backups.</li>
          <li>Use a HIPAA-appropriate telehealth provider and execute BAAs where required.</li>
          <li>Verify payer rules and documentation requirements for your state before go-live.</li>
        </ul>
      </section>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <form onSubmit={addUser} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-bold text-mc-navy">Add staff user</h4>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold text-mc-ink-soft">Name
                <input required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">Email
                <input required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">Role
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm">
                  <option value="staff">Staff</option>
                  <option value="practitioner">Practitioner</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">Temporary password (optional)
                <input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" placeholder="Defaults to mindcare123" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-lg border border-mc-line py-2 text-sm font-semibold">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-lg bg-mc-navy py-2 text-sm font-bold text-white">Create user</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
