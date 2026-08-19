import { useOutletContext } from 'react-router-dom';
import { medicationsFor } from './portalData';
import { formatLongDate } from '../dashboard/clients/clientData';

export default function PortalPrescriptions() {
  const { me, user } = useOutletContext();
  const meds = me?.medications || medicationsFor(user?.patientId);
  const current = meds.filter((m) => m.status === 'current');
  const previous = meds.filter((m) => m.status !== 'current');

  return (
    <div className="space-y-4">
      <p className="text-sm text-mc-ink-soft">
        Medications on your MindCare record (often prescribed by an outside provider). This is not a pharmacy fill.
      </p>
      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Current</h2>
        {!current.length ? (
          <p className="mt-2 text-sm text-mc-ink-soft">No current medications on file.</p>
        ) : current.map((m) => <MedCard key={m.id} m={m} />)}
      </section>
      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Previous</h2>
        {!previous.length ? (
          <p className="mt-2 text-sm text-mc-ink-soft">No previous medications listed.</p>
        ) : previous.map((m) => <MedCard key={m.id} m={m} />)}
      </section>
    </div>
  );
}

function MedCard({ m }) {
  return (
    <article className="mt-3 rounded-xl border border-mc-line px-4 py-3">
      <div className="font-bold text-mc-navy">{m.name}</div>
      <div className="mt-0.5 text-xs text-mc-ink-soft">
        Started {formatLongDate(m.start)}
        {m.end ? ` · Ended ${formatLongDate(m.end)}` : ''}
        {m.provider ? ` · ${m.provider}` : ''}
      </div>
    </article>
  );
}
