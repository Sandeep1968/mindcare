import { useEffect, useState } from 'react';
import { ModuleHeader } from './ModuleBits';
import { api } from '../../lib/api';
import {
  CLINIC_TZ_OPTIONS,
  getClinicTimeZone,
  setClinicTimeZone,
  tzShortLabel,
} from '../../lib/timezones';

const KEY = 'mindcare.demo.settings';

const DEFAULTS = {
  clinicName: 'MindCare Clinic',
  phone: '(555) 010-2040',
  email: 'hello@mindcare.example',
  address: '1200 Calm Avenue, Suite 200',
  sessionMinutes: '50',
  videoProvider: 'Secure clinic video',
  notifyEmail: true,
  notifySms: false,
  clinicTimeZone: getClinicTimeZone(),
};

export default function Settings() {
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [outbox, setOutbox] = useState({ smtpConfigured: false, items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setForm({ ...DEFAULTS, ...JSON.parse(raw), clinicTimeZone: getClinicTimeZone() });
      else setForm((f) => ({ ...f, clinicTimeZone: getClinicTimeZone() }));
    } catch { /* ignore */ }
    api('/notifications/outbox')
      .then(setOutbox)
      .catch(() => setOutbox({ smtpConfigured: false, items: [] }));
  }, []);

  function save(e) {
    e.preventDefault();
    setClinicTimeZone(form.clinicTimeZone || 'America/New_York');
    localStorage.setItem(KEY, JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div>
      <ModuleHeader
        title="Settings"
        lead="Clinic profile, timezone (USA / India), session defaults, and notification preferences."
      />
      <form onSubmit={save} className="max-w-xl space-y-4 rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        {[
          ['clinicName', 'Clinic name'],
          ['phone', 'Phone'],
          ['email', 'Email'],
          ['address', 'Address'],
          ['sessionMinutes', 'Default session length (min)'],
          ['videoProvider', 'Video provider label'],
        ].map(([key, label]) => (
          <label key={key} className="block text-xs font-semibold text-mc-ink-soft">
            {label}
            <input
              className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="block text-xs font-semibold text-mc-ink-soft">
          Clinic timezone (appointment wall clock)
          <select
            className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
            value={form.clinicTimeZone}
            onChange={(e) => setForm({ ...form, clinicTimeZone: e.target.value })}
          >
            {CLINIC_TZ_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] font-normal text-mc-ink-soft">
            USA clients book in this zone ({tzShortLabel(form.clinicTimeZone)}). India staff see IST next to appointment times.
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-mc-navy">
          <input type="checkbox" checked={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })} />
          Email notifications for new website bookings
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-mc-navy">
          <input type="checkbox" checked={form.notifySms} onChange={(e) => setForm({ ...form, notifySms: e.target.checked })} />
          SMS reminders (demo toggle)
        </label>
        <button className="rounded-lg bg-mc-gold px-4 py-2.5 text-sm font-bold text-mc-ink">
          {saved ? 'Saved' : 'Save settings'}
        </button>
      </form>

      <section className="mt-6 max-w-xl rounded-xl border border-mc-line bg-white p-5 shadow-sm">
        <h3 className="font-bold text-mc-navy">Email (real SMTP later)</h3>
        <p className="mt-1 text-sm text-mc-ink-soft">
          {outbox.smtpConfigured
            ? 'Clinic SMTP is connected. Booking confirmations are sent to client and therapist inboxes.'
            : 'Real clinic email is not connected yet. Booking confirmations are stored here until you add SMTP details in server/.env.'}
        </p>
        <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${outbox.smtpConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
          {outbox.smtpConfigured ? 'Live SMTP' : 'Demo outbox'}
        </p>
        {outbox.items?.length > 0 ? (
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
            {outbox.items.slice(0, 12).map((m) => (
              <li key={m.id} className="rounded-lg border border-mc-line px-3 py-2">
                <p className="font-semibold text-mc-ink">{m.subject}</p>
                <p className="text-xs text-mc-ink-soft">To {m.to} · {m.status || m.mode}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mc-ink-soft">No queued messages yet. Book a visit to see a sample confirmation here.</p>
        )}
      </section>
    </div>
  );
}
