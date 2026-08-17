import { useState } from 'react';
import { ModuleHeader, EmptyHint } from './ModuleBits';

const KEY = 'mindcare.demo.plans';

export default function TreatmentPlans() {
  const [plans, setPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ client: '', goal: '', focus: '' });

  function save(e) {
    e.preventDefault();
    const next = [{ id: crypto.randomUUID(), ...form, status: 'active', updated: new Date().toISOString().slice(0, 10) }, ...plans];
    setPlans(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    setForm({ client: '', goal: '', focus: '' });
  }

  return (
    <div>
      <ModuleHeader
        title="Treatment Plans"
        lead="Cross-client treatment plan library — goals, focus areas, and review status."
      />
      <form onSubmit={save} className="mb-6 grid gap-3 rounded-xl border border-mc-line bg-white p-4 md:grid-cols-3">
        <input required placeholder="Client name" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        <input required placeholder="Primary goal" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
        <input placeholder="Clinical focus" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} />
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
