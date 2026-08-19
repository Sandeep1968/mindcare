import { useEffect, useState } from 'react';
import { ModuleHeader } from './ModuleBits';
import { api } from '../../lib/api';

const LIBRARY = [
  { id: 'intake', name: 'New client intake', type: 'Form' },
  { id: 'consent', name: 'Informed consent', type: 'Consent' },
  { id: 'hipaa', name: 'HIPAA notice', type: 'Consent' },
  { id: 'telehealth', name: 'Telehealth agreement', type: 'Form' },
];

export default function FormsDocuments() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/patients').then(setPatients).catch(() => []);
    api('/clinical/bundle').then((b) => setQueue(b.forms || [])).catch(() => setQueue([]));
  }, []);

  async function send(formId) {
    const f = LIBRARY.find((x) => x.id === formId);
    const patient = patients.find((p) => p.id === patientId);
    if (!f || !patient) {
      setError('Select a patient first.');
      return;
    }
    setError('');
    try {
      const row = await api('/clinical/forms', {
        method: 'POST',
        body: JSON.stringify({ patientId: patient.id, name: f.name, formKey: f.id }),
      });
      setQueue((prev) => [row, ...prev]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Forms & Documents"
        lead="Assign a template to a patient. It is stored on their chart and listed in the patient portal."
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
                <div className="font-semibold">{q.name || q.form}</div>
                <div className="text-xs text-mc-ink-soft">
                  {patients.find((p) => p.id === q.patientId)?.name || 'Patient'} · {q.date || q.sent}
                </div>
              </div>
              <span className="rounded-full bg-mc-gold-soft px-2 py-0.5 text-xs font-bold text-mc-gold-deep">{q.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
