import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { ModuleHeader } from './ModuleBits';
import {
  CARE_TYPES,
  THERAPISTS,
  GENDERS,
  FREQUENCIES,
  PRESENTING_CONCERNS,
  attentionFlags,
  ageFromDob,
  canEditClients,
  getBillingRows,
  formatShortDate,
  initials,
  lastVisit,
  nextAppointment,
  outstandingBalance,
  statusLabel,
} from './clients/clientData';

const PAGE_SIZE = 10;

const emptyForm = {
  firstName: '',
  lastName: '',
  dob: '',
  email: '',
  phone: '',
  gender: 'Female',
  city: '',
  state: '',
  address: '',
  preferredComm: 'Email',
  emergency: '',
  emergencyPhone: '',
  therapist: 'Dr. Sarah Williams',
  careType: 'Individual Therapy',
  visitPref: 'Virtual',
  frequency: 'Weekly',
  payerType: 'self-pay',
  insurance: '',
  primaryConcern: '',
};

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [chartCache, setChartCache] = useState({ forms: [], plans: [] });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dupWarn, setDupWarn] = useState('');
  const [allowSimilar, setAllowSimilar] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: 'all',
    therapist: 'all',
    flag: 'all',
  });

  const canEdit = canEditClients(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      /* Fetch patients + appointments in parallel — no billing fetch here */
      const [patients, appts, bundle] = await Promise.all([
        api('/patients'),
        api('/appointments?filter=upcoming').catch(() => []),
        api('/clinical/bundle').catch(() => ({ forms: [], plans: [] })),
      ]);
      setRows(patients);
      setAppointments(appts);
      setChartCache({ forms: bundle.forms || [], plans: bundle.plans || [] });
      setError('');
      const focus = params.get('focus');
      if (focus) navigate(`/dashboard/patients/${focus}`, { replace: true });
    } catch (e) {
      setError(e.message || 'Unable to load patients.');
    } finally {
      setLoading(false);
    }
  }, [navigate, params]);

  useEffect(() => { load(); }, [load]);

  /* Debounce search — avoid re-filtering on every keystroke */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(id);
  }, [q]);

  /* Default therapist filter for practitioners */
  useEffect(() => {
    if (user?.role !== 'practitioner' || !user?.name) return;
    const match = THERAPISTS.find(
      (t) => t === user.name || t.includes(user.name) || user.name.includes(t.replace(/^Dr\.\s*/, '')),
    );
    if (match) setFilters((f) => (f.therapist === 'all' ? { ...f, therapist: match } : f));
  }, [user]);

  const enriched = useMemo(() => {
    /* Load localStorage caches once, share across all patients */
    const caches = { invoices: getBillingRows(), forms: chartCache.forms, plans: chartCache.plans };
    return rows.map((c) => {
      const last    = lastVisit(c, appointments);
      const next    = nextAppointment(c, appointments);
      const balance = outstandingBalance(c);
      const flags   = attentionFlags(c, appointments, caches);
      return { ...c, last, next, balance, flags };
    });
  }, [rows, appointments, chartCache]);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return enriched.filter((c) => {
      if (needle) {
        const hay = [c.name, c.client_code, c.phone, c.email, c.dob, c.primary_concern].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filters.status !== 'all' && (c.status || 'active') !== filters.status) return false;
      if (filters.therapist !== 'all' && (c.therapist || '') !== filters.therapist) return false;
      if (filters.flag === 'flagged' && !c.flags.length) return false;
      if (filters.flag === 'intake' && c.status !== 'new') return false;
      if (filters.flag === 'missing_ec' && (c.emergency || c.emergency_phone)) return false;
      return true;
    });
  }, [enriched, q, filters]);

  useEffect(() => { setPage(1); }, [debouncedQ, filters]);

  /* Sort: new intakes first, then alphabetical */
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const statusOrder = { new: 0, active: 1, inactive: 2 };
    const sa = statusOrder[a.status] ?? 1;
    const sb = statusOrder[b.status] ?? 1;
    if (sa !== sb) return sa - sb;
    return String(a.name).localeCompare(String(b.name));
  }), [filtered]);

  /* Summary counts — compact, not KPI cards */
  const summary = useMemo(() => ({
    total: enriched.filter((c) => (c.status || 'active') !== 'inactive').length,
    intakes: enriched.filter((c) => c.status === 'new').length,
    flagged: enriched.filter((c) => c.flags.length > 0).length,
  }), [enriched]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtersActive = filters.status !== 'all' || filters.therapist !== 'all' || filters.flag !== 'all';
  function clearAll() { setQ(''); setDebouncedQ(''); setFilters({ status: 'all', therapist: 'all', flag: 'all' }); }

  async function createPatient(e, opts = {}) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setDupWarn('');
    setError('');
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (
      !form.email.trim() || !form.phone.trim() || !form.dob
      || !form.emergency.trim() || !form.emergencyPhone.trim()
      || !form.city.trim() || !form.state.trim() || !form.primaryConcern.trim()
    ) {
      setError('Complete all required intake fields including email (used for appointment confirmations).');
      setSaving(false);
      return;
    }
    try {
      if (!opts.allowSimilar && !allowSimilar) {
        const similar = rows.find((p) => p.name.toLowerCase() === name.toLowerCase() && form.dob && p.dob === form.dob);
        if (similar) {
          setDupWarn(`A patient with the same name and date of birth already exists (${similar.client_code || similar.name}).`);
          setSaving(false);
          return;
        }
      }
      const created = await api('/patients', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: form.email.trim(),
          phone: form.phone.trim(),
          dob: form.dob,
          gender: form.gender,
          city: form.city.trim(),
          state: form.state.trim(),
          address: form.address.trim(),
          emergency: form.emergency.trim(),
          emergencyPhone: form.emergencyPhone.trim(),
          payerType: form.payerType,
          insurance: form.insurance.trim(),
          careType: form.careType,
          therapist: form.therapist,
          visitPref: form.visitPref,
          frequency: form.frequency,
          preferredComm: form.preferredComm,
          primaryConcern: form.primaryConcern.trim(),
          status: 'new',
        }),
      });
      setShowAdd(false);
      setForm(emptyForm);
      setAllowSimilar(false);
      await load();
      navigate(`/dashboard/patients/${created.id}`, {
        state: { portalInvite: created.portalInvite || null },
      });
    } catch (err) {
      if (/already exists/i.test(err.message || '')) {
        setDupWarn(err.message || 'A patient with those contact details already exists.');
      } else {
        setError(err.message || 'Failed to save patient.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Patients"
        lead="Patient records — demographics, care status, clinical history, and documents."
        action={canEdit && (
          <button
            type="button"
            onClick={() => { setShowAdd(true); setDupWarn(''); setError(''); }}
            className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink"
          >
            + New intake
          </button>
        )}
      />

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Compact patient summary — NOT dashboard KPIs */}
      {!loading && !!enriched.length && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-mc-line bg-white px-4 py-3 text-sm">
          <span>
            <strong className="text-mc-navy">{summary.total}</strong>
            <span className="ml-1 text-mc-ink-soft">{summary.total === 1 ? 'active patient' : 'active patients'}</span>
          </span>
          {summary.intakes > 0 && (
            <button
              type="button"
              className="font-semibold text-mc-gold-deep underline decoration-dotted"
              onClick={() => setFilters((f) => ({ ...f, status: 'new' }))}
            >
              {summary.intakes} new {summary.intakes === 1 ? 'intake' : 'intakes'}
            </button>
          )}
          {summary.flagged > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-amber-800 underline decoration-dotted"
              onClick={() => setFilters((f) => ({ ...f, flag: 'flagged' }))}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {summary.flagged} {summary.flagged === 1 ? 'patient needs' : 'patients need'} attention
            </button>
          )}
        </div>
      )}

      {/* Search — patient-centric */}
      <div className="mb-3">
        <label className="sr-only" htmlFor="patient-search">Search patients</label>
        <input
          id="patient-search"
          className="w-full rounded-xl border border-mc-line bg-white px-4 py-2.5 text-sm shadow-sm"
          placeholder="Search by name, patient ID, phone, email or date of birth…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Filters — patient lifecycle only, no appointment/billing filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Care status"
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={[
            ['all', 'All statuses'],
            ['new', 'New intake'],
            ['active', 'Active care'],
            ['inactive', 'On hold / discharged'],
          ]}
        />
        <FilterSelect
          label="Therapist"
          value={filters.therapist}
          onChange={(v) => setFilters((f) => ({ ...f, therapist: v }))}
          options={[['all', 'All therapists'], ...THERAPISTS.map((t) => [t, t])]}
        />
        <FilterSelect
          label="Flags"
          value={filters.flag}
          onChange={(v) => setFilters((f) => ({ ...f, flag: v }))}
          options={[
            ['all', 'All patients'],
            ['flagged', 'Has flags'],
            ['intake', 'Intake pending'],
            ['missing_ec', 'No emergency contact'],
          ]}
        />
        {(filtersActive || q) && (
          <button
            type="button"
            className="text-sm font-semibold text-mc-navy underline"
            onClick={clearAll}
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-mc-ink-soft">
          {sorted.length} {sorted.length === 1 ? 'patient' : 'patients'}
        </span>
      </div>

      {/* Patient list */}
      {loading ? (
        <p className="rounded-xl border border-mc-line bg-white p-8 text-sm text-mc-ink-soft">Loading patients…</p>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-dashed border-mc-line bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-mc-navy">No patients yet</h3>
          <p className="mt-1 text-sm text-mc-ink-soft">Create a new intake to add your first patient record.</p>
          {canEdit && (
            <button type="button" onClick={() => setShowAdd(true)} className="mt-4 rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">
              New intake
            </button>
          )}
        </div>
      ) : !sorted.length ? (
        <div className="rounded-2xl border border-dashed border-mc-line bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-mc-navy">No patients match</h3>
          <button type="button" className="mt-3 text-sm font-bold text-mc-navy underline" onClick={clearAll}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-mc-line bg-white shadow-sm lg:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-mc-line bg-[#faf7f1] text-[11px] font-bold uppercase tracking-wide text-mc-ink-soft">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Presenting concern</th>
                  <th className="px-3 py-3">Therapist</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Last contact</th>
                  <th className="px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const age = ageFromDob(c.dob);
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer border-b border-mc-line last:border-0 hover:bg-[#faf7f1]"
                      onClick={() => navigate(`/dashboard/patients/${c.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/dashboard/patients/${c.id}`); }}
                      tabIndex={0}
                      aria-label={`Open patient record for ${c.name}`}
                    >
                      {/* Patient */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mc-navy-soft text-xs font-bold text-mc-navy" aria-hidden>
                            {initials(c.name)}
                          </span>
                          <div>
                            <div className="font-semibold text-mc-ink">{c.name}</div>
                            <div className="text-[11px] text-mc-ink-soft">
                              {c.client_code || 'No ID'}
                              {age != null ? ` · ${age} yrs` : ''}
                              {c.dob ? ` · ${c.dob}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-3 py-3">
                        <div className="text-mc-ink-soft">{c.phone || '—'}</div>
                        <div className="text-[11px] text-mc-ink-soft">{c.email || '—'}</div>
                      </td>
                      {/* Presenting concern */}
                      <td className="px-3 py-3 max-w-[180px]">
                        <span className="line-clamp-2 text-mc-ink">{c.primary_concern || <span className="text-mc-ink-soft italic">Not recorded</span>}</span>
                      </td>
                      {/* Therapist */}
                      <td className="px-3 py-3 text-mc-ink-soft">{c.therapist || '—'}</td>
                      {/* Status */}
                      <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                      {/* Last contact */}
                      <td className="px-3 py-3 text-mc-ink-soft">{formatShortDate(c.last)}</td>
                      {/* Flags */}
                      <td className="px-4 py-3"><FlagPills flags={c.flags} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {pageRows.map((c) => {
              const age = ageFromDob(c.dob);
              return (
                <Link
                  key={c.id}
                  to={`/dashboard/patients/${c.id}`}
                  className="block rounded-xl border border-mc-line bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mc-navy-soft text-xs font-bold text-mc-navy">
                        {initials(c.name)}
                      </span>
                      <div>
                        <div className="font-bold text-mc-navy">{c.name}</div>
                        <div className="text-xs text-mc-ink-soft">
                          {c.client_code || 'No ID'}
                          {age != null ? ` · ${age} yrs` : ''}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-2 text-sm text-mc-ink">{c.primary_concern || <span className="italic text-mc-ink-soft">Concern not recorded</span>}</div>
                  <div className="mt-1 text-xs text-mc-ink-soft">
                    {c.therapist}{c.phone ? ` · ${c.phone}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-mc-ink-soft">
                    Last contact: {formatShortDate(c.last)}
                  </div>
                  {c.flags.length > 0 && (
                    <div className="mt-2"><FlagPills flags={c.flags} /></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-mc-ink-soft">
              <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
              <div className="flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-8 rounded-lg px-2 py-1 text-sm font-semibold ${n === page ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white'}`}
                    aria-current={n === page ? 'page' : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* New Intake modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-mc-ink/40 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intake-title"
          >
            <h3 id="intake-title" className="text-lg font-bold text-mc-navy">New patient intake</h3>
            <p className="mt-1 text-sm text-mc-ink-soft">Creates the patient record. Email is required for appointment confirmations and a patient-portal invite after save.</p>

            {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
            {dupWarn && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">{dupWarn}</p>}

            <form onSubmit={createPatient} className="mt-4 space-y-5">
              {/* Demographics */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Demographics</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name" required value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
                  <Field label="Last name" required value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
                  <Field label="Date of birth" type="date" required value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
                  <SelectField label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={GENDERS} />
                </div>
              </fieldset>

              {/* Contact */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Contact information</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                  <Field label="Phone" type="tel" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                  <Field label="City" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                  <Field label="State" required value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
                  <Field label="Street address" className="sm:col-span-2" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                  <SelectField label="Preferred contact" value={form.preferredComm} onChange={(v) => setForm({ ...form, preferredComm: v })} options={['Email', 'Phone', 'SMS']} />
                </div>
              </fieldset>

              {/* Emergency contact */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Emergency contact</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" required value={form.emergency} onChange={(v) => setForm({ ...form, emergency: v })} />
                  <Field label="Phone" type="tel" required value={form.emergencyPhone} onChange={(v) => setForm({ ...form, emergencyPhone: v })} />
                </div>
              </fieldset>

              {/* Care setup */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Care setup</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Assigned therapist" required value={form.therapist} onChange={(v) => setForm({ ...form, therapist: v })} options={THERAPISTS} />
                  <SelectField label="Modality" required value={form.careType} onChange={(v) => setForm({ ...form, careType: v })} options={CARE_TYPES} />
                  <SelectField label="Session cadence" value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })} options={FREQUENCIES} />
                  <SelectField label="Visit preference" value={form.visitPref} onChange={(v) => setForm({ ...form, visitPref: v })} options={['Virtual (Zoom)', 'In-person', 'Either']} valueMap={{ 'Virtual (Zoom)': 'Virtual', 'In-person': 'In-person', Either: 'Either' }} />
                  <label className="text-xs font-semibold text-mc-ink-soft sm:col-span-2">
                    Presenting concern *
                    <select
                      required
                      className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
                      value={form.primaryConcern}
                      onChange={(e) => setForm({ ...form, primaryConcern: e.target.value })}
                    >
                      <option value="">Select a concern…</option>
                      {PRESENTING_CONCERNS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
              </fieldset>

              {/* Payment */}
              <fieldset>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-ink-soft">Payment</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Payer type" value={form.payerType} onChange={(v) => setForm({ ...form, payerType: v })} options={['self-pay', 'insurance', 'other']} />
                  {form.payerType === 'insurance' && (
                    <Field label="Insurance plan / member ID" required value={form.insurance} onChange={(v) => setForm({ ...form, insurance: v })} />
                  )}
                </div>
              </fieldset>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl border border-mc-line py-2.5 text-sm font-semibold">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {saving ? 'Creating…' : 'Create patient record'}
                </button>
              </div>
              {dupWarn && !/contact details/i.test(dupWarn) && (
                <button
                  type="button"
                  className="w-full text-center text-sm font-semibold text-mc-navy underline"
                  onClick={(e) => { setAllowSimilar(true); createPatient(e, { allowSimilar: true }); }}
                >
                  Create anyway (do not merge records)
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared sub-components ── */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-mc-ink-soft">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        className="rounded-lg border border-mc-line bg-white px-2.5 py-1.5 text-sm font-semibold text-mc-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
      </select>
    </label>
  );
}

function Field({ label, value, onChange, type = 'text', required, className = '' }) {
  return (
    <label className={`block text-xs font-semibold text-mc-ink-soft ${className}`}>
      {label}{required ? ' *' : ''}
      <input
        required={required}
        type={type}
        className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required, valueMap }) {
  return (
    <label className="block text-xs font-semibold text-mc-ink-soft">
      {label}{required ? ' *' : ''}
      <select
        required={required}
        className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(valueMap ? (valueMap[e.target.value] ?? e.target.value) : e.target.value)}
      >
        {options.map((o) => <option key={o} value={valueMap ? (valueMap[o] ?? o) : o}>{o}</option>)}
      </select>
    </label>
  );
}

function StatusBadge({ status }) {
  const s = status || 'active';
  const styles = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    new: 'bg-amber-50 text-amber-800 border-amber-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels = { active: 'Active care', new: 'New intake', inactive: 'On hold' };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${styles[s] || styles.active}`}>
      {labels[s] || statusLabel(s)}
    </span>
  );
}

const FLAG_STYLES = {
  intake: 'bg-amber-50 text-amber-900 border-amber-200',
  safety: 'bg-rose-50 text-rose-800 border-rose-200',
  payment: 'bg-orange-50 text-orange-800 border-orange-200',
  forms: 'bg-sky-50 text-sky-800 border-sky-200',
  gap: 'bg-rose-50 text-rose-800 border-rose-200',
  appt: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  plan: 'bg-slate-100 text-slate-700 border-slate-200',
};

function FlagPills({ flags = [] }) {
  if (!flags.length) return <span className="text-mc-ink-soft">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <span key={f.key} className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${FLAG_STYLES[f.key] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
          {f.label}
        </span>
      ))}
    </span>
  );
}
