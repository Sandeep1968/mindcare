import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ModuleHeader, EmptyHint } from './ModuleBits';

export default function ClinicalNotes() {
  const [patients, setPatients] = useState([]);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ patientId: '', symptoms: '', diagnosis: '', body: '' });

  useEffect(() => {
    api('/patients').then(setPatients).catch(() => {});
    api('/clinical/bundle')
      .then((b) => setNotes(b.notes || []))
      .catch(() => setNotes([]));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const row = await api('/clinical/notes', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setNotes((prev) => [row, ...prev]);
      setForm({ patientId: '', symptoms: '', diagnosis: '', body: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Clinical Notes"
        lead="Session documentation across the caseload. Saved to the clinic record — not only this browser."
        action={<Link to="/dashboard/patients" className="text-sm font-bold text-mc-gold-deep">Patients →</Link>}
      />

      <form onSubmit={save} className="mb-6 grid gap-3 rounded-xl border border-mc-line bg-white p-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-mc-ink-soft md:col-span-2">
          Patient
          <select required className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <input placeholder="Symptoms" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
        <input placeholder="Diagnosis / focus" className="rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
        <textarea required placeholder="Session note" className="min-h-24 rounded-lg border border-mc-line px-3 py-2 text-sm md:col-span-2" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink md:col-span-2 disabled:opacity-60">Save clinical note</button>
      </form>

      {!notes.length ? (
        <EmptyHint title="No notes yet" body="Add a clinical note above, or open a patient and document after a session." to="/dashboard/patients" cta="Go to patients" />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <article key={n.id} className="rounded-xl border border-mc-line bg-white p-4">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-mc-navy">{n.patientName}</h3>
                <span className="text-xs text-mc-ink-soft">{n.date}</span>
              </div>
              {(n.symptoms || n.diagnosis) && (
                <p className="mb-2 text-xs text-mc-ink-soft">{[n.symptoms, n.diagnosis].filter(Boolean).join(' · ')}</p>
              )}
              <p className="text-sm text-mc-ink whitespace-pre-wrap">{n.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
