import { useEffect, useState } from 'react';
import { ASSESSMENTS } from '../../data/catalog';
import { ModuleHeader } from './ModuleBits';
import { api } from '../../lib/api';

export default function ClinicalAssessments() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [assigned, setAssigned] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/patients').then(setPatients).catch(() => setPatients([]));
    api('/clinical/bundle').then((b) => setAssigned(b.assessments || [])).catch(() => setAssigned([]));
  }, []);

  async function assign(id) {
    const a = ASSESSMENTS.find((x) => x.id === id);
    const patient = patients.find((p) => p.id === patientId);
    if (!a || !patient) return;
    setError('');
    try {
      const row = await api('/clinical/assessments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id,
          assessmentId: a.id,
          name: a.name,
          cat: a.cat,
        }),
      });
      setAssigned((prev) => [row, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Assessments"
        lead="Assign a self-check-in to a specific patient. They will see only their assigned items in the patient portal."
      />
      <label className="mb-5 block max-w-md text-xs font-bold uppercase tracking-wide text-mc-navy">
        Assign to patient
        <select
          className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          <option value="">— Select patient —</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSESSMENTS.map((a) => (
          <article key={a.id} className="rounded-xl border border-mc-line bg-white p-4">
            <div className="mb-1 text-[11px] font-bold uppercase text-mc-gold-deep">{a.cat}</div>
            <h3 className="font-bold text-mc-navy">{a.name}</h3>
            <p className="mt-1 mb-3 text-sm text-mc-ink/75">{a.blurb}</p>
            <button
              type="button"
              disabled={!patientId}
              onClick={() => assign(a.id)}
              className="rounded-lg bg-mc-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              Assign to patient
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
                <div className="text-xs text-mc-ink-soft">
                  {a.patientName || 'Patient'} · {a.cat} · assigned {a.assignedAt}
                </div>
              </div>
              <span className="rounded-full bg-mc-gold-soft px-2 py-0.5 text-xs font-bold text-mc-gold-deep">{a.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
