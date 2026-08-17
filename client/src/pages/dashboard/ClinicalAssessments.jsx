import { useState } from 'react';
import { ASSESSMENTS } from '../../data/catalog';
import { ModuleHeader } from './ModuleBits';

const KEY = 'mindcare.demo.assignedAssessments';

export default function ClinicalAssessments() {
  const [assigned, setAssigned] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });

  function assign(id) {
    const a = ASSESSMENTS.find((x) => x.id === id);
    if (!a) return;
    const next = [{ id: crypto.randomUUID(), assessmentId: a.id, name: a.name, cat: a.cat, status: 'pending', assignedAt: new Date().toISOString().slice(0, 10) }, ...assigned];
    setAssigned(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  return (
    <div>
      <ModuleHeader
        title="Assessments"
        lead="Library of self-check-ins used on the public site — assign for intake or follow-up."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSESSMENTS.map((a) => (
          <article key={a.id} className="rounded-xl border border-mc-line bg-white p-4">
            <div className="mb-1 text-[11px] font-bold uppercase text-mc-gold-deep">{a.cat}</div>
            <h3 className="font-bold text-mc-navy">{a.name}</h3>
            <p className="mt-1 mb-3 text-sm text-mc-ink/75">{a.blurb}</p>
            <button type="button" onClick={() => assign(a.id)} className="rounded-lg bg-mc-navy px-3 py-1.5 text-xs font-bold text-white">
              Assign (demo)
            </button>
          </article>
        ))}
      </div>
      <h3 className="mb-3 font-bold text-mc-navy">Assigned queue</h3>
      <div className="rounded-xl border border-mc-line bg-white">
        {!assigned.length ? (
          <p className="p-5 text-sm text-mc-ink-soft">No assessments assigned yet.</p>
        ) : (
          assigned.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-mc-line px-4 py-3 last:border-0">
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-mc-ink-soft">{a.cat} · assigned {a.assignedAt}</div>
              </div>
              <span className="rounded-full bg-mc-gold-soft px-2 py-0.5 text-xs font-bold text-mc-gold-deep">{a.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
