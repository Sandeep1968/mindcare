import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { formsFor } from './portalData';
import { ageFromDob, formatLongDate } from '../dashboard/clients/clientData';
import { balanceDue, fetchMyInvoices, invoiceStatus, money, paidAmount, statusLabel } from '../dashboard/clients/billingStore';

export default function PortalDocuments() {
  const { me, user } = useOutletContext();
  const [invoices, setInvoices] = useState([]);
  const forms = formsFor(user?.patientId);

  useEffect(() => {
    fetchMyInvoices().then(setInvoices).catch(() => setInvoices([]));
  }, []);

  const report = useMemo(() => (me?.patient ? buildOwnReport(me, invoices) : null), [me, invoices]);

  if (!me) return <p className="text-sm text-mc-ink-soft">Loading…</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-mc-navy">My health report</h2>
            <p className="text-xs text-mc-ink-soft">Your confidential summary — no other patients.</p>
          </div>
          <button
            type="button"
            disabled={!report}
            onClick={() => window.print()}
            className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink disabled:opacity-50"
          >
            ↓ Download PDF
          </button>
        </div>
      </section>

      {report && (
        <article className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm print:border-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-mc-gold pb-4">
            <div>
              <BrandLogo className="h-10 max-w-[180px]" />
              <p className="mt-2 text-sm font-semibold text-mc-navy">Confidential health report</p>
            </div>
            <div className="text-right text-sm text-mc-ink-soft">
              <div>Generated: {report.generated}</div>
              <div>Patient ID: {report.patientId}</div>
            </div>
          </header>
          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-mc-gold-deep">Patient information</h3>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info k="Name" v={report.name} />
            <Info k="Date of birth" v={report.dob} />
            <Info k="Phone" v={report.phone} />
            <Info k="Email" v={report.email} />
            <Info k="Emergency contact" v={report.emergency} />
            <Info k="Insurance" v={report.insurance} />
          </dl>
          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-mc-gold-deep">Visit history</h3>
          {!report.visits.length ? (
            <p className="text-sm text-mc-ink-soft">No visits on file.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#eef5fc] text-[11px] font-bold uppercase text-mc-navy">
                  <th className="px-3 py-2">Date</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.visits.map((v) => (
                  <tr key={`${v.date}-${v.time}`} className="border-b border-mc-line">
                    <td className="px-3 py-2">{v.date}</td>
                    <td className="px-3 py-2">{v.time}</td>
                    <td className="px-3 py-2">{v.type}</td>
                    <td className="px-3 py-2">{v.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 className="mb-3 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-mc-gold-deep">Billing summary</h3>
          {!report.bills.length ? (
            <p className="text-sm text-mc-ink-soft">No invoices on file.</p>
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#eef5fc] text-[11px] font-bold uppercase text-mc-navy">
                    <th className="px-3 py-2">Date</th><th className="px-3 py-2">Service</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bills.map((b, i) => (
                    <tr key={i} className="border-b border-mc-line">
                      <td className="px-3 py-2">{b.date}</td>
                      <td className="px-3 py-2">{b.service}</td>
                      <td className="px-3 py-2">{b.amount}</td>
                      <td className="px-3 py-2">{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm">Total billed: <strong>{report.totals.billed}</strong> · Paid: <strong>{report.totals.paid}</strong> · Balance: <strong>{report.totals.balance}</strong></p>
            </>
          )}
          <p className="mt-6 text-[11px] text-mc-ink-soft">
            This report is for you and your clinic. It contains protected health information.
          </p>
        </article>
      )}

      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Forms & documents</h2>
        <p className="mt-1 text-xs text-mc-ink-soft">Intake, consent, and forms assigned to you.</p>
        {!forms.length ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No documents on file yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-mc-line">
            {forms.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-semibold">{f.name}</div>
                  <div className="text-xs text-mc-ink-soft">{formatLongDate(f.date)}</div>
                </div>
                <span className="text-xs font-bold text-mc-navy">{f.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ k, v }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-mc-ink-soft">{k}</dt>
      <dd className="font-semibold">{v || '—'}</dd>
    </div>
  );
}

function buildOwnReport(me, invoices) {
  const p = me.patient;
  const age = ageFromDob(p.dob);
  const billed = invoices.filter((i) => invoiceStatus(i) !== 'void').reduce((s, i) => s + Number(i.amount || 0), 0);
  const paid = invoices.filter((i) => invoiceStatus(i) !== 'void').reduce((s, i) => s + paidAmount(i), 0);
  const balance = invoices.filter((i) => invoiceStatus(i) !== 'void').reduce((s, i) => s + balanceDue(i), 0);
  return {
    name: p.name,
    patientId: p.client_code || p.id.slice(0, 12),
    generated: new Date().toLocaleDateString('en-GB'),
    dob: p.dob ? `${formatLongDate(p.dob)}${age != null ? ` (${age} yrs)` : ''}` : '—',
    phone: p.phone,
    email: p.email,
    emergency: [p.emergency, p.emergency_phone].filter(Boolean).join(' — ') || '—',
    insurance: p.payer_type === 'insurance' ? (p.insurance || 'Insurance') : (p.insurance || 'Self-pay'),
    visits: (me.appointments || []).map((a) => ({
      date: formatLongDate(a.date),
      time: a.time,
      type: a.type === 'video' ? 'Video' : 'In-person',
      reason: a.reason,
    })),
    bills: invoices.filter((i) => invoiceStatus(i) !== 'void').map((i) => ({
      date: formatLongDate(i.date),
      service: i.description,
      amount: money(i.amount),
      status: statusLabel(invoiceStatus(i)),
    })),
    totals: { billed: money(billed), paid: money(paid), balance: money(balance) },
  };
}
