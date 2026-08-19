import { useEffect, useState } from 'react';
import { ModuleHeader, EmptyHint } from './ModuleBits';
import { api } from '../../lib/api';

export default function TreatmentPlans() {
  const [patients, setPatients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ patientId: '', goal: '', focus: '' });

  useEffect(() => {
    api('/patients').then(setPatients).catch(() => []);
    api('/clinical/bundle').then((b) => setPlans(b.plans || [])).catch(() => setPlans([]));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const row = await api('/clinical/plans', { method: 'POST', body: JSON.stringify(form) });
      setPlans((prev) => [row, ...prev]);
      setForm({ patientId: '', goal: '', focus: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Treatment Plans"
        lead="Goals and review status saved on the patient chart — visible to the care team and (goals only) in the portal."
      />
      <form onSubmit={save} className="mb-6 grid gap-3 rounded-xl border border-mc-line bg-white p-4 md:grid-cols-3">
        <select required className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
          <option value="">Select patient…</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input required placeholder="Primary goal" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
        <input placeholder="Clinical focus" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} />
        {error && <p className="text-sm text-red-700 md:col-span-3">{error}</p>}
        <button className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink md:col-span-3">Create plan</button>
      </form>
      {!plans.length ? (
        <EmptyHint title="No treatment plans yet" body="Create a plan above to track goals and upcoming reviews." />
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <article key={p.id} className="rounded-xl border border-mc-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-mc-navy">{p.client}</h3>
                <span className="rounded-full bg-mc-navy-soft px-2 py-0.5 text-xs font-bold text-mc-navy">{p.status}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-mc-ink">{p.goal}</p>
              {p.focus && <p className="text-xs text-mc-ink-soft">{p.focus}</p>}
              <p className="mt-2 text-xs text-mc-ink-soft">Updated {p.updated}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
