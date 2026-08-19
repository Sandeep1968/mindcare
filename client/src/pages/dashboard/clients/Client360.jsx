/**
 * Patient chart — the single source of truth for everything about one patient.
 * Each tab shows patient-SPECIFIC information only.
 * Cross-module actions (schedule, billing, clinical notes) navigate to the
 * existing module rather than duplicating its UI here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Copy,
  FileText,
  KeyRound,
  User,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../auth/AuthContext';
import {
  ageFromDob,
  billingForClient,
  buildCareJourney,
  canEditClients,
  canViewBilling,
  canViewClinical,
  formatLongDate,
  formatShortDate,
  formatTime,
  initials,
  nextAppointment,
  outstandingBalance,
  refreshBillingCache,
  statusLabel,
} from './clientData';
import {
  balanceDue,
  invoiceStatus,
  money,
  paidAmount,
  printSuperbill,
} from './billingStore';
import { StatusBadge } from '../Billing';

const TABS = [
  { id: 'overview',       label: 'Overview' },
  { id: 'clinical',       label: 'Clinical', clinicalOnly: true },
  { id: 'sessions',       label: 'Sessions' },
  { id: 'documents',      label: 'Documents' },
  { id: 'forms',          label: 'Forms' },
  { id: 'communication',  label: 'Communication' },
  { id: 'billing',        label: 'Billing', billingOnly: true },
];

export default function Client360() {
  const { clientId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [portalInvite, setPortalInvite] = useState(location.state?.portalInvite || null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [tick, setTick] = useState(0);

  const tab = searchParams.get('tab') || 'overview';
  const [billingLoaded, setBillingLoaded] = useState(false);
  const clinical = canViewClinical(user?.role);
  const billingOk = canViewBilling(user?.role);
  const canEdit = canEditClients(user?.role);

  const visibleTabs = TABS.filter((t) => {
    if (t.clinicalOnly && !clinical) return false;
    if (t.billingOnly && !billingOk) return false;
    return true;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/patients/${clientId}`);
      setDetail(d);
      setError('');
      setTick((t) => t + 1);
    } catch (e) {
      setDetail(null);
      setError(e.message || "Unable to load this patient's chart.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!billingLoaded) return;
    function onSync() { setTick((t) => t + 1); }
    window.addEventListener('mindcare:billing', onSync);
    return () => window.removeEventListener('mindcare:billing', onSync);
  }, [billingLoaded]);

  const appointments = detail?.appointments || [];
  const balance = detail ? outstandingBalance(detail) : 0;
  const next = detail ? nextAppointment(detail, appointments) : null;
  const completedSessions = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => (b.appt_date || b.date || '').localeCompare(a.appt_date || a.date || ''));

  const plans = detail?.plans || [];
  const activePlan = plans.find((p) => p.status === 'active');
  const clinicalNotes = detail?.clinicalNotes || [];
  const meds = detail?.medications || [];
  const forms = detail?.forms || [];
  const adminNotes = useMemo(() => {
    if (!detail) return [];
    const stored = detail.adminNotes || [];
    const profile = typeof detail.notes === 'string' ? detail.notes.trim() : '';
    if (profile) {
      return [
        { id: 'profile-note', text: profile, date: (detail.care_started || detail.created_at || '').slice(0, 10), author: 'Profile' },
        ...stored,
      ];
    }
    return stored;
  }, [detail]);

  const bills = detail && billingOk ? billingForClient(detail) : [];
  const charges = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const paidTotal = bills.reduce((s, b) => s + paidAmount(b), 0);

  const journey = useMemo(() => {
    if (!detail) return [];
    return buildCareJourney(detail, {
      appointments,
      role: user?.role,
      notes: clinicalNotes,
      plans,
      medications: meds,
      forms,
      adminNotes,
    });
  }, [detail, appointments, user?.role, tick]);

  /* Patient-specific attention flags */
  const flags = useMemo(() => {
    const f = [];
    if (detail?.status === 'new') f.push({ key: 'intake', label: 'Intake pending' });
    if (!detail?.emergency && !detail?.emergency_phone) f.push({ key: 'safety', label: 'No emergency contact' });
    const pendingForms = forms.filter((fm) => fm.status === 'Pending' || fm.status === 'Needs Review');
    if (pendingForms.length) f.push({ key: 'forms', label: `${pendingForms.length} form${pendingForms.length > 1 ? 's' : ''} pending` });
    if (activePlan?.review) {
      const review = new Date(`${activePlan.review}T12:00:00`);
      const soon = new Date(); soon.setDate(soon.getDate() + 14);
      if (review <= soon) f.push({ key: 'plan', label: 'Care plan review due' });
    }
    if (balance > 0 && billingOk) f.push({ key: 'payment', label: `Balance $${balance.toFixed(0)}` });
    if (detail && !detail.portal?.hasLogin) f.push({ key: 'portal', label: 'Patient portal not activated' });
    return f;
  }, [detail, forms, activePlan, balance, billingOk]);

  function setTab(id) {
    setSearchParams({ tab: id }, { replace: true });
    /* Lazy-load billing data only on first visit to the billing tab */
    if (id === 'billing' && !billingLoaded && detail) {
      setBillingLoaded(true);
      refreshBillingCache(detail.id).then(() => setTick((t) => t + 1)).catch(() => {});
    }
  }

  async function deactivate() {
    if (!canEdit || !detail) return;
    if (!window.confirm('Deactivate this patient? All records are kept.')) return;
    try {
      await api(`/patients/${detail.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'inactive' }) });
      setMoreOpen(false);
      await load();
    } catch (e) { setError(e.message); }
  }

  async function saveAdminNote(e) {
    e.preventDefault();
    if (!noteText.trim() || !detail) return;
    try {
      await api('/clinical/admin-notes', {
        method: 'POST',
        body: JSON.stringify({ patientId: detail.id, text: noteText.trim() }),
      });
      setNoteText('');
      setShowNote(false);
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  const age = detail ? ageFromDob(detail.dob) : null;

  if (loading) {
    return <p className="rounded-xl border border-mc-line bg-white p-8 text-sm text-mc-ink-soft">Loading patient chart…</p>;
  }

  if (error && !detail) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="font-semibold text-red-900">{error}</p>
        <div className="mt-3 flex justify-center gap-3">
          <button type="button" onClick={load} className="rounded-lg bg-mc-navy px-3 py-2 text-sm font-bold text-white">Retry</button>
          <Link to="/dashboard/patients" className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">Back to Patients</Link>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <Link to="/dashboard/patients" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-mc-navy hover:underline">
        ← Patients
      </Link>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>
      )}

      {/* Patient header */}
      <div className="mb-5 rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mc-navy-soft text-lg font-bold text-mc-navy"
              aria-hidden
            >
              {initials(detail.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-mc-navy">{detail.name}</h1>
                <PatientStatusBadge status={detail.status} />
              </div>
              <p className="mt-1 text-sm text-mc-ink-soft">
                {detail.client_code || 'No chart ID'}
                {age != null && ` · ${age} yrs`}
                {detail.dob && ` · DOB ${formatLongDate(detail.dob)}`}
                {detail.gender && ` · ${detail.gender}`}
              </p>
              <p className="mt-1 text-sm">
                <span className="text-mc-ink-soft">Therapist:</span>{' '}
                <strong className="text-mc-ink">{detail.therapist || '—'}</strong>
                {detail.care_type && (
                  <>
                    <span className="mx-2 text-mc-line">·</span>
                    <span className="text-mc-ink-soft">Modality:</span>{' '}
                    <strong className="text-mc-ink">{detail.care_type}</strong>
                  </>
                )}
              </p>
              {/* Flags in header */}
              {flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {flags.map((f) => (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: '#fef9ec', color: '#92400e', borderColor: '#f5d784' }}
                    >
                      <AlertCircle className="h-3 w-3" />
                      {f.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions — navigate to modules, do not duplicate them */}
          <div className="relative flex flex-wrap gap-2">
            <Link
              to={`/dashboard/appointments?patient=${detail.id}&book=1`}
              className="rounded-lg bg-mc-navy px-3 py-2 text-sm font-bold text-white"
            >
              Schedule session
            </Link>
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold"
            >
              Add note
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More ▾
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-48 rounded-xl border border-mc-line bg-white py-1 shadow-lg" role="menu">
                <Link
                  to={`/dashboard/patients/${detail.id}?tab=overview`}
                  className="block px-4 py-2 text-sm hover:bg-mc-gold-soft"
                  role="menuitem"
                  onClick={() => setMoreOpen(false)}
                >
                  Edit patient record
                </Link>
                {canEdit && (
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-mc-gold-soft"
                    role="menuitem"
                    onClick={deactivate}
                  >
                    Deactivate patient
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <div className="sm:hidden">
          <label className="sr-only" htmlFor="chart-tab-select">Chart section</label>
          <select
            id="chart-tab-select"
            className="w-full rounded-xl border border-mc-line bg-white px-3 py-2.5 text-sm font-semibold"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
          >
            {visibleTabs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="hidden gap-1 overflow-x-auto border-b border-mc-line sm:flex" role="tablist" aria-label="Patient chart">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id ? 'border-mc-navy text-mc-navy' : 'border-transparent text-mc-ink-soft hover:text-mc-navy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      <div role="tabpanel">
        {tab === 'overview' && (
          <OverviewTab
            detail={detail}
            next={next}
            activePlan={activePlan}
            clinical={clinical}
            billingOk={billingOk}
            balance={balance}
            journey={journey.slice(0, 6)}
            flags={flags}
            age={age}
            canEdit={canEdit}
            portalInvite={portalInvite}
            onPortalInvite={setPortalInvite}
            onError={setError}
            onReload={load}
          />
        )}
        {tab === 'clinical' && clinical && (
          <ClinicalTab
            detail={detail}
            activePlan={activePlan}
            plans={plans}
            clinicalNotes={clinicalNotes}
            meds={meds}
          />
        )}
        {tab === 'sessions' && (
          <SessionsTab
            sessions={completedSessions}
            notes={clinicalNotes}
            clinical={clinical}
            therapist={detail.therapist}
            patientId={detail.id}
          />
        )}
        {tab === 'documents' && (
          <DocumentsTab forms={forms} />
        )}
        {tab === 'forms' && (
          <FormsTab forms={forms} />
        )}
        {tab === 'communication' && (
          <CommunicationTab
            detail={detail}
            adminNotes={adminNotes}
            clinical={clinical}
            onAdd={() => setShowNote(true)}
            canEdit={canEdit}
          />
        )}
        {tab === 'billing' && billingOk && (
          <BillingTab detail={detail} bills={bills} balance={balance} charges={charges} paidTotal={paidTotal} />
        )}
      </div>

      {/* Admin note modal */}
      {showNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNote(false); }}
        >
          <form
            onSubmit={saveAdminNote}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-title"
          >
            <h3 id="note-title" className="text-lg font-bold text-mc-navy">Add administrative note</h3>
            <p className="mt-1 text-xs text-mc-ink-soft">
              Administrative notes only — for clinical session documentation go to{' '}
              <Link to="/dashboard/clinical/notes" className="font-semibold underline" onClick={() => setShowNote(false)}>Clinical Notes</Link>.
            </p>
            <textarea
              required
              className="mt-3 min-h-28 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
              placeholder="e.g. Patient prefers morning appointments."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setShowNote(false)} className="flex-1 rounded-xl border border-mc-line py-2 text-sm font-semibold">Cancel</button>
              <button className="flex-1 rounded-xl bg-mc-navy py-2 text-sm font-bold text-white">Save note</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   OVERVIEW TAB
   Patient demographic record + care info + alerts + recent activity
───────────────────────────────────────────────────────── */
function OverviewTab({
  detail, next, activePlan, clinical, billingOk, balance, journey, flags, age,
  canEdit, portalInvite, onPortalInvite, onError, onReload,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">

      {/* Patient information */}
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <SectionHeading icon={User} title="Patient information" />
        <dl className="mt-3 grid gap-y-2 text-sm sm:grid-cols-2">
          <Item k="Full name" v={detail.name} />
          <Item k="Date of birth" v={detail.dob ? formatLongDate(detail.dob) : '—'} />
          <Item k="Age" v={age != null ? `${age} years` : '—'} />
          <Item k="Gender" v={detail.gender || '—'} />
          <Item k="Phone" v={detail.phone || '—'} />
          <Item k="Email" v={detail.email || '—'} />
          <Item k="Address" v={[detail.address, detail.city, detail.state].filter(Boolean).join(', ') || '—'} className="sm:col-span-2" />
          <Item k="Preferred contact" v={detail.preferred_comm || '—'} />
          <Item k="Patient ID" v={detail.client_code || '—'} />
        </dl>
      </section>

      {/* Emergency contact */}
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <SectionHeading icon={ShieldCheck} title="Emergency contact" />
        {(!detail.emergency && !detail.emergency_phone) ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No emergency contact on file. <strong>Update patient record.</strong></span>
          </div>
        ) : (
          <dl className="mt-3 grid gap-y-2 text-sm sm:grid-cols-2">
            <Item k="Name" v={detail.emergency || '—'} />
            <Item k="Phone" v={detail.emergency_phone || '—'} />
          </dl>
        )}

        <div className="mt-5 border-t border-mc-line pt-4">
          <SectionHeading icon={ClipboardList} title="Care information" />
          <dl className="mt-3 grid gap-y-2 text-sm sm:grid-cols-2">
            <Item k="Presenting concern" v={detail.primary_concern || '—'} className="sm:col-span-2" />
            <Item k="Modality" v={detail.care_type || '—'} />
            <Item k="Session cadence" v={detail.frequency || '—'} />
            <Item k="Visit preference" v={detail.visit_pref || '—'} />
            <Item k="Therapist" v={detail.therapist || '—'} />
            <Item k="Care started" v={formatLongDate(detail.care_started)} />
            <Item k="Payer" v={payerLabel(detail.payer_type)} />
            {detail.insurance && <Item k="Insurance" v={detail.insurance} />}
          </dl>
        </div>
      </section>

      <PortalAccessCard
        detail={detail}
        canEdit={canEdit}
        invite={portalInvite}
        onInvite={onPortalInvite}
        onError={onError}
        onReload={onReload}
      />

      {/* Patient alerts — only what needs action */}
      {flags.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 lg:col-span-2">
          <SectionHeading icon={AlertCircle} title="Patient alerts" />
          <ul className="mt-3 space-y-2">
            {flags.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {f.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Next session — read-only, navigates to Appointments */}
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <SectionHeading icon={CalendarDays} title="Next session" />
        {!next ? (
          <div className="mt-3">
            <p className="text-sm text-mc-ink-soft">No upcoming session scheduled.</p>
            <Link
              to={`/dashboard/appointments?patient=${detail.id}&book=1`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline"
            >
              Schedule in Appointments <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-lg font-bold text-mc-navy">
              {formatLongDate(next.appt_date || next.date)}
            </p>
            <p className="text-sm text-mc-ink-soft">
              {formatTime(next.appt_time || next.time)}
              {` · ${next.therapist || detail.therapist}`}
              {` · ${(next.session_type || next.type) === 'video' ? 'Virtual' : 'In-person'}`}
              {(next.duration_min || next.duration) ? ` · ${next.duration_min || next.duration} min` : ''}
            </p>
            {(next.session_type === 'video' || next.type === 'video') && next.video_link && (
              <a href={next.video_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-mc-gold px-3 py-1.5 text-sm font-bold text-mc-ink">
                Join session
              </a>
            )}
            <div className="mt-3">
              <Link to="/dashboard/appointments" className="inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
                View in Appointments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <SectionHeading icon={FileText} title="Recent activity" />
        {!journey.length ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {journey.map((e) => (
              <li key={e.id} className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-x-3 text-sm">
                <span className="pt-0.5 text-xs font-semibold tabular-nums text-mc-ink-soft">{formatShortDate(e.date)}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-mc-ink">{e.title}</div>
                  <div className="text-xs text-mc-ink-soft">{e.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CLINICAL TAB
   Patient-specific clinical context. Does NOT duplicate Clinical Care module.
───────────────────────────────────────────────────────── */
function ClinicalTab({ detail, activePlan, plans, clinicalNotes, meds }) {
  const current = meds.filter((m) => m.status === 'current');
  const previous = meds.filter((m) => m.status !== 'current');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Active treatment plan — summary only */}
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-mc-navy">Treatment plan</h2>
          {activePlan && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Active</span>}
        </div>
        {!activePlan ? (
          <div className="mt-3">
            <p className="text-sm text-mc-ink-soft">No active treatment plan.</p>
            <Link to="/dashboard/clinical/plans" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
              Create in Clinical Care <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-mc-ink-soft">
              Updated {formatLongDate(activePlan.updated)}
              {activePlan.review && ` · Review ${formatLongDate(activePlan.review)}`}
            </p>
            <ul className="mt-3 space-y-2">
              {(activePlan.goals || [{ text: activePlan.goal, status: 'In Progress' }]).map((g, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-[#faf7f1] px-3 py-2 text-sm">
                  <span>{g.text || g}</span>
                  <span className="font-bold text-mc-navy">{g.status || 'In Progress'}</span>
                </li>
              ))}
            </ul>
            {activePlan.focus && <p className="mt-3 text-xs text-mc-ink-soft">Focus: {activePlan.focus}</p>}
            <Link to="/dashboard/clinical/plans" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
              Manage in Clinical Care <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* Clinical notes — patient-scoped summary, not a second editor */}
      <section className="rounded-xl border border-mc-line bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-mc-navy">Clinical notes</h2>
          <span className="text-sm text-mc-ink-soft">{clinicalNotes.length} note{clinicalNotes.length !== 1 ? 's' : ''}</span>
        </div>
        {!clinicalNotes.length ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No clinical notes for this patient.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {clinicalNotes.slice(0, 4).map((n) => (
              <li key={n.id} className="rounded-lg border border-mc-line px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-mc-ink">{n.date}</span>
                  <span className="text-xs font-bold text-mc-ink-soft">{n.type || 'DAP'}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-mc-ink-soft">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
        <Link to="/dashboard/clinical/notes" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
          Open Clinical Notes <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* Medication history */}
      <section className="rounded-xl border border-mc-line bg-white p-5 lg:col-span-2">
        <h2 className="mb-1 font-bold text-mc-navy">Medications</h2>
        <p className="mb-3 text-xs text-mc-ink-soft">Medication record only — no e-prescribing.</p>
        {!meds.length ? (
          <p className="text-sm text-mc-ink-soft">No medication records.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {current.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Current</h3>
                {current.map((m) => <MedRow key={m.id} m={m} />)}
              </div>
            )}
            {previous.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Previous</h3>
                {previous.map((m) => <MedRow key={m.id} m={m} />)}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SESSIONS TAB
   Read-only session history. Not a scheduling interface.
───────────────────────────────────────────────────────── */
function SessionsTab({ sessions, notes, clinical, therapist, patientId }) {
  const [selected, setSelected] = useState(null);
  const noteFor = (s) => notes.find((n) => n.date === (s.appt_date || s.date));

  if (!sessions.length) {
    return (
      <div className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center">
        <p className="text-sm text-mc-ink-soft">No completed sessions on record.</p>
        <Link to={`/dashboard/appointments?patient=${patientId}&book=1`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
          Schedule first session <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (selected) {
    const n = noteFor(selected);
    return (
      <div className="rounded-xl border border-mc-line bg-white p-5">
        <button type="button" onClick={() => setSelected(null)} className="mb-4 text-sm font-semibold text-mc-navy underline">← Session history</button>
        <h2 className="text-lg font-bold text-mc-navy">{selected.reason || 'Therapy session'}</h2>
        <p className="mt-1 text-sm text-mc-ink-soft">
          {formatLongDate(selected.appt_date || selected.date)}
          {' · '}{formatTime(selected.appt_time || selected.time)}
          {' · '}{selected.duration_min || 50} min
          {' · '}{(selected.session_type || selected.type) === 'video' ? 'Virtual' : 'In-person'}
        </p>
        <p className="mt-1 text-sm">Therapist: {selected.therapist || therapist}</p>
        {clinical ? (
          <div className="mt-4 rounded-lg bg-[#faf7f1] p-4">
            <h3 className="text-sm font-bold text-mc-navy">Session documentation</h3>
            {n ? (
              <>
                <p className="mt-1 text-xs text-mc-ink-soft">{n.type || 'DAP'} note</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-mc-ink-soft">No clinical note for this date.</p>
            )}
            <Link to="/dashboard/clinical/notes" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
              Open Clinical Notes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-mc-ink-soft">Clinical documentation restricted for your role.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-bold text-mc-navy">Session history</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-mc-ink-soft">{sessions.length} completed</span>
          <Link to="/dashboard/appointments" className="inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
            View all in Appointments <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => {
          const n = noteFor(s);
          return (
            <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mc-line bg-white p-4">
              <div>
                <div className="font-semibold text-mc-navy">{formatLongDate(s.appt_date || s.date)}</div>
                <div className="text-sm text-mc-ink-soft">
                  {s.therapist || therapist}
                  {' · '}{s.duration_min || 50} min
                  {' · '}{(s.session_type || s.type) === 'video' ? 'Virtual' : 'In-person'}
                  {' · '}<span className="text-emerald-700 font-semibold">Completed</span>
                  {clinical && n && <span className="text-mc-ink-soft"> · {n.type || 'DAP'} note ✓</span>}
                </div>
                {s.reason && <div className="mt-0.5 text-xs text-mc-ink-soft">{s.reason}</div>}
              </div>
              <button
                type="button"
                onClick={() => setSelected(s)}
                className="rounded-lg border border-mc-line px-3 py-1.5 text-sm font-semibold"
              >
                View
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DOCUMENTS TAB
   Patient-specific uploaded documents & files.
───────────────────────────────────────────────────────── */
function DocumentsTab({ forms }) {
  const docs = forms.filter((f) => f.status === 'Completed');
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-mc-navy">Documents</h2>
          <p className="text-xs text-mc-ink-soft">Completed forms and uploaded documents for this patient.</p>
        </div>
        <Link to="/dashboard/clinical/forms" className="inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
          Manage all forms <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {!docs.length ? (
        <div className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center">
          <p className="text-sm text-mc-ink-soft">No completed documents on file for this patient.</p>
          <Link to="/dashboard/clinical/forms" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
            Open Forms & Documents <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-mc-line bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-mc-line bg-[#faf7f1] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-mc-ink-soft">
            <span>Document</span>
            <span>Date</span>
            <span>Action</span>
          </div>
          {docs.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-mc-line px-4 py-3 last:border-0">
              <div>
                <div className="font-semibold text-mc-ink">{f.name}</div>
                <div className="text-xs text-mc-ink-soft">Completed</div>
              </div>
              <div className="text-sm text-mc-ink-soft">{formatLongDate(f.date)}</div>
              <Link to="/dashboard/clinical/forms" className="text-sm font-semibold text-mc-navy underline">View</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FORMS TAB
   Patient-specific form status (intake, consent, assessments).
───────────────────────────────────────────────────────── */
function FormsTab({ forms }) {
  const STATUS_STYLE = {
    Completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Pending:   'bg-amber-50 text-amber-900 border-amber-200',
    'Needs Review': 'bg-sky-50 text-sky-800 border-sky-200',
  };
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-mc-navy">Forms</h2>
          <p className="text-xs text-mc-ink-soft">Intake, consent, and assessment forms for this patient.</p>
        </div>
        <Link to="/dashboard/clinical/forms" className="inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
          Send a form <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {!forms.length ? (
        <div className="rounded-xl border border-dashed border-mc-line bg-white p-8 text-center">
          <p className="text-sm text-mc-ink-soft">No forms assigned to this patient.</p>
          <Link to="/dashboard/clinical/forms" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-navy underline">
            Assign a form <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-mc-line bg-white">
          {forms.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-mc-line px-4 py-3 last:border-0">
              <div>
                <div className="font-semibold text-mc-ink">{f.name}</div>
                <div className="text-xs text-mc-ink-soft">{formatLongDate(f.date)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[f.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {f.status}
                </span>
                <Link to="/dashboard/clinical/forms" className="text-sm font-semibold text-mc-navy underline">Open</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   COMMUNICATION TAB
   Patient-specific admin notes + link to Communication module.
   Does NOT rebuild the messaging system.
───────────────────────────────────────────────────────── */
function CommunicationTab({ detail, adminNotes, onAdd, canEdit }) {
  const [threads, setThreads] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadThreads = useCallback(async () => {
    if (!detail?.id) return;
    try {
      const rows = await api(`/messages?patientId=${detail.id}`);
      setThreads(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message);
    }
  }, [detail?.id]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  async function send(e) {
    e.preventDefault();
    if (!canEdit || !subject.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({
          patientId: detail.id,
          subject: subject.trim(),
          body: body.trim(),
          category: 'general',
        }),
      });
      setSubject('');
      setBody('');
      setError('');
      await loadThreads();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-mc-navy">Communication</h2>
          <p className="text-xs text-mc-ink-soft">Portal messages with this patient. They reply under My messages.</p>
        </div>
        <Link
          to={`/dashboard/communication?patient=${detail.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold"
        >
          Open inbox <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {canEdit && (
        <form onSubmit={send} className="mb-4 rounded-xl border border-mc-line bg-white p-4">
          <p className="text-sm font-semibold text-mc-ink">Send a portal message</p>
          <input
            required
            className="mt-2 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            required
            className="mt-2 min-h-20 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
            placeholder="Message the patient will see in their portal…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button disabled={busy} className="mt-2 rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink disabled:opacity-60">
            Send to portal
          </button>
        </form>
      )}

      <h3 className="mb-3 font-bold text-mc-navy">Threads</h3>
      {!threads.length ? (
        <p className="mb-6 rounded-xl border border-dashed border-mc-line bg-white p-6 text-center text-sm text-mc-ink-soft">
          No portal messages with this patient yet.
        </p>
      ) : (
        <div className="mb-6 space-y-3">
          {threads.map((t) => (
            <article key={t.id} className="rounded-xl border border-mc-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-mc-navy">{t.subject}</p>
                <span className="text-[11px] text-mc-ink-soft">{t.status}</span>
              </div>
              <p className="mt-1 text-sm text-mc-ink-soft">{t.thread?.[t.thread.length - 1]?.text}</p>
            </article>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-mc-navy">Administrative notes</h3>
        <button type="button" onClick={onAdd} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">
          Add note
        </button>
      </div>
      <p className="mb-3 text-xs text-mc-ink-soft">
        Patient-specific administrative notes. Clinical session documentation lives in{' '}
        <Link to="/dashboard/clinical/notes" className="font-semibold underline">Clinical Notes</Link>.
      </p>
      {!adminNotes.length ? (
        <p className="rounded-xl border border-dashed border-mc-line bg-white p-6 text-center text-sm text-mc-ink-soft">
          No administrative notes for this patient.
        </p>
      ) : (
        <div className="space-y-3">
          {adminNotes.map((n) => (
            <article key={n.id} className="rounded-xl border border-mc-line bg-white p-4">
              <div className="text-xs text-mc-ink-soft">
                {formatLongDate(n.date)}{n.author ? ` · ${n.author}` : ''}
              </div>
              <p className="mt-1 text-sm">{n.text}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   BILLING TAB
   Patient-scoped billing summary. Read-only — billing management is in Billing module.
───────────────────────────────────────────────────────── */
function BillingTab({ detail, bills, balance, charges, paidTotal }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-mc-navy">Billing summary</h2>
          <p className="text-xs text-mc-ink-soft">Patient-specific balances and invoice history. Create and manage invoices in Billing.</p>
        </div>
        <Link
          to={`/dashboard/billing?q=${encodeURIComponent(detail.name)}`}
          className="inline-flex items-center gap-1 rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink"
        >
          Open Billing <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <BillStat label="Total billed" value={money(charges)} />
        <BillStat label="Collected" value={money(paidTotal)} />
        <BillStat label="Outstanding" value={money(balance)} highlight={balance > 0} />
      </div>

      {!bills.length ? (
        <p className="rounded-xl border border-dashed border-mc-line bg-white p-6 text-center text-sm text-mc-ink-soft">
          No billing records for this patient.
        </p>
      ) : (
        <div className="rounded-xl border border-mc-line bg-white shadow-sm">
          {bills
            .slice()
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map((inv) => {
              const st = invoiceStatus(inv);
              return (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-mc-line px-5 py-4 last:border-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-mc-navy">{money(inv.amount)}</span>
                      <StatusBadge status={st} />
                    </div>
                    <div className="mt-1 text-sm text-mc-ink-soft">
                      {formatLongDate(inv.date)} · {inv.description || inv.note}
                      {st === 'partial' && ` · due ${money(balanceDue(inv))}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => printSuperbill(inv, detail)}
                    className="rounded-lg border border-mc-navy/25 px-3 py-1.5 text-sm font-semibold text-mc-navy"
                  >
                    Print
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

/* ── Shared helpers ── */

function PortalAccessCard({ detail, canEdit, invite, onInvite, onError, onReload }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasLogin = Boolean(detail.portal?.hasLogin);

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.('Could not copy the link. Select it and copy manually.');
    }
  }

  async function issue(purpose) {
    if (!canEdit || !detail?.id) return;
    setBusy(true);
    onError?.('');
    try {
      const next = await api(`/patients/${detail.id}/portal-invite`, {
        method: 'POST',
        body: JSON.stringify({ purpose }),
      });
      onInvite?.(next);
      await onReload?.();
    } catch (err) {
      onError?.(err.message || 'Could not create a portal invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-mc-line bg-white p-5 lg:col-span-2">
      <SectionHeading icon={KeyRound} title="Patient portal" />
      <p className="mt-2 text-sm text-mc-ink-soft">
        {hasLogin
          ? 'This patient has already created a portal password.'
          : 'The clinic does not set a password. Send an invite (or copy the link) so they can choose one.'}
      </p>
      {invite?.inviteUrl && (
        <div className="mt-3 rounded-lg border border-mc-gold/40 bg-mc-gold-soft px-3 py-3">
          <p className="text-xs font-semibold text-mc-ink">
            {invite.purpose === 'reset' ? 'Password reset link' : 'Portal invite link'}
            {invite.emailed
              ? invite.smtp
                ? ' — emailed to the address on file.'
                : ' — stored in the demo email outbox (SMTP is not configured).'
              : ' — email was not sent. Copy this link for the patient.'}
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-mc-ink">{invite.inviteUrl}</p>
          <button
            type="button"
            onClick={() => copyLink(invite.inviteUrl)}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-mc-line bg-white px-2.5 py-1.5 text-xs font-bold text-mc-navy"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !detail.email}
            onClick={() => issue('invite')}
            className="rounded-lg bg-mc-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {hasLogin ? 'Send a new invite' : 'Send portal invite'}
          </button>
          {hasLogin && (
            <button
              type="button"
              disabled={busy || !detail.email}
              onClick={() => issue('reset')}
              className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold text-mc-navy disabled:opacity-50"
            >
              Send password reset
            </button>
          )}
        </div>
      )}
      {!detail.email && (
        <p className="mt-2 text-xs text-rose-800">Add an email on the chart before sending a portal invite.</p>
      )}
    </section>
  );
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-mc-navy-soft" strokeWidth={2} />}
      <h2 className="font-bold text-mc-navy">{title}</h2>
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

function BillStat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-mc-line bg-white'}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-amber-900' : 'text-mc-navy'}`}>{value}</div>
      <div className="text-sm font-semibold text-mc-ink-soft">{label}</div>
    </div>
  );
}

function MedRow({ m }) {
  return (
    <article className="mb-2 rounded-xl border border-mc-line bg-white p-3 text-sm">
      <div className="font-bold text-mc-navy">{m.name}</div>
      <div className="mt-0.5 text-xs text-mc-ink-soft">
        Started {formatLongDate(m.start)}
        {m.end && ` · Ended ${formatLongDate(m.end)}`}
        {m.provider && ` · ${m.provider}`}
      </div>
    </article>
  );
}

function PatientStatusBadge({ status }) {
  const s = status || 'active';
  const map = {
    active:   { style: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Active care' },
    new:      { style: 'bg-amber-50 text-amber-800 border-amber-200',   label: 'New intake' },
    inactive: { style: 'bg-slate-100 text-slate-600 border-slate-200', label: 'On hold' },
  };
  const { style, label } = map[s] || map.active;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${style}`}>
      {label}
    </span>
  );
}

function payerLabel(p) {
  if (p === 'insurance') return 'Insurance';
  if (p === 'other') return 'Other';
  return 'Self-pay';
}
