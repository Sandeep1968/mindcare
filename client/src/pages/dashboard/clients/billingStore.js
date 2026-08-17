/** Billing helpers + API client. Print uses a hidden iframe (no popup blocker). */

import { api } from '../../../lib/api';

export const BILLING_KEY = 'mindcare.demo.billing'; // legacy — API is source of truth

export function money(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function paidAmount(inv) {
  if (inv.paid != null) return Number(inv.paid);
  return (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
}

export function balanceDue(inv) {
  if (inv.balance != null) return Number(inv.balance);
  if (inv.status === 'void' || inv.payStatus === 'void') return 0;
  return Math.max(0, Math.round((Number(inv.amount || 0) - paidAmount(inv)) * 100) / 100);
}

/** @returns {'paid'|'partial'|'unpaid'|'void'} */
export function invoiceStatus(inv) {
  if (inv.payStatus) return inv.payStatus;
  if (inv.status === 'void') return 'void';
  const paid = paidAmount(inv);
  const amount = Number(inv.amount || 0);
  if (amount <= 0 || paid >= amount - 0.001) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

export function statusLabel(st) {
  if (st === 'paid') return 'Paid';
  if (st === 'partial') return 'Partially paid';
  if (st === 'void') return 'Void';
  return 'Unpaid';
}

export function ledgerTotals(rows = []) {
  const active = rows.filter((i) => invoiceStatus(i) !== 'void');
  const billed = active.reduce((s, i) => s + Number(i.amount || 0), 0);
  const collected = active.reduce((s, i) => s + paidAmount(i), 0);
  const outstanding = active.reduce((s, i) => s + balanceDue(i), 0);
  return { billed, collected, outstanding };
}

export function canManageBilling(role) {
  return role === 'admin' || role === 'staff' || role === 'practitioner';
}

export function canViewBillingDetail(role) {
  return canManageBilling(role);
}

export function invoicesForClient(client, allInvoices) {
  if (!client || !allInvoices) return [];
  const id = client.id || client.patientId;
  const name = (client.name || '').toLowerCase();
  return allInvoices.filter(
    (r) => (r.patientId && r.patientId === id) || (name && (r.patient || '').toLowerCase() === name),
  );
}

export function clientOutstanding(client, allInvoices) {
  return invoicesForClient(client, allInvoices).reduce((s, inv) => s + balanceDue(inv), 0);
}

/* ---------- API ---------- */

export async function fetchInvoices(params = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.patientId) qs.set('patientId', params.patientId);
  if (params.q) qs.set('q', params.q);
  const q = qs.toString();
  return api(`/billing/invoices${q ? `?${q}` : ''}`);
}

export async function fetchBillingSummary() {
  return api('/billing/summary');
}

export async function fetchMyInvoices() {
  return api('/billing/mine');
}

export async function createInvoice(body) {
  return api('/billing/invoices', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateInvoice(id, body) {
  return api(`/billing/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function removeInvoice(id) {
  return api(`/billing/invoices/${id}`, { method: 'DELETE' });
}

export async function voidInvoice(id) {
  return api(`/billing/invoices/${id}/void`, { method: 'POST', body: JSON.stringify({}) });
}

export async function addPayment(id, body) {
  return api(`/billing/invoices/${id}/payments`, { method: 'POST', body: JSON.stringify(body) });
}

/* ---------- Print (iframe — works without pop-up permission) ---------- */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStatementHtml(inv, client) {
  const paid = paidAmount(inv);
  const due = balanceDue(inv);
  const name = client?.name || inv.patient || 'Client';
  const dob = client?.dob ? fmtDate(client.dob) : '—';
  const insurance = client?.insurance
    || (client?.payer_type === 'insurance' ? 'Insurance on file' : client?.payer_type === 'self-pay' ? 'Self-pay' : '—');
  const logo = `${window.location.origin}/logo.png`;
  const invNo = inv.number || inv.id;

  const paymentsHtml = (inv.payments || []).length
    ? `<table class="tbl"><thead><tr><th>Date</th><th>Method</th><th class="r">Amount</th></tr></thead><tbody>
        ${inv.payments
          .map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${escapeHtml(p.method || '—')}</td><td class="r">${money(p.amount)}</td></tr>`)
          .join('')}
      </tbody></table>`
    : '<p class="muted">No payments recorded.</p>';

  return `<!doctype html><html><head><meta charset="utf-8"/>
    <title>MindCare Statement — ${escapeHtml(name)}</title>
    <style>
      @page { margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: "Segoe UI", system-ui, sans-serif; color: #0b2540; margin: 0; padding: 24px; background: #fff; }
      .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
        padding-bottom: 14px; border-bottom: 4px solid #ffb81c; margin-bottom: 8px; }
      .brand img { height: 52px; width: auto; display: block; }
      .muted { color: #5a7a9a; font-size: 13px; }
      h2 { font-size: 13px; color: #003e7e; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: .05em; }
      .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
      .tbl th, .tbl td { padding: 8px 4px; border-bottom: 1px solid #e5dcc8; text-align: left; }
      .tbl .r, .r { text-align: right; }
      .totals { margin-top: 14px; font-size: 14px; }
      .foot { margin-top: 28px; font-size: 11px; color: #666; line-height: 1.45;
        border-top: 1px solid #e5dcc8; padding-top: 10px; }
    </style></head><body>
    <div class="brand">
      <div>
        <img src="${logo}" alt="MindCare" width="200" height="62" />
        <div class="muted" style="margin-top:6px">Statement of services (superbill)</div>
      </div>
      <div class="muted" style="text-align:right">
        Statement date: ${new Date().toLocaleDateString()}<br/>
        Invoice ID: ${escapeHtml(invNo)}
      </div>
    </div>
    <h2>Patient</h2>
    <p style="margin:0;line-height:1.65"><b>Name:</b> ${escapeHtml(name)}<br/>
       <b>Date of birth:</b> ${escapeHtml(String(dob))}<br/>
       <b>Insurance:</b> ${escapeHtml(String(insurance))}</p>
    <h2>Services</h2>
    <table class="tbl">
      <thead><tr><th style="width:150px">Date of service</th><th>Description</th><th class="r" style="width:90px">Charge</th></tr></thead>
      <tbody><tr><td>${fmtDate(inv.date)}</td><td>${escapeHtml(inv.description || '')}${inv.cptCode ? ` · CPT ${escapeHtml(inv.cptCode)}` : ''}</td><td class="r">${money(inv.amount)}</td></tr></tbody>
    </table>
    <h2>Payments</h2>
    ${paymentsHtml}
    <p class="totals"><b>Total charged:</b> ${money(inv.amount)} &nbsp;&nbsp;
      <b>Paid:</b> ${money(paid)} &nbsp;&nbsp;
      <b>Balance due:</b> ${money(due)}</p>
    <p class="foot">Statement generated by MindCare for the patient's records and out-of-network reimbursement.
      Provider NPI / tax ID may be stamped where required. This is not an insurance claim submission.</p>
    </body></html>`;
}

/**
 * Reliable print: hidden iframe in the same origin (avoids popup blockers).
 * Waits for logo image before calling print().
 */
export function printSuperbill(inv, client) {
  try {
    const html = buildStatementHtml(inv, client);
    let iframe = document.getElementById('mc-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'mc-print-frame';
      iframe.setAttribute('title', 'Print statement');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      // Fallback: open blob URL (still same-origin-ish)
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        window.alert('Unable to open print view. Check browser pop-up settings.');
        return false;
      }
      w.onload = () => {
        setTimeout(() => {
          w.focus();
          w.print();
          URL.revokeObjectURL(url);
        }, 300);
      };
      return true;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch (err) {
        console.error(err);
        window.alert('Print failed. Try again or use Save as PDF from the print dialog.');
      }
    };

    const imgs = Array.from(doc.images || []);
    if (!imgs.length) {
      setTimeout(triggerPrint, 150);
      return true;
    }
    let left = imgs.length;
    const done = () => {
      left -= 1;
      if (left <= 0) setTimeout(triggerPrint, 100);
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.onload = done;
        img.onerror = done;
      }
    });
    // Safety timeout if image never settles
    setTimeout(triggerPrint, 2000);
    return true;
  } catch (err) {
    console.error(err);
    window.alert('Could not prepare the statement for printing.');
    return false;
  }
}

/* ---------- Legacy localStorage bridges (Client 360 / Overview until fully migrated) ---------- */

export function loadInvoices() {
  // Prefer last API cache if present
  try {
    const raw = localStorage.getItem('mindcare.billing.cache');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function cacheInvoices(rows) {
  localStorage.setItem('mindcare.billing.cache', JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('mindcare:billing'));
}

export async function loadInvoicesFromApi(params) {
  const rows = await fetchInvoices(params);
  cacheInvoices(rows);
  return rows;
}

// Compatibility shims used by older call sites
export async function upsertInvoice(data, invoiceId) {
  if (invoiceId) return updateInvoice(invoiceId, data);
  return createInvoice(data);
}

export async function deleteInvoice(invoiceId) {
  return removeInvoice(invoiceId);
}

export async function recordPayment(invoiceId, body) {
  return addPayment(invoiceId, body);
}
