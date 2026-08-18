import { useOutletContext } from 'react-router-dom';
import { formatWhen, plansFor } from './portalData';
import { formatLongDate } from '../dashboard/clients/clientData';

export default function PortalTracking() {
  const { me } = useOutletContext();
  const patient = me?.patient;
  if (!me) return <p className="text-sm text-mc-ink-soft">Loading…</p>;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (me.appointments || []).filter((a) => a.date >= today && !['cancelled', 'declined', 'completed', 'no-show'].includes(a.status));
  const past = (me.appointments || []).filter((a) => a.date < today || a.status === 'completed');
  const plan = plansFor(patient.id, patient.name).find((p) => p.status === 'active');

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Care status</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <Item k="Status" v={patient.status === 'new' ? 'New intake' : patient.status === 'inactive' ? 'On hold' : 'Active care'} />
          <Item k="Therapist" v={patient.therapist} />
          <Item k="Presenting concern" v={patient.primary_concern} />
          <Item k="Session cadence" v={patient.frequency} />
          <Item k="Visit preference" v={patient.visit_pref} />
          <Item k="Care started" v={formatLongDate(patient.care_started)} />
        </dl>
      </section>

      {plan && (
        <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
          <h2 className="font-bold text-mc-navy">Treatment goals</h2>
          <p className="mt-1 text-xs text-mc-ink-soft">Shared goals from your care plan — not clinical session notes.</p>
          <ul className="mt-3 space-y-2">
            {(plan.goals || [{ text: plan.goal, status: 'In Progress' }]).map((g, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-[#faf7f1] px-3 py-2 text-sm">
                <span>{g.text || g}</span>
                <span className="font-bold text-mc-navy">{g.status || 'In Progress'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Upcoming sessions</h2>
        {!upcoming.length ? (
          <p className="mt-2 text-sm text-mc-ink-soft">No upcoming sessions.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-lg border border-mc-line px-3 py-2 text-sm">
                <div className="font-semibold">{formatWhen(a.date, a.time)}</div>
                <div className="text-mc-ink-soft">{a.type === 'video' ? 'Video' : 'In-person'} · {a.duration} min · {a.reason} · {a.therapist}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Session history</h2>
        <p className="mt-1 text-xs text-mc-ink-soft">Dates and visit type only. Clinical notes stay with your therapist.</p>
        {!past.length ? (
          <p className="mt-2 text-sm text-mc-ink-soft">No past sessions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {past.map((a) => (
              <li key={a.id} className="rounded-lg border border-mc-line px-3 py-2 text-sm">
                <div className="font-semibold">{formatWhen(a.date, a.time)}</div>
                <div className="text-mc-ink-soft">{a.type === 'video' ? 'Video' : 'In-person'} · {a.status} · {a.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Item({ k, v }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-mc-ink-soft">{k}</dt>
      <dd className="font-semibold text-mc-ink">{v || '—'}</dd>
    </div>
  );
}
