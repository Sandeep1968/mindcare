import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../../../auth/AuthContext';
import {
  ageFromDob,
  billingForClient,
  buildCareJourney,
  canEditClients,
  canViewBilling,
  canViewClinical,
  ensureClientDemoStores,
  formatLongDate,
  formatShortDate,
  formatTime,
  initials,
  nextAppointment,
  outstandingBalance,
  readLocal,
  refreshBillingCache,
  statusLabel,
  writeLocal,
} from './clientData';
import {
  addPayment,
  balanceDue,
  canManageBilling,
  createInvoice,
  deleteInvoice,
  invoiceStatus,
  money,
  paidAmount,
  printSuperbill,
  updateInvoice,
  voidInvoice,
} from './billingStore';
import { InvoiceModal, PaymentModal, StatusBadge } from '../Billing';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'sessions', label: 'Therapy Sessions' },
  { id: 'plans', label: 'Treatment Plans' },
  { id: 'medications', label: 'Medications' },
  { id: 'forms', label: 'Forms & Documents' },
  { id: 'billing', label: 'Billing', billingOnly: true },
  { id: 'notes', label: 'Notes' },
];

export default function Client360() {
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [timelineCat, setTimelineCat] = useState('all');
  const [timelineRange, setTimelineRange] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [tick, setTick] = useState(0);

  const tab = searchParams.get('tab') || 'overview';
  const clinical = canViewClinical(user?.role);
  const billingOk = canViewBilling(user?.role);
  const billingManage = canManageBilling(user?.role);
  const canEdit = canEditClients(user?.role);

  const visibleTabs = TABS.filter((t) => !t.billingOnly || billingOk);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/patients/${clientId}`);
      ensureClientDemoStores([d]);
      await refreshBillingCache(clientId);
      setDetail(d);
      setError('');
      setTick((t) => t + 1);
    } catch (e) {
      setDetail(null);
      setError(e.message || 'Unable to load this client\'s information.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function onSync() { setTick((t) => t + 1); }
    window.addEventListener('mindcare:billing', onSync);
    return () => window.removeEventListener('mindcare:billing', onSync);
  }, []);

  const appointments = detail?.appointments || [];
  const balance = detail ? outstandingBalance(detail) : 0;
  const next = detail ? nextAppointment(detail, appointments) : null;
  const completedSessions = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => (b.appt_date || b.date || '').localeCompare(a.appt_date || a.date || ''));

  const plans = useMemo(() => {
    if (!detail) return [];
    return readLocal('mindcare.demo.plans', []).filter(
      (p) => p.patientId === detail.id || p.client === detail.name,
    );
  }, [detail, tick]);

  const activePlan = plans.find((p) => p.status === 'active');

  const clinicalNotes = useMemo(() => {
    if (!detail) return [];
    return readLocal('mindcare.demo.notes', []).filter((n) => n.patientId === detail.id);
  }, [detail, tick]);

  const meds = useMemo(() => {
    if (!detail) return [];
    return readLocal('mindcare.demo.medications', []).filter((m) => m.patientId === detail.id);
  }, [detail, tick]);

  const forms = useMemo(() => {
    if (!detail) return [];
    return readLocal('mindcare.demo.clientForms', []).filter((f) => f.patientId === detail.id);
  }, [detail, tick]);

  const adminNotes = useMemo(() => {
    if (!detail) return [];
    const stored = readLocal('mindcare.demo.adminNotes', []).filter((n) => n.patientId === detail.id);
    if (detail.notes) {
      return [
        { id: 'profile-note', text: detail.notes, date: (detail.care_started || detail.created_at || '').slice(0, 10), author: 'Profile' },
        ...stored,
      ];
    }
    return stored;
  }, [detail, tick]);

  const bills = detail && billingOk ? billingForClient(detail) : [];
  const charges = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const paidTotal = bills.reduce((s, b) => s + paidAmount(b), 0);

  const journey = useMemo(() => {
    if (!detail) return [];
    return buildCareJourney(detail, { appointments, role: user?.role });
  }, [detail, appointments, user?.role, tick]);

  const filteredJourney = useMemo(() => {
    let list = journey;
    if (timelineCat !== 'all') list = list.filter((e) => e.category === timelineCat);
    const today = new Date();
    if (timelineRange === '30') {
      const cut = new Date(today); cut.setDate(cut.getDate() - 30);
      list = list.filter((e) => new Date(`${e.date}T12:00:00`) >= cut);
    } else if (timelineRange === '90') {
      const cut = new Date(today); cut.setDate(cut.getDate() - 90);
      list = list.filter((e) => new Date(`${e.date}T12:00:00`) >= cut);
    } else if (timelineRange === 'year') {
      list = list.filter((e) => e.date?.startsWith(String(today.getFullYear())));
    }
    return list;
  }, [journey, timelineCat, timelineRange]);

  function setTab(id) {
    setSearchParams({ tab: id }, { replace: true });
  }

  async function deactivate() {
    if (!canEdit || !detail) return;
    if (!window.confirm('Deactivate this client? Historical records are kept.')) return;
    try {
      await api(`/patients/${detail.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'inactive' }) });
      setMoreOpen(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function saveAdminNote(e) {
    e.preventDefault();
    if (!noteText.trim() || !detail) return;
    const all = readLocal('mindcare.demo.adminNotes', []);
    const next = [
      {
        id: crypto.randomUUID(),
        patientId: detail.id,
        text: noteText.trim(),
        date: new Date().toISOString().slice(0, 10),
        author: user?.name || 'Staff',
      },
      ...all,
    ];
    writeLocal('mindcare.demo.adminNotes', next);
    setNoteText('');
    setShowNote(false);
    setTick((t) => t + 1);
  }

  const age = detail ? ageFromDob(detail.dob) : null;

  if (loading) {
    return <p className="rounded-xl border border-mc-line bg-white p-8 text-sm text-mc-ink-soft">Loading client profile…</p>;
  }

  if (error && !detail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="font-semibold text-red-900">{error}</p>
        <div className="mt-3 flex justify-center gap-3">
          <button type="button" onClick={load} className="rounded-lg bg-mc-navy px-3 py-2 text-sm font-bold text-white">Try Again</button>
          <Link to="/dashboard/patients" className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">Back to Clients</Link>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div>
      <Link to="/dashboard/patients" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-mc-navy hover:underline">
        ← Back to Clients
      </Link>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mc-navy-soft text-lg font-bold text-mc-navy" aria-hidden>
              {initials(detail.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-mc-navy">{detail.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${(detail.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-800' : (detail.status === 'new' ? 'bg-mc-gold-soft text-mc-gold-deep' : 'bg-slate-100 text-slate-600')}`}>
                  {statusLabel(detail.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-mc-ink-soft">
                {detail.client_code || '—'}
                {age != null && ` · ${age} yrs`}
                {detail.dob && ` · DOB ${formatLongDate(detail.dob)}`}
                {detail.gender && ` · ${detail.gender}`}
              </p>
              <p className="mt-1 text-sm text-mc-ink-soft">
                {[detail.phone, detail.email, detail.city].filter(Boolean).join(' · ') || 'No contact on file'}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-mc-ink-soft">Assigned Therapist:</span>{' '}
                <span className="font-semibold text-mc-ink">{detail.therapist || '—'}</span>
                <span className="mx-2 text-mc-line">·</span>
                <span className="text-mc-ink-soft">Primary service:</span>{' '}
                <span className="font-semibold text-mc-ink">{detail.care_type || '—'}</span>
              </p>
            </div>
          </div>

          <div className="relative flex flex-wrap gap-2">
            <Link
              to={`/dashboard/appointments?client=${detail.id}&book=1`}
              className="rounded-lg bg-mc-navy px-3 py-2 text-sm font-bold text-white"
            >
              Book Appointment
            </Link>
            <button type="button" onClick={() => setShowNote(true)} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">
              Add Note
            </button>
            <button type="button" onClick={() => setMoreOpen((o) => !o)} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold" aria-expanded={moreOpen} aria-haspopup="menu">
              More ▾
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-48 rounded-xl border border-mc-line bg-white py-1 shadow-lg" role="menu">
                <Link to={`/dashboard/patients/${detail.id}?tab=overview`} className="block px-4 py-2 text-sm hover:bg-mc-gold-soft" role="menuitem" onClick={() => setMoreOpen(false)}>Edit Client</Link>
                {canEdit && (
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-mc-gold-soft" role="menuitem" onClick={deactivate}>
                    Deactivate Client
                  </button>
                )}
                <button type="button" className="block w-full px-4 py-2 text-left text-sm text-mc-ink-soft" role="menuitem" disabled title="Audit history requires backend logging">
                  View Audit History
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact summary */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-mc-line pt-4 sm:grid-cols-4">
          <SummaryStat value={String(completedSessions.length)} label="Total Sessions" />
          <SummaryStat value={next ? formatShortDate(next.appt_date || next.date) : '—'} label="Next Appointment" />
          <SummaryStat value={statusLabel(detail.status)} label="Care Status" />
            <SummaryStat value={billingOk ? money(balance) : '—'} label="Outstanding Balance" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <div className="sm:hidden">
          <label className="sr-only" htmlFor="client-tab-select">Section</label>
          <select
            id="client-tab-select"
            className="w-full rounded-xl border border-mc-line bg-white px-3 py-2.5 text-sm font-semibold"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
          >
            {visibleTabs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="hidden gap-1 overflow-x-auto border-b border-mc-line sm:flex" role="tablist" aria-label="Client sections">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'border-mc-navy text-mc-navy' : 'border-transparent text-mc-ink-soft hover:text-mc-navy'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5" role="tabpanel">
        {tab === 'overview' && (
          <OverviewTab
            detail={detail}
            next={next}
            activePlan={activePlan}
            clinical={clinical}
            billingOk={billingOk}
            balance={balance}
            bills={bills}
            charges={charges}
            paidTotal={paidTotal}
            journey={journey.slice(0, 5)}
            onViewTimeline={() => setTab('timeline')}
          />
        )}
        {tab === 'timeline' && (
          <TimelineTab
            events={filteredJourney}
            cat={timelineCat}
            setCat={setTimelineCat}
            range={timelineRange}
            setRange={setTimelineRange}
            clinical={clinical}
            billingOk={billingOk}
          />
        )}
        {tab === 'sessions' && (
          <SessionsTab
            sessions={completedSessions}
            notes={clinicalNotes}
            clinical={clinical}
            selected={selectedSession}
            setSelected={setSelectedSession}
            therapist={detail.therapist}
          />
        )}
        {tab === 'plans' && (
          <PlansTab plans={plans} clinical={clinical} activePlan={activePlan} />
        )}
        {tab === 'medications' && (
          <MedsTab meds={meds} clinical={clinical} />
        )}
        {tab === 'forms' && <FormsTab forms={forms} />}
        {tab === 'billing' && billingOk && (
          <BillingTab
            detail={detail}
            bills={bills}
            balance={balance}
            charges={charges}
            paidTotal={paidTotal}
            manage={billingManage}
            onChanged={() => setTick((t) => t + 1)}
          />
        )}
        {tab === 'notes' && (
          <NotesTab
            adminNotes={adminNotes}
            clinical={clinical}
            onAdd={() => setShowNote(true)}
          />
        )}
      </div>

      {showNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowNote(false); }}>
          <form onSubmit={saveAdminNote} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="note-title">
            <h3 id="note-title" className="text-lg font-bold text-mc-navy">Add administrative note</h3>
            <p className="mt-1 text-xs text-mc-ink-soft">Separate from clinical SOAP/DAP documentation.</p>
            <textarea
              required
              className="mt-3 min-h-28 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
              placeholder="e.g. Client prefers evening appointments."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setShowNote(false)} className="flex-1 rounded-xl border border-mc-line py-2 text-sm font-semibold">Cancel</button>
              <button className="flex-1 rounded-xl bg-mc-navy py-2 text-sm font-bold text-white">Save Note</button>
            </div>
            {clinical && (
              <Link to="/dashboard/clinical/notes" className="mt-3 block text-center text-sm font-semibold text-mc-navy underline" onClick={() => setShowNote(false)}>
                Open Clinical Care for session notes →
              </Link>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ value, label }) {
  return (
    <div>
      <div className="text-xl font-bold text-mc-navy">{value}</div>
      <div className="text-xs font-semibold text-mc-ink-soft">{label}</div>
    </div>
  );
}

function OverviewTab({ detail, next, activePlan, clinical, billingOk, balance, bills, charges, paidTotal, journey, onViewTimeline }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <h2 className="font-bold text-mc-navy">Current Care</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Item k="Primary Service" v={detail.care_type} />
          <Item k="Care Type" v="Ongoing Therapy" />
          <Item k="Therapist" v={detail.therapist} />
          <Item k="Started" v={formatLongDate(detail.care_started)} />
          <Item k="Visit Preference" v={detail.visit_pref} />
          <Item k="Frequency" v={detail.frequency} />
          {clinical && <Item k="Primary Concern" v={detail.primary_concern || '—'} className="sm:col-span-2" />}
        </dl>
      </section>

      <section className="rounded-xl border border-mc-line bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-mc-navy">Current Treatment Plan</h2>
          {activePlan && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Active</span>
          )}
        </div>
        {!clinical ? (
          <p className="mt-3 text-sm text-mc-ink-soft">Treatment plan details are restricted for your role.</p>
        ) : !activePlan ? (
          <div className="mt-3">
            <p className="text-sm text-mc-ink-soft">No active treatment plan.</p>
            <Link to="/dashboard/clinical/plans" className="mt-2 inline-block text-sm font-bold text-mc-navy underline">Create Treatment Plan</Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-mc-ink-soft">
              Updated {formatLongDate(activePlan.updated)}
              {activePlan.review && ` · Review ${formatLongDate(activePlan.review)}`}
            </p>
            <ul className="mt-3 space-y-2">
              {(activePlan.goals || [{ text: activePlan.goal, status: 'In Progress' }]).map((g, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span>{g.text || g}</span>
                  <span className="rounded-full bg-mc-navy-soft px-2 py-0.5 text-[11px] font-bold text-mc-navy">{g.status || 'In Progress'}</span>
                </li>
              ))}
            </ul>
            <Link to="/dashboard/clinical/plans" className="mt-3 inline-block text-sm font-bold text-mc-navy underline">View Treatment Plan</Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-mc-line bg-white p-5">
        <h2 className="font-bold text-mc-navy">Next Appointment</h2>
        {!next ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No upcoming appointment.</p>
        ) : (
          <div className="mt-3">
            <p className="text-lg font-bold text-mc-navy">
              {formatLongDate(next.appt_date || next.date)} · {formatTime(next.appt_time || next.time)}
            </p>
            <p className="mt-1 text-sm text-mc-ink-soft">
              {next.therapist || detail.therapist} · {(next.session_type || next.type) === 'video' ? 'Virtual' : 'In-person'}
              {(next.duration_min || next.duration) && ` · ${next.duration_min || next.duration} min`}
            </p>
            <p className="mt-1 text-sm">{next.reason || detail.care_type}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/dashboard/appointments" className="rounded-lg border border-mc-line px-3 py-1.5 text-sm font-semibold">View Appointment</Link>
              {(next.session_type === 'video' || next.type === 'video') && next.video_link && (
                <a href={next.video_link} target="_blank" rel="noreferrer" className="rounded-lg bg-mc-gold px-3 py-1.5 text-sm font-bold text-mc-ink">Join Session</a>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-mc-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-mc-navy">Recent Activity</h2>
          <button type="button" onClick={onViewTimeline} className="text-sm font-bold text-mc-navy underline">View Full Timeline</button>
        </div>
        {!journey.length ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {journey.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 text-mc-ink-soft">{formatShortDate(e.date)}</span>
                <div>
                  <div className="font-semibold text-mc-ink">{e.title}</div>
                  <div className="text-xs text-mc-ink-soft">{e.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {billingOk && (
        <section className="rounded-xl border border-mc-line bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-mc-navy">Billing Summary</h2>
            <Link to="/dashboard/billing" className="text-sm font-bold text-mc-navy underline">View Billing</Link>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <Item k="Payer" v={payerLabel(detail.payer_type)} />
            <Item k="Payment" v={bills[0]?.method || 'Card'} />
            <Item k="Outstanding" v={money(balance)} />
            <Item k="Paid / Charged" v={`${money(paidTotal)} / ${money(charges)}`} />
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-mc-line bg-white p-5 lg:col-span-2">
        <h2 className="mb-3 font-bold text-mc-navy">Quick Actions</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          <Link to={`/dashboard/appointments?client=${detail.id}&book=1`} className="rounded-xl border border-mc-line px-3 py-3 text-center text-sm font-semibold hover:bg-mc-gold-soft">Book Appointment</Link>
          <button type="button" onClick={onViewTimeline} className="rounded-xl border border-mc-line px-3 py-3 text-sm font-semibold hover:bg-mc-gold-soft">Care Journey</button>
          <Link to="/dashboard/communication" className="rounded-xl border border-mc-line px-3 py-3 text-center text-sm font-semibold hover:bg-mc-gold-soft">Send Message</Link>
          <Link to="/dashboard/clinical/forms" className="rounded-xl border border-mc-line px-3 py-3 text-center text-sm font-semibold hover:bg-mc-gold-soft">Client Documents</Link>
        </div>
      </section>
    </div>
  );
}

function Item({ k, v, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold text-mc-ink-soft">{k}</dt>
      <dd className="font-semibold text-mc-ink">{v || '—'}</dd>
    </div>
  );
}

function payerLabel(p) {
  if (p === 'insurance') return 'Insurance';
  if (p === 'other') return 'Other';
  return 'Self-Pay';
}

function TimelineTab({ events, cat, setCat, range, setRange, clinical, billingOk }) {
  const cats = [
    ['all', 'All'],
    ['appointments', 'Appointments'],
    ['sessions', 'Sessions'],
    ...(clinical ? [['plans', 'Treatment Plans'], ['medications', 'Medications']] : []),
    ['forms', 'Forms'],
    ...(billingOk ? [['billing', 'Billing']] : []),
    ['notes', 'Notes'],
  ];
  return (
    <div>
      <h2 className="text-lg font-bold text-mc-navy">Client Care Journey</h2>
      <p className="mt-1 text-sm text-mc-ink-soft">Events aggregated from appointments, clinical care, forms, and billing — one source of truth.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCat(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${cat === id ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label className="text-xs font-semibold text-mc-ink-soft">
          Date range{' '}
          <select className="ml-1 rounded-lg border border-mc-line px-2 py-1 text-sm" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="year">This Year</option>
          </select>
        </label>
      </div>
      {!events.length ? (
        <p className="mt-8 text-sm text-mc-ink-soft">No timeline events for this filter.</p>
      ) : (
        <ol className="relative mt-6 space-y-0 border-l-2 border-mc-line ml-3">
          {events.map((e) => (
            <li key={e.id} className="relative pb-6 pl-6">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-mc-navy bg-white" aria-hidden />
              <div className="text-xs font-semibold text-mc-ink-soft">{formatLongDate(e.date)}</div>
              <div className="font-bold text-mc-navy">{e.title}</div>
              <div className="text-sm text-mc-ink-soft">{e.detail}</div>
              {e.href && (
                <Link to={e.href} className="mt-1 inline-block text-xs font-bold text-mc-navy underline">Open</Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SessionsTab({ sessions, notes, clinical, selected, setSelected, therapist }) {
  if (!sessions.length) {
    return <p className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center text-sm text-mc-ink-soft">No therapy sessions recorded yet.</p>;
  }
  const noteFor = (s) => notes.find((n) => n.date === (s.appt_date || s.date));
  if (selected) {
    const n = noteFor(selected);
    return (
      <div className="rounded-xl border border-mc-line bg-white p-5">
        <button type="button" onClick={() => setSelected(null)} className="mb-3 text-sm font-semibold text-mc-navy underline">← Back to sessions</button>
        <h2 className="text-lg font-bold text-mc-navy">{selected.reason || 'Therapy Session'}</h2>
        <p className="mt-1 text-sm text-mc-ink-soft">
          {formatLongDate(selected.appt_date || selected.date)} · {formatTime(selected.appt_time || selected.time)} · {selected.duration_min || 50} min · {(selected.session_type || selected.type) === 'video' ? 'Virtual' : 'In-person'}
        </p>
        <p className="mt-1 text-sm">Therapist: {selected.therapist || therapist}</p>
        <p className="mt-1 text-sm">Status: Completed</p>
        {clinical ? (
          <div className="mt-4 rounded-lg bg-[#faf7f1] p-4">
            <h3 className="text-sm font-bold text-mc-navy">Documentation</h3>
            {n ? (
              <>
                <p className="mt-1 text-xs text-mc-ink-soft">{n.type || 'DAP'} Note</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-mc-ink-soft">No clinical note linked for this date.</p>
            )}
            <Link to="/dashboard/clinical/notes" className="mt-3 inline-block text-sm font-bold text-mc-navy underline">Open Clinical Care</Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-mc-ink-soft">Clinical documentation is restricted for your role.</p>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-bold text-mc-navy">Therapy Sessions</h2>
        <span className="text-sm text-mc-ink-soft">{sessions.length} Sessions</span>
      </div>
      <div className="space-y-3">
        {sessions.map((s) => {
          const n = noteFor(s);
          return (
            <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mc-line bg-white p-4">
              <div>
                <div className="font-bold text-mc-navy">{formatLongDate(s.appt_date || s.date)}</div>
                <div className="text-sm font-semibold">{s.reason || 'Session'}</div>
                <div className="text-xs text-mc-ink-soft">
                  {s.therapist || therapist} · {s.duration_min || 50} min · {(s.session_type || s.type) === 'video' ? 'Virtual' : 'In-person'} · Completed
                  {clinical && n && ` · ${n.type || 'DAP'} Note ✓`}
                </div>
              </div>
              <button type="button" onClick={() => setSelected(s)} className="rounded-lg border border-mc-line px-3 py-1.5 text-sm font-semibold">
                View Session
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function PlansTab({ plans, clinical, activePlan }) {
  if (!clinical) {
    return <p className="rounded-xl border border-mc-line bg-white p-6 text-sm text-mc-ink-soft">Treatment plans are restricted for your role.</p>;
  }
  if (!plans.length) {
    return (
      <div className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center">
        <p className="text-sm text-mc-ink-soft">No active treatment plan.</p>
        <Link to="/dashboard/clinical/plans" className="mt-3 inline-block rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">Create Treatment Plan</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {activePlan && (
        <section className="rounded-xl border border-mc-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-mc-navy">Current Active Plan</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Active</span>
          </div>
          <p className="mt-2 text-xs text-mc-ink-soft">
            Created {formatLongDate(activePlan.created)} · Updated {formatLongDate(activePlan.updated)}
            {activePlan.review && ` · Review ${formatLongDate(activePlan.review)}`}
          </p>
          <h3 className="mt-4 text-sm font-bold text-mc-ink">Goals</h3>
          <ul className="mt-2 space-y-2">
            {(activePlan.goals || [{ text: activePlan.goal, status: 'In Progress' }]).map((g, i) => (
              <li key={i} className="flex justify-between gap-2 rounded-lg bg-[#faf7f1] px-3 py-2 text-sm">
                <span>{g.text || g}</span>
                <span className="font-bold text-mc-navy">{g.status || 'In Progress'}</span>
              </li>
            ))}
          </ul>
          {activePlan.focus && (
            <>
              <h3 className="mt-4 text-sm font-bold text-mc-ink">Interventions</h3>
              <p className="mt-1 text-sm text-mc-ink-soft">{activePlan.focus}</p>
            </>
          )}
          <Link to="/dashboard/clinical/plans" className="mt-4 inline-block text-sm font-bold text-mc-navy underline">Open in Clinical Care</Link>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-bold text-mc-navy">Treatment Plan History</h2>
        {plans.filter((p) => p.status !== 'active').length === 0 ? (
          <p className="text-sm text-mc-ink-soft">No archived plans.</p>
        ) : (
          plans.filter((p) => p.status !== 'active').map((p) => (
            <article key={p.id} className="mb-2 rounded-xl border border-mc-line bg-white p-4">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{p.goal}</span>
                <span className="text-xs font-bold uppercase text-mc-ink-soft">{p.status}</span>
              </div>
              <p className="text-xs text-mc-ink-soft">Updated {formatLongDate(p.updated)}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function MedsTab({ meds, clinical }) {
  if (!clinical) {
    return <p className="rounded-xl border border-mc-line bg-white p-6 text-sm text-mc-ink-soft">Medication history is restricted for your role.</p>;
  }
  if (!meds.length) {
    return <p className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center text-sm text-mc-ink-soft">No medication records available.</p>;
  }
  const current = meds.filter((m) => m.status === 'current');
  const previous = meds.filter((m) => m.status !== 'current');
  return (
    <div className="space-y-6">
      <p className="text-sm text-mc-ink-soft">Medication history only — no e-prescribing in this workspace.</p>
      <section>
        <h2 className="mb-3 font-bold text-mc-navy">Current Medications</h2>
        {!current.length ? <p className="text-sm text-mc-ink-soft">None on file.</p> : current.map((m) => <MedRow key={m.id} m={m} />)}
      </section>
      <section>
        <h2 className="mb-3 font-bold text-mc-navy">Previous Medications</h2>
        {!previous.length ? <p className="text-sm text-mc-ink-soft">None on file.</p> : previous.map((m) => <MedRow key={m.id} m={m} />)}
      </section>
    </div>
  );
}

function MedRow({ m }) {
  return (
    <article className="mb-2 rounded-xl border border-mc-line bg-white p-4 text-sm">
      <div className="font-bold text-mc-navy">{m.name}</div>
      <div className="mt-1 text-xs text-mc-ink-soft">
        {m.status} · Started {formatLongDate(m.start)}
        {m.end && ` · Ended ${formatLongDate(m.end)}`}
        {m.provider && ` · ${m.provider}`}
        {m.updated && ` · Updated ${formatLongDate(m.updated)}`}
      </div>
    </article>
  );
}

function FormsTab({ forms }) {
  if (!forms.length) {
    return <p className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center text-sm text-mc-ink-soft">No forms or documents yet.</p>;
  }
  return (
    <div>
      <h2 className="mb-3 font-bold text-mc-navy">Forms & Documents</h2>
      <div className="rounded-xl border border-mc-line bg-white">
        {forms.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-mc-line px-4 py-3 last:border-0">
            <div>
              <div className="font-semibold">{f.name}</div>
              <div className="text-xs text-mc-ink-soft">{formatLongDate(f.date)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${f.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' : f.status === 'Pending' ? 'bg-mc-gold-soft text-mc-gold-deep' : 'bg-mc-navy-soft text-mc-navy'}`}>
                {f.status}
              </span>
              <Link to="/dashboard/clinical/forms" className="text-sm font-semibold text-mc-navy underline">View</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingTab({ detail, bills, balance, charges, paidTotal, manage, onChanged }) {
  const [payModal, setPayModal] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [toast, setToast] = useState('');

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  if (!manage) {
    return (
      <div className="rounded-xl border border-mc-line bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-mc-ink-soft">Current balance</span>
          <strong className="text-2xl text-mc-gold">{money(balance)}</strong>
        </div>
        <p className="mt-3 text-sm text-mc-ink-soft">Billing access is limited for your role.</p>
        <Link to="/dashboard/billing" className="mt-3 inline-block text-sm font-bold text-mc-navy underline">View Billing</Link>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-mc-ink px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-mc-navy">Billing</h2>
          <p className="text-xs text-mc-ink-soft">Same invoices as Billing & Payments.</p>
        </div>
        <button type="button" onClick={() => setInvoiceModal({ mode: 'new' })} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">
          + New Invoice
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-mc-line bg-white px-4 py-3">
          <div className="text-2xl font-bold text-mc-gold">{money(charges)}</div>
          <div className="text-sm font-semibold">Billed</div>
        </div>
        <div className="rounded-2xl border border-mc-line bg-white px-4 py-3">
          <div className="text-2xl font-bold text-mc-gold">{money(paidTotal)}</div>
          <div className="text-sm font-semibold">Collected</div>
        </div>
        <div className="rounded-2xl border border-mc-line bg-white px-4 py-3">
          <div className="text-2xl font-bold text-mc-gold">{money(balance)}</div>
          <div className="text-sm font-semibold">Outstanding</div>
        </div>
      </div>

      {!bills.length ? (
        <p className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center text-sm text-mc-ink-soft">No billing information available.</p>
      ) : (
        <div className="rounded-2xl border border-mc-line bg-white shadow-sm">
          {bills
            .slice()
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map((inv) => {
              const st = invoiceStatus(inv);
              return (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-mc-line px-5 py-4 last:border-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-mc-navy">{detail.name} — {money(inv.amount)}</span>
                      <StatusBadge status={st} />
                    </div>
                    <div className="mt-1 text-sm text-mc-ink-soft">
                      {formatLongDate(inv.date)} · {inv.description || inv.note}
                      {st === 'partial' && ` · due ${money(balanceDue(inv))}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {st !== 'paid' && (
                      <button type="button" onClick={() => setPayModal(inv)} className="rounded-lg bg-mc-gold px-3 py-1.5 text-sm font-bold text-mc-ink">
                        Record payment
                      </button>
                    )}
                    <button type="button" onClick={() => printSuperbill(inv, detail)} className="rounded-lg border border-mc-navy/25 px-3 py-1.5 text-sm font-semibold text-mc-navy">
                      Print
                    </button>
                    <button type="button" onClick={() => setInvoiceModal({ mode: 'edit', inv })} className="rounded-lg border border-mc-navy/25 px-3 py-1.5 text-sm font-semibold text-mc-navy">
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <Link to="/dashboard/billing" className="mt-3 inline-block text-sm font-bold text-mc-navy underline">Open Billing module</Link>

      {payModal && (
        <PaymentModal
          inv={payModal}
          onClose={() => setPayModal(null)}
          onSave={async (data) => {
            try {
              await addPayment(payModal.id, data);
              setPayModal(null);
              await refreshBillingCache(detail.id);
              onChanged();
              flash('Payment recorded');
            } catch (e) {
              flash(e.message || 'Payment failed');
            }
          }}
        />
      )}
      {invoiceModal && (
        <InvoiceModal
          mode={invoiceModal.mode}
          inv={invoiceModal.inv}
          patients={[detail]}
          lockedClient={detail}
          onClose={() => setInvoiceModal(null)}
          onSave={async (data, id) => {
            try {
              if (id) await updateInvoice(id, { ...data, patientId: detail.id });
              else await createInvoice({ ...data, patientId: detail.id });
              setInvoiceModal(null);
              await refreshBillingCache(detail.id);
              onChanged();
              flash('Invoice saved');
            } catch (e) {
              flash(e.message || 'Failed to save');
            }
          }}
          onDelete={async (id) => {
            if (!window.confirm('Delete this invoice and its payment history?')) return;
            try {
              await deleteInvoice(id);
              setInvoiceModal(null);
              await refreshBillingCache(detail.id);
              onChanged();
              flash('Invoice deleted');
            } catch (e) {
              flash(e.message);
            }
          }}
          onVoid={async (id) => {
            if (!window.confirm('Void this invoice?')) return;
            try {
              await voidInvoice(id);
              setInvoiceModal(null);
              await refreshBillingCache(detail.id);
              onChanged();
              flash('Invoice voided');
            } catch (e) {
              flash(e.message);
            }
          }}
        />
      )}
    </div>
  );
}

function NotesTab({ adminNotes, clinical, onAdd }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-mc-navy">Administrative Notes</h2>
          <p className="text-xs text-mc-ink-soft">Separate from clinical SOAP/DAP notes in Clinical Care.</p>
        </div>
        <button type="button" onClick={onAdd} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">Add Note</button>
      </div>
      {!adminNotes.length ? (
        <p className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center text-sm text-mc-ink-soft">No administrative notes yet.</p>
      ) : (
        <div className="space-y-3">
          {adminNotes.map((n) => (
            <article key={n.id} className="rounded-xl border border-mc-line bg-white p-4">
              <div className="text-xs text-mc-ink-soft">{formatLongDate(n.date)}{n.author ? ` · ${n.author}` : ''}</div>
              <p className="mt-1 text-sm">{n.text}</p>
            </article>
          ))}
        </div>
      )}
      {clinical && (
        <Link to="/dashboard/clinical/notes" className="mt-4 inline-block text-sm font-bold text-mc-navy underline">
          Clinical documentation → Clinical Care
        </Link>
      )}
    </div>
  );
}
