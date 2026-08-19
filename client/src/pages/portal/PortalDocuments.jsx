import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { api } from '../../lib/api';
import { formsFor } from './portalData';
import { ageFromDob, formatLongDate } from '../dashboard/clients/clientData';
import { balanceDue, fetchMyInvoices, invoiceStatus, money, paidAmount, statusLabel } from '../dashboard/clients/billingStore';

const FORM_COPY = {
  intake: 'I confirm that the intake information I provided to the clinic is accurate and complete to the best of my knowledge.',
  consent: 'I consent to receive mental health services from this clinic. I understand the nature of therapy, limits of confidentiality, and my rights as a patient.',
  hipaa: 'I acknowledge that I have received the clinic HIPAA Notice of Privacy Practices.',
  telehealth: 'I agree to participate in telehealth sessions and understand the limits of remote care, including privacy on my side of the connection.',
};

export default function PortalDocuments() {
  const { me, user } = useOutletContext();
  const [invoices, setInvoices] = useState([]);
  const [forms, setForms] = useState([]);
  const [signing, setSigning] = useState(null);
  const [signedName, setSignedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyInvoices().then(setInvoices).catch(() => setInvoices([]));
  }, []);

  useEffect(() => {
    setForms(me?.forms || formsFor(user?.patientId));
  }, [me, user?.patientId]);

  useEffect(() => {
    if (signing) {
      setSignedName(user?.name || me?.patient?.name || '');
      setAgreed(false);
      setError('');
    }
  }, [signing, user?.name, me?.patient?.name]);

  const report = useMemo(() => (me?.patient ? buildOwnReport(me, invoices) : null), [me, invoices]);
  const pending = forms.filter((f) => f.status === 'Pending' || f.status === 'Needs Review');

  async function submitSign(e) {
    e.preventDefault();
    if (!signing || !signedName.trim() || !agreed) return;
    setBusy(true);
    setError('');
    try {
      const row = await api(`/portal/forms/${signing.id}/sign`, {
        method: 'POST',
        body: JSON.stringify({ signedName: signedName.trim(), agreed: true }),
      });
      setForms((cur) => cur.map((f) => (f.id === row.id ? row : f)));
      setSigning(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

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
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <Info k="Total billed" v={report.totals.billed} />
            <Info k="Total paid" v={report.totals.paid} />
            <Info k="Balance due" v={report.totals.balance} />
          </dl>
          <p className="mt-8 text-xs text-mc-ink-soft">
            This report is for you and your clinic. It contains protected health information.
          </p>
        </article>
      )}

      <section className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <h2 className="font-bold text-mc-navy">Forms & documents</h2>
        <p className="mt-1 text-xs text-mc-ink-soft">
          Intake, consent, and forms assigned to you. Pending items can be signed here — your clinic sees the timestamp.
        </p>
        {pending.length > 0 && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            {pending.length} form{pending.length > 1 ? 's' : ''} waiting for your signature
          </p>
        )}
        {!forms.length ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No documents on file yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-mc-line">
            {forms.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold">{f.name}</div>
                  <div className="text-xs text-mc-ink-soft">
                    Assigned {formatLongDate(f.date)}
                    {f.signedAt && ` · Signed ${formatLongDate(f.signedAt)}${f.signedName ? ` by ${f.signedName}` : ''}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    f.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-mc-gold-soft text-mc-gold-deep'
                  }`}
                  >
                    {f.status}
                  </span>
                  {(f.status === 'Pending' || f.status === 'Needs Review') && (
                    <button
                      type="button"
                      onClick={() => setSigning(f)}
                      className="rounded-lg bg-mc-navy px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Review & sign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {signing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSigning(null); }}
        >
          <form onSubmit={submitSign} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-mc-navy">{signing.name}</h3>
            <p className="mt-2 rounded-lg border border-mc-line bg-[#faf7f1] px-3 py-3 text-sm text-mc-ink">
              {FORM_COPY[signing.formKey] || 'I have read this document and agree to its terms.'}
            </p>
            <label className="mt-4 block text-xs font-semibold text-mc-ink-soft">
              Full legal name (electronic signature)
              <input
                required
                className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input required type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>I agree that typing my name above is my electronic signature on this form.</span>
            </label>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setSigning(null)} className="flex-1 rounded-xl border border-mc-line py-2 text-sm font-semibold">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-mc-gold py-2 text-sm font-bold text-mc-ink disabled:opacity-60">Sign form</button>
            </div>
          </form>
        </div>
      )}
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
