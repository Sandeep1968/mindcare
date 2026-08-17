import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import {
  addPayment,
  balanceDue,
  cacheInvoices,
  canManageBilling,
  createInvoice,
  fetchBillingSummary,
  fetchInvoices,
  fmtDate,
  invoiceStatus,
  ledgerTotals,
  money,
  paidAmount,
  printSuperbill,
  removeInvoice,
  statusLabel,
  updateInvoice,
  voidInvoice,
} from './clients/billingStore';

const todayIso = () => new Date().toISOString().slice(0, 10);

const SERVICE_SUGGESTIONS = [
  'Psychotherapy, 50 min (CPT 90837)',
  'Psychotherapy, 45 min (CPT 90834)',
  'Initial evaluation, 60 min (CPT 90791)',
  'Couples therapy, 50 min',
  'Family therapy, 50 min',
  'Group therapy session',
  'No-show / late cancel fee',
];

export default function Billing() {
  const { user } = useAuth();
  const manage = canManageBilling(user?.role);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, sum] = await Promise.all([
        fetchInvoices({ status: 'all' }),
        fetchBillingSummary().catch(() => null),
      ]);
      setRows(inv);
      cacheInvoices(inv);
      setSummary(sum);
      setError('');
    } catch (e) {
      setError(e.message || 'Unable to load billing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api('/patients').then(setPatients).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }

  const list = useMemo(() => {
    let out = rows.slice();
    if (filter === 'void') out = out.filter((r) => invoiceStatus(r) === 'void');
    else if (filter !== 'all') out = out.filter((r) => invoiceStatus(r) === filter);
    else out = out.filter((r) => invoiceStatus(r) !== 'void');
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter(
        (r) =>
          (r.patient || '').toLowerCase().includes(needle) ||
          (r.description || '').toLowerCase().includes(needle) ||
          (r.number || '').toLowerCase().includes(needle),
      );
    }
    return out;
  }, [rows, filter, q]);

  const totals = summary || ledgerTotals(rows.filter((r) => invoiceStatus(r) !== 'void'));

  function clientFor(inv) {
    return patients.find((p) => p.id === inv.patientId) || { name: inv.patient, id: inv.patientId };
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-mc-navy">Billing & Payments</h2>
          <p className="mt-1 text-sm text-mc-ink-soft">Invoices, payments and balances</p>
        </div>
        {manage && (
          <button
            type="button"
            onClick={() => {
              if (!patients.length) { flash('Add a client first'); return; }
              setInvoiceModal({ mode: 'new' });
            }}
            className="rounded-lg bg-mc-gold px-4 py-2.5 text-sm font-bold text-mc-ink shadow-sm"
          >
            + New Invoice
          </button>
        )}
      </header>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-mc-ink px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={refresh} className="font-bold underline">Try Again</button>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard value={money(totals.billed)} label="Billed (all time)" />
        <StatCard value={money(totals.collected)} label="Collected" />
        <StatCard value={money(totals.outstanding)} label="Outstanding" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ['all', 'All'],
          ['unpaid', 'Unpaid'],
          ['partial', 'Partial'],
          ['paid', 'Paid'],
          ['void', 'Void'],
        ].map(([id, lab]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === id ? 'bg-mc-gold text-mc-ink' : 'border border-mc-line bg-white text-mc-ink'}`}
          >
            {lab}
          </button>
        ))}
        <input
          className="ml-auto min-w-[180px] flex-1 rounded-lg border border-mc-line bg-white px-3 py-1.5 text-sm sm:max-w-xs"
          placeholder="Search client, service, invoice #…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search invoices"
        />
      </div>

      <div className="rounded-2xl border border-mc-line bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-mc-ink-soft">Loading invoices…</p>
        ) : !list.length ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-mc-ink-soft">No invoices yet.</p>
            {manage && (
              <button type="button" onClick={() => setInvoiceModal({ mode: 'new' })} className="mt-3 rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">
                + New Invoice
              </button>
            )}
          </div>
        ) : (
          list.map((inv) => {
            const st = invoiceStatus(inv);
            const open = expanded === inv.id;
            return (
              <div key={inv.id} className="border-b border-mc-line last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded(open ? null : inv.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      {inv.patientId ? (
                        <Link to={`/dashboard/patients/${inv.patientId}?tab=billing`} onClick={(e) => e.stopPropagation()} className="font-bold text-mc-navy hover:underline">
                          {inv.patient} — {money(inv.amount)}
                        </Link>
                      ) : (
                        <span className="font-bold text-mc-navy">{inv.patient} — {money(inv.amount)}</span>
                      )}
                      <StatusBadge status={st} />
                    </div>
                    <div className="mt-1 text-sm text-mc-ink-soft">
                      {fmtDate(inv.date)} · {inv.number || inv.id.slice(0, 10)} · {inv.description}
                      {st === 'partial' && ` · due ${money(balanceDue(inv))}`}
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {manage && st !== 'paid' && st !== 'void' && (
                      <button type="button" onClick={() => setPayModal(inv)} className="rounded-lg bg-mc-gold px-3 py-1.5 text-sm font-bold text-mc-ink">
                        Record payment
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!printSuperbill(inv, clientFor(inv))) flash('Print could not start');
                        else flash('Opening print dialog…');
                      }}
                      className="rounded-lg border border-mc-navy/25 bg-white px-3 py-1.5 text-sm font-semibold text-mc-navy"
                    >
                      Print
                    </button>
                    {manage && st !== 'void' && (
                      <button type="button" onClick={() => setInvoiceModal({ mode: 'edit', inv })} className="rounded-lg border border-mc-navy/25 bg-white px-3 py-1.5 text-sm font-semibold text-mc-navy">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {open && (
                  <div className="border-t border-mc-line bg-[#faf7f1] px-5 py-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div><span className="text-mc-ink-soft">Paid</span><div className="font-bold">{money(paidAmount(inv))}</div></div>
                      <div><span className="text-mc-ink-soft">Balance</span><div className="font-bold">{money(balanceDue(inv))}</div></div>
                      <div><span className="text-mc-ink-soft">CPT</span><div className="font-bold">{inv.cptCode || '—'}</div></div>
                    </div>
                    {inv.notes && <p className="mt-2 text-mc-ink-soft">Note: {inv.notes}</p>}
                    <h4 className="mt-3 text-xs font-bold uppercase text-mc-ink-soft">Payment history</h4>
                    {!(inv.payments || []).length ? (
                      <p className="text-mc-ink-soft">No payments yet.</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {inv.payments.map((p) => (
                          <li key={p.id || `${p.date}-${p.amount}`}>
                            {fmtDate(p.date)} · {p.method} · {money(p.amount)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {invoiceModal && (
        <InvoiceModal
          mode={invoiceModal.mode}
          inv={invoiceModal.inv}
          patients={patients}
          onClose={() => setInvoiceModal(null)}
          onSave={async (data, id) => {
            try {
              if (id) await updateInvoice(id, data);
              else await createInvoice(data);
              setInvoiceModal(null);
              flash('Invoice saved');
              await refresh();
            } catch (e) {
              flash(e.message || 'Failed to save invoice');
            }
          }}
          onDelete={manage ? async (id) => {
            if (!window.confirm('Delete this invoice and its payment history?')) return;
            try {
              await removeInvoice(id);
              setInvoiceModal(null);
              flash('Invoice deleted');
              await refresh();
            } catch (e) {
              flash(e.message);
            }
          } : null}
          onVoid={manage ? async (id) => {
            if (!window.confirm('Void this invoice? It stays in history but is no longer collectible.')) return;
            try {
              await voidInvoice(id);
              setInvoiceModal(null);
              flash('Invoice voided');
              await refresh();
            } catch (e) {
              flash(e.message);
            }
          } : null}
        />
      )}

      {payModal && (
        <PaymentModal
          inv={payModal}
          onClose={() => setPayModal(null)}
          onSave={async (data) => {
            try {
              await addPayment(payModal.id, data);
              setPayModal(null);
              flash('Payment recorded');
              await refresh();
            } catch (e) {
              flash(e.message || 'Payment failed');
            }
          }}
        />
      )}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-mc-line bg-white px-5 py-4 shadow-sm">
      <div className="text-[26px] font-bold leading-none text-mc-gold">{value}</div>
      <div className="mt-2 text-sm font-semibold text-mc-ink">{label}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    paid: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-mc-navy-soft text-mc-navy',
    unpaid: 'bg-red-100 text-red-800',
    void: 'bg-slate-200 text-slate-600',
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${styles[status] || styles.unpaid}`}>
      {statusLabel(status)}
    </span>
  );
}

export function InvoiceModal({ mode, inv, patients, onClose, onSave, onDelete, onVoid, lockedClient }) {
  const [form, setForm] = useState({
    patientId: lockedClient?.id || inv?.patientId || '',
    date: inv?.date || todayIso(),
    description: inv?.description || '',
    amount: inv?.amount ?? '',
    cptCode: inv?.cptCode || '',
    notes: inv?.notes || '',
  });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(
        {
          patientId: form.patientId || lockedClient?.id,
          date: form.date,
          description: form.description.trim(),
          amount: Number(form.amount),
          cptCode: form.cptCode,
          notes: form.notes,
        },
        mode === 'edit' ? inv.id : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/45 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="inv-title">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-xl leading-none text-mc-ink-soft hover:text-mc-navy" aria-label="Close">×</button>
        <h3 id="inv-title" className="pr-8 text-xl font-bold text-mc-navy">{mode === 'edit' ? 'Edit invoice' : 'New invoice'}</h3>

        {!lockedClient ? (
          <label className="mt-4 block text-sm font-semibold text-mc-ink">
            Patient *
            <select required className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Select…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        ) : (
          <p className="mt-3 text-sm font-semibold text-mc-ink">Patient: {lockedClient.name}</p>
        )}

        <label className="mt-3 block text-sm font-semibold text-mc-ink">
          Date *
          <input required type="date" className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>

        <label className="mt-3 block text-sm font-semibold text-mc-ink">
          Service description *
          <input required list="service-suggestions" placeholder="e.g. Psychotherapy, 50 min (CPT 90837)" className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <datalist id="service-suggestions">{SERVICE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-mc-ink">
            Amount (USD) *
            <input required type="number" min="0" step="0.01" className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-mc-ink">
            CPT code
            <input className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" placeholder="90837" value={form.cptCode} onChange={(e) => setForm({ ...form, cptCode: e.target.value })} />
          </label>
        </div>

        <label className="mt-3 block text-sm font-semibold text-mc-ink">
          Internal notes
          <textarea className="mt-1.5 min-h-16 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment plan, sliding scale, etc." />
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {mode === 'edit' && onDelete && (
            <button type="button" onClick={() => onDelete(inv.id)} className="mr-auto rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white">Delete</button>
          )}
          {mode === 'edit' && onVoid && (
            <button type="button" onClick={() => onVoid(inv.id)} className="rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold text-mc-ink-soft">Void</button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">Cancel</button>
          <button disabled={busy} className="rounded-lg bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink disabled:opacity-60">
            {busy ? 'Saving…' : 'Save invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PaymentModal({ inv, onClose, onSave }) {
  const due = balanceDue(inv);
  const [form, setForm] = useState({ amount: due.toFixed(2), date: todayIso(), method: 'Card' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ amount: Number(form.amount), date: form.date, method: form.method });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/45 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <h3 id="pay-title" className="text-xl font-bold text-mc-navy">Record payment</h3>
        <p className="mt-2 text-sm text-mc-ink-soft">
          {inv.patient} — {inv.description}<br />
          Balance due: <b className="text-mc-ink">{money(due)}</b>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-mc-ink">
            Amount *
            <input required type="number" min="0.01" step="0.01" max={due || undefined} className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="text-sm font-semibold text-mc-ink">
            Date *
            <input required type="date" className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold text-mc-ink">
          Method
          <select className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option>Card</option><option>Cash</option><option>Check</option><option>Bank transfer</option><option>Insurance</option><option>Other</option>
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold">Cancel</button>
          <button disabled={busy} className="rounded-lg bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink disabled:opacity-60">{busy ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </div>
  );
}
