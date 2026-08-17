import { useState } from 'react';
import { ModuleHeader } from './ModuleBits';

const LIBRARY = [
  { id: 'intake', name: 'New client intake', type: 'Form' },
  { id: 'consent', name: 'Informed consent', type: 'Consent' },
  { id: 'hipaa', name: 'HIPAA notice', type: 'Consent' },
  { id: 'telehealth', name: 'Telehealth agreement', type: 'Form' },
];

const KEY = 'mindcare.demo.formsQueue';

export default function FormsDocuments() {
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  });

  function send(formId) {
    const f = LIBRARY.find((x) => x.id === formId);
    const next = [{ id: crypto.randomUUID(), form: f.name, status: 'pending', sent: new Date().toISOString().slice(0, 10) }, ...queue];
    setQueue(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  return (
    <div>
      <ModuleHeader
        title="Forms & Documents"
        lead="Template library and outstanding forms queue for reception and therapists."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {LIBRARY.map((f) => (
          <article key={f.id} className="flex items-center justify-between rounded-xl border border-mc-line bg-white p-4">
            <div>
              <div className="text-[11px] font-bold uppercase text-mc-gold-deep">{f.type}</div>
              <h3 className="font-bold text-mc-navy">{f.name}</h3>
            </div>
            <button type="button" onClick={() => send(f.id)} className="rounded-lg bg-mc-navy px-3 py-1.5 text-xs font-bold text-white">
              Send
            </button>
          </article>
        ))}
      </div>
      <h3 className="mb-3 font-bold text-mc-navy">Pending / assigned</h3>
      <div className="rounded-xl border border-mc-line bg-white">
        {!queue.length ? (
          <p className="p-5 text-sm text-mc-ink-soft">No outstanding forms.</p>
        ) : (
          queue.map((q) => (
            <div key={q.id} className="flex items-center justify-between border-b border-mc-line px-4 py-3 last:border-0">
              <div>
                <div className="font-semibold">{q.form}</div>
                <div className="text-xs text-mc-ink-soft">Sent {q.sent}</div>
              </div>
              <span className="rounded-full bg-mc-gold-soft px-2 py-0.5 text-xs font-bold text-mc-gold-deep">{q.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
