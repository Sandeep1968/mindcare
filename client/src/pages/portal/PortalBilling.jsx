import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  balanceDue,
  fetchMyInvoices,
  fmtDate,
  invoiceStatus,
  money,
  paidAmount,
  printSuperbill,
  statusLabel,
} from '../dashboard/clients/billingStore';

export default function PortalBilling() {
  const { user } = useOutletContext();
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyInvoices()
      .then(setInvoices)
      .catch((e) => setError(e.message || 'Unable to load bills.'));
  }, []);

  const outstanding = useMemo(() => invoices.reduce((s, i) => s + balanceDue(i), 0), [invoices]);
  const collected = useMemo(() => invoices.reduce((s, i) => s + paidAmount(i), 0), [invoices]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-mc-line bg-white px-4 py-3 shadow-sm">
          <div className="text-2xl font-bold text-mc-navy">{money(outstanding)}</div>
          <div className="text-sm font-semibold">Balance due</div>
        </div>
        <div className="rounded-2xl border border-mc-line bg-white px-4 py-3 shadow-sm">
          <div className="text-2xl font-bold text-mc-navy">{money(collected)}</div>
          <div className="text-sm font-semibold">Paid to date</div>
        </div>
      </div>
      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">My invoices</h2>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        {!invoices.length && !error ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No invoices on file yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-mc-line">
            {invoices.map((inv) => {
              const st = invoiceStatus(inv);
              return (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-semibold">
                      {money(inv.amount)}{' '}
                      <span className={`text-xs font-bold ${st === 'paid' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {statusLabel(st)}
                      </span>
                    </div>
                    <div className="text-xs text-mc-ink-soft">{fmtDate(inv.date)} · {inv.number} · {inv.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => printSuperbill(inv, { name: user.name, id: user.patientId })}
                    className="rounded-lg border border-mc-navy/25 px-3 py-1.5 text-sm font-semibold text-mc-navy"
                  >
                    Print statement
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
