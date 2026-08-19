import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { ModuleHeader } from './ModuleBits';
import BrandLogo from '../../components/BrandLogo';
import {
  ageFromDob,
  formatTime,
} from './clients/clientData';
import {
  balanceDue,
  fetchInvoices,
  invoiceStatus,
  money,
  paidAmount,
  statusLabel,
} from './clients/billingStore';

export default function Reports() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [detail, setDetail] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/patients')
      .then((rows) => {
        setPatients(rows);
      })
      .catch((e) => setError(e.message || 'Unable to load patients.'));
  }, []);

  useEffect(() => {
    if (!patientId) {
      setDetail(null);
      setInvoices([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      api(`/patients/${patientId}`),
      fetchInvoices({ patientId }).catch(() => []),
    ])
      .then(([d, bills]) => {
        if (cancelled) return;
        setDetail(d);
        setInvoices(bills);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Unable to load this report.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [patientId]);

  const report = useMemo(() => (detail ? buildReport(detail, invoices) : null), [detail, invoices]);

  return (
    <div>
      <ModuleHeader
        title="Reports"
        lead="On-screen report with PDF download"
      />

      <div className="mb-4 rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1 text-xs font-bold uppercase tracking-wide text-mc-navy">
            Patient
            <select
              className="mt-1 w-full rounded-lg border border-mc-gold bg-white px-3 py-2.5 text-sm font-semibold text-mc-ink outline-none focus:ring-2 focus:ring-mc-gold/40"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">— Select patient —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!report}
            onClick={() => printPatientReport(report)}
            className="inline-flex items-center gap-2 rounded-lg bg-mc-gold px-4 py-2.5 text-sm font-bold text-mc-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↓ Download PDF
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      )}

      {!patientId && (
        <div className="min-h-[280px] rounded-2xl border border-mc-line bg-white shadow-sm" />
      )}

      {patientId && loading && (
        <p className="rounded-2xl border border-mc-line bg-white p-8 text-sm text-mc-ink-soft">Building report…</p>
      )}

      {report && !loading && <ReportPreview report={report} />}
    </div>
  );
}

function ReportPreview({ report }) {
  return (
    <article className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm md:p-8">
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

      <SectionTitle>Patient information</SectionTitle>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <Info k="Name" v={report.name} />
        <Info k="Date of birth" v={report.dob} />
        <Info k="Phone" v={report.phone} />
        <Info k="Email" v={report.email} />
        <Info k="Emergency contact" v={report.emergency} />
        <Info k="Insurance" v={report.insurance} />
      </dl>

      <SectionTitle>Clinical history</SectionTitle>
      <ReportTable
        cols={['Date', 'Symptoms', 'Diagnosis', 'Notes']}
        empty="No clinical history on file for this patient."
        rows={report.clinical.map((r) => [r.date, r.symptoms, r.diagnosis, r.notes])}
      />

      <SectionTitle>Visit history</SectionTitle>
      <ReportTable
        cols={['Date', 'Time', 'Type', 'Reason']}
        empty="No visits recorded for this patient."
        rows={report.visits.map((r) => [r.date, r.time, r.type, r.reason])}
      />

      <SectionTitle>Billing summary</SectionTitle>
      <ReportTable
        cols={['Date', 'Service', 'Amount', 'Status']}
        empty="No invoices for this patient."
        rows={report.bills.map((r) => [r.date, r.service, r.amount, r.status])}
      />
      {report.bills.length > 0 && (
        <div className="mt-3 space-y-0.5 text-sm text-mc-ink">
          <div>Total billed: <strong>{report.totals.billed}</strong></div>
          <div>Paid: <strong>{report.totals.paid}</strong></div>
          <div>Balance: <strong>{report.totals.balance}</strong></div>
        </div>
      )}

      <p className="mt-8 text-[11px] leading-relaxed text-mc-ink-soft">
        This report was generated by MindCare for clinical and administrative use. It contains protected health information
        and should be stored, transmitted, and disclosed only as permitted by applicable privacy law (including HIPAA for
        covered entities). This is not an insurance claim submission.
      </p>
    </article>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
      {children}
    </h3>
  );
}

function Info({ k, v }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-mc-ink-soft">{k}</dt>
      <dd className="text-sm font-semibold text-mc-navy">{v || '—'}</dd>
    </div>
  );
}

function ReportTable({ cols, rows, empty }) {
  if (!rows.length) {
    return <p className="text-sm text-mc-ink-soft">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#d7e6f5] bg-[#eef5fc] text-[11px] font-bold uppercase tracking-wide text-mc-navy">
            {cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-mc-line last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 align-top text-mc-ink">{cell || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildReport(detail, invoices) {
  const age = ageFromDob(detail.dob);
  const notes = (detail.clinicalNotes || []).map((n) => ({
    date: formatReportDate(n.date),
    symptoms: n.symptoms || n.type || '—',
    diagnosis: n.diagnosis || '—',
    notes: n.body || n.notes || '—',
  }));
  const records = (detail.records || []).map((r) => ({
    date: formatReportDate(r.record_date || r.date),
    symptoms: r.symptoms || '—',
    diagnosis: r.diagnosis || '—',
    notes: r.notes || r.body || '—',
  }));
  const clinical = notes.length ? notes : records;

  const visits = (detail.appointments || [])
    .slice()
    .sort((a, b) => `${b.appt_date || b.date}${b.appt_time || b.time}`.localeCompare(`${a.appt_date || a.date}${a.appt_time || a.time}`))
    .map((a) => ({
      date: formatReportDate(a.appt_date || a.date),
      time: formatTime(a.appt_time || a.time) || '—',
      type: (a.session_type || a.type) === 'video' ? 'Video' : 'In-person',
      reason: a.reason || 'Therapy session',
    }));

  const bills = (invoices || [])
    .filter((i) => invoiceStatus(i) !== 'void')
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .map((i) => ({
      date: formatReportDate(i.date),
      service: i.description || 'Session',
      amount: money(i.amount),
      status: statusLabel(invoiceStatus(i)),
    }));

  const billed = (invoices || []).filter((i) => invoiceStatus(i) !== 'void').reduce((s, i) => s + Number(i.amount || 0), 0);
  const paid = (invoices || []).filter((i) => invoiceStatus(i) !== 'void').reduce((s, i) => s + paidAmount(i), 0);
  const balance = (invoices || []).filter((i) => invoiceStatus(i) !== 'void').reduce((s, i) => s + balanceDue(i), 0);

  const emergency = [detail.emergency, detail.emergency_phone].filter(Boolean).join(' — ') || '—';
  const insurance = detail.payer_type === 'insurance'
    ? (detail.insurance || 'Insurance')
    : (detail.insurance || 'Self-pay');

  return {
    name: detail.name,
    patientId: detail.client_code || String(detail.id || '').slice(0, 12),
    generated: new Date().toLocaleDateString('en-GB'),
    dob: detail.dob
      ? `${formatReportDate(detail.dob)}${age != null ? ` (${age} yrs)` : ''}`
      : '—',
    phone: detail.phone || '—',
    email: detail.email || '—',
    emergency,
    insurance,
    clinical,
    visits,
    bills,
    totals: {
      billed: money(billed),
      paid: money(paid),
      balance: money(balance),
    },
  };
}

function formatReportDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function printPatientReport(report) {
  const rows = (items, empty) => (
    items.length
      ? items.map((cells) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="4">${esc(empty)}</td></tr>`
  );

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Confidential health report — ${esc(report.name)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #1a2b4b; padding: 28px; }
  header { display: flex; justify-content: space-between; border-bottom: 3px solid #c48900; padding-bottom: 12px; }
  img { height: 42px; }
  h3 { color: #9a6b00; letter-spacing: .14em; text-transform: uppercase; font-size: 12px; margin: 28px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #eef5fc; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #e8ecf1; vertical-align: top; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .k { font-size: 11px; color: #6b7280; } .v { font-weight: 700; }
  .foot { margin-top: 28px; font-size: 11px; color: #6b7280; }
</style></head><body>
  <header>
    <div>
      <img src="${window.location.origin}/logo.png" alt="MindCare" />
      <div style="margin-top:8px;font-weight:600">Confidential health report</div>
    </div>
    <div style="text-align:right;font-size:13px;color:#6b7280">
      <div>Generated: ${esc(report.generated)}</div>
      <div>Patient ID: ${esc(report.patientId)}</div>
    </div>
  </header>
  <h3>Patient information</h3>
  <div class="grid">
    ${[['Name', report.name], ['Date of birth', report.dob], ['Phone', report.phone], ['Email', report.email], ['Emergency contact', report.emergency], ['Insurance', report.insurance]]
      .map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}
  </div>
  <h3>Clinical history</h3>
  <table><thead><tr><th>Date</th><th>Symptoms</th><th>Diagnosis</th><th>Notes</th></tr></thead>
  <tbody>${rows(report.clinical.map((r) => [r.date, r.symptoms, r.diagnosis, r.notes]), 'No clinical history on file.')}</tbody></table>
  <h3>Visit history</h3>
  <table><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Reason</th></tr></thead>
  <tbody>${rows(report.visits.map((r) => [r.date, r.time, r.type, r.reason]), 'No visits recorded.')}</tbody></table>
  <h3>Billing summary</h3>
  <table><thead><tr><th>Date</th><th>Service</th><th>Amount</th><th>Status</th></tr></thead>
  <tbody>${rows(report.bills.map((r) => [r.date, r.service, r.amount, r.status]), 'No invoices for this patient.')}</tbody></table>
  ${report.bills.length ? `<p>Total billed: <b>${esc(report.totals.billed)}</b><br>Paid: <b>${esc(report.totals.paid)}</b><br>Balance: <b>${esc(report.totals.balance)}</b></p>` : ''}
  <p class="foot">This report was generated by MindCare for clinical and administrative use. It contains protected health information and should be stored, transmitted, and disclosed only as permitted by applicable privacy law (including HIPAA for covered entities). This is not an insurance claim submission.</p>
</body></html>`;

  let iframe = document.getElementById('mc-report-print');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'mc-report-print';
    iframe.setAttribute('title', 'Print report');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(iframe);
  }
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    window.alert('Unable to open print view.');
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => { try { win.focus(); win.print(); } catch { /* ignore */ } };
  const imgs = Array.from(doc.images || []);
  if (!imgs.length) setTimeout(go, 150);
  else {
    let left = imgs.length;
    const done = () => { left -= 1; if (left <= 0) setTimeout(go, 80); };
    imgs.forEach((img) => { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
    setTimeout(go, 1800);
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
