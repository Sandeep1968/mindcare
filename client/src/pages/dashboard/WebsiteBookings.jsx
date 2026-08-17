import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

function Badge({ children, tone = 'gold' }) {
  const cls = tone === 'navy' ? 'bg-mc-navy-soft text-mc-navy' : tone === 'ok' ? 'bg-green-100 text-green-800' : tone === 'bad' ? 'bg-red-100 text-red-800' : 'bg-mc-gold-soft text-mc-gold-deep';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 border-b border-mc-line py-2 text-sm last:border-0">
      <dt className="text-xs font-semibold text-mc-ink-soft">{label}</dt>
      <dd className="text-mc-ink">{value}</dd>
    </div>
  );
}

export default function WebsiteBookings() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('new');
  const [kind, setKind] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [calendarLinks, setCalendarLinks] = useState(null);

  async function load() {
    try {
      const data = await api(`/bookings?status=${status}&kind=${kind}`);
      setRows(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
      if (selectedId && !data.some((r) => r.id === selectedId)) setSelectedId(data[0]?.id || null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [status, kind]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  async function confirm(id) {
    setBusy(true);
    setError('');
    try {
      const result = await api(`/bookings/${id}/confirm`, { method: 'POST' });
      const n = result.notify;
      const bits = [];
      if (n?.notified?.patient) bits.push('client emailed');
      if (n?.notified?.therapist) bits.push('therapist emailed + calendar hold');
      setToast(bits.length ? `Confirmed — ${bits.join('; ')}${n?.mode === 'demo' ? ' (saved to demo outbox)' : ''}` : 'Confirmed on schedule');
      setCalendarLinks(n?.googleCalendar || null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function decline(id) {
    if (!window.confirm('Decline this website booking?')) return;
    setBusy(true);
    try {
      await api(`/bookings/${id}/decline`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-mc-navy">Website bookings</h2>
        <p className="text-sm text-mc-ink-soft">Virtual and in-person requests from the public site — matching and assessment details appear when attached.</p>
      </div>

      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
      {toast && <p className="mb-3 rounded-xl border border-mc-navy/20 bg-mc-navy-soft px-3 py-2 text-sm font-semibold text-mc-navy">{toast}</p>}
      {calendarLinks && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-mc-gold/40 bg-mc-gold-soft px-3 py-2 text-sm">
          <a href={calendarLinks.therapist} target="_blank" rel="noreferrer" className="font-bold text-mc-navy underline">Block therapist on Google Calendar</a>
          <a href={calendarLinks.patient} target="_blank" rel="noreferrer" className="font-bold text-mc-navy underline">Client Google Calendar link</a>
          <button type="button" className="font-bold text-mc-ink-soft" onClick={() => setCalendarLinks(null)}>Dismiss</button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ['all', 'All'],
          ['video', 'Virtual'],
          ['in-person', 'In-person'],
        ].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${kind === k ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white text-mc-ink-soft'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['new', 'all', 'confirmed', 'declined'].map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${status === s ? 'bg-mc-gold text-mc-ink' : 'border border-mc-line bg-white text-mc-ink-soft'}`}>
            {s === 'all' ? 'All statuses' : s}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-xl border border-mc-line bg-white p-3 shadow-sm">
          {!rows.length ? (
            <p className="p-4 text-sm text-mc-ink-soft">No bookings in this filter.</p>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`mb-2 w-full rounded-xl border p-3 text-left ${selectedId === r.id ? 'border-mc-navy bg-mc-navy-soft/40' : 'border-mc-line hover:border-mc-gold'}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5 font-semibold text-mc-ink">
                  {r.name}
                  <Badge tone={r.status === 'new' ? 'gold' : r.status === 'confirmed' ? 'ok' : 'bad'}>{r.status}</Badge>
                  <Badge tone={r.sessionType === 'in-person' ? 'navy' : 'gold'}>{r.sessionType === 'in-person' ? 'In-person' : 'Virtual'}</Badge>
                </div>
                <div className="text-xs text-mc-ink-soft">{r.preferredDate} · {r.preferredTime} · {r.service}</div>
                {r.assessment && <div className="text-xs text-mc-ink-soft">Assessment attached</div>}
              </button>
            ))
          )}
        </div>

        <div className="rounded-xl border border-mc-line bg-white p-4 shadow-sm lg:sticky lg:top-20">
          {!selected ? (
            <p className="text-sm text-mc-ink-soft">Select a booking to see details.</p>
          ) : (
            <>
              <h3 className="text-lg font-bold text-mc-navy">{selected.name}</h3>
              <div className="mb-3 mt-1 flex gap-1.5">
                <Badge tone={selected.sessionType === 'in-person' ? 'navy' : 'gold'}>{selected.sessionType === 'in-person' ? 'In-person' : 'Virtual'}</Badge>
                <Badge tone={selected.status === 'new' ? 'gold' : selected.status === 'confirmed' ? 'ok' : 'bad'}>{selected.status}</Badge>
              </div>
              <dl>
                <Row label="Preferred" value={`${selected.preferredDate} · ${selected.preferredTime}`} />
                <Row label="Email" value={<a className="font-semibold text-mc-navy" href={`mailto:${selected.email}`}>{selected.email}</a>} />
                <Row label="Phone" value={selected.phone || '—'} />
                <Row label="Focus" value={selected.service} />
                <Row label="Audience" value={selected.matchAudience} />
                <Row label="Therapist pref." value={selected.therapistPref} />
                <Row label="Named clinician" value={selected.preferredTherapist || '—'} />
                <Row label="Payer" value={`${selected.payerType}${selected.slidingScale ? ' · sliding scale' : ''}`} />
                <Row label="Client note" value={selected.notes} />
              </dl>
              {selected.match && (
                <div className="mt-3 border-t border-mc-line pt-3">
                  <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-mc-gold-deep">Matching questionnaire</h4>
                  <Row label="Help with" value={selected.match.service} />
                  <Row label="Meet how" value={selected.match.sessionType} />
                </div>
              )}
              {selected.assessment && (
                <div className="mt-3 border-t border-mc-line pt-3">
                  <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-mc-gold-deep">Self-assessment</h4>
                  <Row label="Tool" value={selected.assessment.name || selected.assessment.id} />
                  <Row label="Level" value={selected.assessment.level} />
                  <Row label="Score" value={selected.assessment.total != null ? `${selected.assessment.total} / ${selected.assessment.max}` : null} />
                </div>
              )}
              {selected.status === 'new' && (
                <div className="mt-4 flex gap-2">
                  <button disabled={busy} type="button" onClick={() => confirm(selected.id)} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink disabled:opacity-50">
                    Confirm on schedule
                  </button>
                  <button disabled={busy} type="button" onClick={() => decline(selected.id)} className="rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold disabled:opacity-50">
                    Decline
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
