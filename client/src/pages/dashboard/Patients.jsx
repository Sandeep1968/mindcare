import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { ModuleHeader } from './ModuleBits';
import {
  CARE_TYPES,
  THERAPISTS,
  GENDERS,
  FREQUENCIES,
  attentionFlags,
  canEditClients,
  canViewBilling,
  ensureClientDemoStores,
  formatShortDate,
  initials,
  inLastVisitRange,
  lastVisit,
  nextAppointment,
  outstandingBalance,
  refreshBillingCache,
  statusLabel,
} from './clients/clientData';

const PAGE_SIZE = 8;

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
  const [q, setQ] = useState('');
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
    care: 'all',
    therapist: 'all',
    lastVisit: 'any',
    payment: 'all',
  });

  const showBilling = canViewBilling(user?.role);
  const canEdit = canEditClients(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [patients, appts] = await Promise.all([
        api('/patients'),
        api('/appointments?filter=all').catch(() => []),
      ]);
      ensureClientDemoStores(patients);
      await refreshBillingCache().catch(() => {});
      setRows(patients);
      setAppointments(appts);
      setError('');
      const focus = params.get('focus');
      if (focus) navigate(`/dashboard/patients/${focus}`, { replace: true });
    } catch (e) {
      setError(e.message || 'Unable to load clients.');
    } finally {
      setLoading(false);
    }
  }, [navigate, params]);

  useEffect(() => { load(); }, [load]);

  const enriched = useMemo(() => rows.map((c) => {
    const last = lastVisit(c, appointments);
    const next = nextAppointment(c, appointments);
    const balance = outstandingBalance(c);
    const attention = attentionFlags(c, appointments);
    return { ...c, last, next, balance, attention };
  }), [rows, appointments]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched.filter((c) => {
      if (needle) {
        const hay = [c.name, c.client_code, c.phone, c.email].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filters.status !== 'all' && (c.status || 'active') !== filters.status) return false;
      if (filters.care !== 'all' && (c.care_type || '') !== filters.care) return false;
      if (filters.therapist !== 'all' && (c.therapist || '') !== filters.therapist) return false;
      if (filters.lastVisit !== 'any') {
        if (!c.last || !inLastVisitRange(c.last, filters.lastVisit)) return false;
      }
      if (showBilling && filters.payment === 'paid' && c.balance > 0) return false;
      if (showBilling && filters.payment === 'outstanding' && c.balance <= 0) return false;
      return true;
    });
  }, [enriched, q, filters, showBilling]);

  useEffect(() => { setPage(1); }, [q, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtersActive = Object.values(filters).some((v) => v !== 'all' && v !== 'any');

  async function createClient(e, opts = {}) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setDupWarn('');
    setError('');
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!form.email.trim() || !form.phone.trim() || !form.dob || !form.emergency.trim() || !form.emergencyPhone.trim() || !form.city.trim() || !form.state.trim() || !form.primaryConcern.trim()) {
      setError('Complete all required intake fields, including email (needed for Zoom visit links).');
      setSaving(false);
      return;
    }
    const skipSimilar = opts.allowSimilar || allowSimilar;
    try {
      if (!skipSimilar) {
        const similar = rows.find((p) => {
          const sameName = p.name.toLowerCase() === name.toLowerCase();
          const sameDob = form.dob && p.dob === form.dob;
          return sameName && sameDob;
        });
        if (similar) {
          setDupWarn(`A similar client already exists (${similar.client_code || similar.name}). Review before creating a duplicate.`);
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
      navigate(`/dashboard/patients/${created.id}`);
    } catch (err) {
      if (/already exists/i.test(err.message || '')) {
        setDupWarn(err.message || 'A client with similar contact details already exists. Change email/phone or open the existing record — records are not merged automatically.');
      } else {
        setError(err.message || 'Failed to save client.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Clients"
        lead="Manage client profiles, care history, appointments and care information."
        action={(
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => { setShowAdd(true); setDupWarn(''); }}
                className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink"
              >
                + Add Client
              </button>
            )}
          </div>
        )}
      />

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-bold underline">Try Again</button>
        </div>
      )}

      <div className="mb-4">
        <label className="sr-only" htmlFor="client-search">Search clients</label>
        <input
          id="client-search"
          className="w-full rounded-xl border border-mc-line bg-white px-4 py-2.5 text-sm shadow-sm"
          placeholder="Search name, client ID, phone or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={[
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
            ['new', 'New'],
          ]}
        />
        <FilterSelect
          label="Care Type"
          value={filters.care}
          onChange={(v) => setFilters({ ...filters, care: v })}
          options={[['all', 'All'], ...CARE_TYPES.map((c) => [c, c])]}
        />
        <FilterSelect
          label="Therapist"
          value={filters.therapist}
          onChange={(v) => setFilters({ ...filters, therapist: v })}
          options={[['all', 'All'], ...THERAPISTS.map((t) => [t, t])]}
        />
        <FilterSelect
          label="Last Visit"
          value={filters.lastVisit}
          onChange={(v) => setFilters({ ...filters, lastVisit: v })}
          options={[
            ['any', 'Any'],
            ['today', 'Today'],
            ['week', 'This Week'],
            ['month', 'This Month'],
            ['older', 'Older'],
          ]}
        />
        {showBilling && (
          <FilterSelect
            label="Payment"
            value={filters.payment}
            onChange={(v) => setFilters({ ...filters, payment: v })}
            options={[
              ['all', 'All'],
              ['paid', 'Paid'],
              ['outstanding', 'Outstanding'],
            ]}
          />
        )}
        {(filtersActive || q) && (
          <button
            type="button"
            className="text-sm font-semibold text-mc-navy underline"
            onClick={() => {
              setQ('');
              setFilters({ status: 'all', care: 'all', therapist: 'all', lastVisit: 'any', payment: 'all' });
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-mc-ink-soft">
        <span>
          <strong className="text-mc-ink">{filtered.length}</strong> Clients
          {q && ' matching search'}
        </span>
        <span>Sorted by Last Visit</span>
      </div>

      {loading ? (
        <p className="rounded-xl border border-mc-line bg-white p-8 text-sm text-mc-ink-soft">Loading clients…</p>
      ) : !rows.length ? (
        <div className="rounded-2xl border border-dashed border-mc-line bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-mc-navy">No clients yet.</h3>
          <p className="mt-1 text-sm text-mc-ink-soft">Add a client to start their care journey.</p>
          {canEdit && (
            <button type="button" onClick={() => setShowAdd(true)} className="mt-4 rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">
              Add Client
            </button>
          )}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-dashed border-mc-line bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-mc-navy">No clients match your search.</h3>
          <button
            type="button"
            className="mt-4 text-sm font-bold text-mc-navy underline"
            onClick={() => {
              setQ('');
              setFilters({ status: 'all', care: 'all', therapist: 'all', lastVisit: 'any', payment: 'all' });
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-mc-line bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-mc-line bg-[#faf7f1] text-[11px] font-bold uppercase tracking-wide text-mc-ink-soft">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-3 py-3">Client ID</th>
                  <th className="px-3 py-3">Care / Primary Service</th>
                  <th className="px-3 py-3">Assigned Therapist</th>
                  <th className="px-3 py-3">Last Visit</th>
                  <th className="px-3 py-3">Next Appointment</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3">Attention</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-mc-line last:border-0 hover:bg-mc-gold-soft/60"
                    onClick={() => navigate(`/dashboard/patients/${c.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/dashboard/patients/${c.id}`); }}
                    tabIndex={0}
                    aria-label={`Open ${c.name}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mc-navy-soft text-xs font-bold text-mc-navy" aria-hidden>
                          {initials(c.name)}
                        </span>
                        <span className="font-semibold text-mc-ink">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-mc-ink-soft">{c.client_code || '—'}</td>
                    <td className="px-3 py-3">{c.care_type || '—'}</td>
                    <td className="px-3 py-3">{c.therapist || '—'}</td>
                    <td className="px-3 py-3">{formatShortDate(c.last)}</td>
                    <td className="px-3 py-3">{formatShortDate(c.next?.appt_date || c.next?.date)}</td>
                    <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      {c.attention.length ? (
                        <span className="flex flex-wrap gap-1">
                          {c.attention.map((a) => (
                            <span key={a.key} className="rounded-full bg-[#f3f0ea] px-2 py-0.5 text-[11px] font-semibold text-mc-ink">
                              {a.label}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-mc-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="space-y-3 lg:hidden">
            {pageRows.map((c) => (
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
                      <div className="text-xs text-mc-ink-soft">{c.client_code} · {c.care_type}</div>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-mc-ink-soft">
                  <div>Last: <span className="font-semibold text-mc-ink">{formatShortDate(c.last)}</span></div>
                  <div>Next: <span className="font-semibold text-mc-ink">{formatShortDate(c.next?.appt_date || c.next?.date)}</span></div>
                  <div className="col-span-2">{c.therapist}</div>
                </div>
                {c.attention.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.attention.map((a) => (
                      <span key={a.key} className="rounded-full bg-[#f3f0ea] px-2 py-0.5 text-[11px] font-semibold">{a.label}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-mc-ink-soft">
            <span>
              {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} clients
            </span>
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
        </>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-mc-ink/40 p-4 sm:items-center" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="add-client-title">
            <h3 id="add-client-title" className="text-lg font-bold text-mc-navy">Add Client</h3>
            <p className="mt-1 text-sm text-mc-ink-soft">Intake fields required for scheduling, Zoom emails, and billing. Email is required so visit links can be sent.</p>
            {dupWarn && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">{dupWarn}</p>}
            <form onSubmit={createClient} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="First Name" required value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
              <Field label="Last Name" required value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
              <Field label="Date of Birth" type="date" required value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
              <label className="text-xs font-semibold text-mc-ink-soft">
                Gender *
                <select required className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <Field label="Email (Zoom / confirmations)" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Phone" type="tel" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="City" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="State" required value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
              <Field label="Street address" className="sm:col-span-2" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <label className="text-xs font-semibold text-mc-ink-soft">
                Preferred Communication *
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.preferredComm} onChange={(e) => setForm({ ...form, preferredComm: e.target.value })}>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>SMS</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-mc-ink-soft">
                Visit preference *
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.visitPref} onChange={(e) => setForm({ ...form, visitPref: e.target.value })}>
                  <option value="Virtual">Virtual (Zoom)</option>
                  <option value="In-person">In-person</option>
                  <option value="Either">Either</option>
                </select>
              </label>
              <Field label="Emergency contact name" required value={form.emergency} onChange={(v) => setForm({ ...form, emergency: v })} />
              <Field label="Emergency contact phone" type="tel" required value={form.emergencyPhone} onChange={(v) => setForm({ ...form, emergencyPhone: v })} />
              <label className="text-xs font-semibold text-mc-ink-soft">
                Assigned Therapist *
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value })}>
                  {THERAPISTS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-mc-ink-soft">
                Primary Service *
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.careType} onChange={(e) => setForm({ ...form, careType: e.target.value })}>
                  {CARE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-mc-ink-soft">
                Session frequency
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                  {FREQUENCIES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-mc-ink-soft">
                Payer Type *
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={form.payerType} onChange={(e) => setForm({ ...form, payerType: e.target.value })}>
                  <option value="self-pay">Self-Pay</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {form.payerType === 'insurance' && (
                <Field label="Insurance plan / member ID" className="sm:col-span-2" required value={form.insurance} onChange={(v) => setForm({ ...form, insurance: v })} />
              )}
              <Field label="Primary concern" className="sm:col-span-2" required value={form.primaryConcern} onChange={(v) => setForm({ ...form, primaryConcern: v })} />
              <div className="flex gap-2 sm:col-span-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl border border-mc-line py-2.5 text-sm font-semibold">Cancel</button>
                <button disabled={saving} className="flex-1 rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {saving ? 'Saving…' : 'Create Client'}
                </button>
              </div>
              {dupWarn && !/contact details/i.test(dupWarn) && (
                <button
                  type="button"
                  className="sm:col-span-2 text-sm font-semibold text-mc-navy underline"
                  onClick={(e) => {
                    setAllowSimilar(true);
                    createClient(e, { allowSimilar: true });
                  }}
                >
                  Create anyway (do not merge)
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <label className={`text-xs font-semibold text-mc-ink-soft ${className}`}>
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

function StatusBadge({ status }) {
  const s = status || 'active';
  const styles = {
    active: 'bg-emerald-50 text-emerald-800',
    new: 'bg-mc-gold-soft text-mc-gold-deep',
    inactive: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${styles[s] || styles.active}`}>
      {statusLabel(s)}
    </span>
  );
}
