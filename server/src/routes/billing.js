import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState, newId, DEMO_IDS } from '../demo.js';

const router = Router();

function paidAmount(inv) {
  return (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
}

function balanceDue(inv) {
  if (inv.status === 'void') return 0;
  return Math.max(0, Math.round((Number(inv.amount || 0) - paidAmount(inv)) * 100) / 100);
}

function payStatus(inv) {
  if (inv.status === 'void') return 'void';
  const paid = paidAmount(inv);
  const amount = Number(inv.amount || 0);
  if (amount <= 0 || paid >= amount - 0.001) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

function mapInvoice(row, patientName) {
  const payments = (row.payments || []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    date: p.paid_on || p.date,
    method: p.method || 'Card',
  }));
  const inv = {
    id: row.id,
    patientId: row.patient_id,
    patient: patientName || row.patient_name || 'Client',
    number: row.invoice_number || row.id.slice(0, 12),
    date: row.invoice_date,
    description: row.description,
    cptCode: row.cpt_code || '',
    amount: Number(row.amount),
    notes: row.notes || '',
    status: row.status || 'open',
    createdAt: row.created_at,
    payments,
  };
  inv.paid = paidAmount({ payments: inv.payments });
  inv.balance = balanceDue({ ...inv, amount: inv.amount, status: inv.status, payments: inv.payments });
  inv.payStatus = payStatus({ ...inv, payments: inv.payments });
  return inv;
}

function patientName(id) {
  return demoState.patients.find((p) => p.id === id)?.name || 'Client';
}

function nextInvoiceNumber() {
  const seq = demoState.invoiceSeq || demoState.invoices.length + 1;
  demoState.invoiceSeq = seq + 1;
  return `INV-2026-${String(seq).padStart(4, '0')}`;
}

router.use(authRequired);

/** Patient portal: own invoices only */
router.get('/mine', async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Patient access only' });
  }
  const pid = req.user.patientId;
  if (!pid) return res.json([]);

  if (!hasDatabase()) {
    const rows = demoState.invoices
      .filter((i) => i.patient_id === pid && i.status !== 'void')
      .map((i) => mapInvoice(i, patientName(i.patient_id)));
    return res.json(rows);
  }

  const rows = await sql`
    SELECT i.*, p.name AS patient_name,
           pay.id AS pay_id, pay.amount AS pay_amount,
           pay.paid_on AS pay_paid_on, pay.method AS pay_method
    FROM invoices i
    JOIN patients p ON p.id = i.patient_id
    LEFT JOIN invoice_payments pay ON pay.invoice_id = i.id
    WHERE i.patient_id = ${pid} AND coalesce(i.status,'open') <> 'void'
    ORDER BY i.invoice_date DESC, pay.paid_on
  `;
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, { ...row, payments: [] });
    if (row.pay_id) map.get(row.id).payments.push({ id: row.pay_id, amount: row.pay_amount, paid_on: row.pay_paid_on, method: row.pay_method });
  }
  res.json(Array.from(map.values()).map((row) => mapInvoice(row, row.patient_name)));
});

router.use(requireStaff);

router.get('/summary', async (_req, res) => {
  const invoices = await listAllMapped();
  const active = invoices.filter((i) => i.status !== 'void');
  const billed = active.reduce((s, i) => s + i.amount, 0);
  const collected = active.reduce((s, i) => s + i.paid, 0);
  const outstanding = active.reduce((s, i) => s + i.balance, 0);
  res.json({
    billed,
    collected,
    outstanding,
    count: active.length,
    unpaidCount: active.filter((i) => i.payStatus === 'unpaid' || i.payStatus === 'partial').length,
  });
});

async function listAllMapped() {
  if (!hasDatabase()) {
    return demoState.invoices.map((i) => mapInvoice(i, patientName(i.patient_id)));
  }
  /* Single query: fetch all invoices + all their payments in one JOIN.
     Rows are denormalized (one row per payment), so we group by invoice id. */
  const rows = await sql`
    SELECT
      i.*,
      p.name  AS patient_name,
      pay.id  AS pay_id,
      pay.amount AS pay_amount,
      pay.paid_on AS pay_paid_on,
      pay.method  AS pay_method
    FROM invoices i
    JOIN patients p ON p.id = i.patient_id
    LEFT JOIN invoice_payments pay ON pay.invoice_id = i.id
    ORDER BY i.invoice_date DESC, i.created_at DESC, pay.paid_on
  `;
  /* Group payment rows back into their parent invoice */
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, { ...row, payments: [] });
    }
    if (row.pay_id) {
      map.get(row.id).payments.push({
        id: row.pay_id,
        amount: row.pay_amount,
        paid_on: row.pay_paid_on,
        method: row.pay_method,
      });
    }
  }
  return Array.from(map.values()).map((row) => mapInvoice(row, row.patient_name));
}

router.get('/invoices', async (req, res) => {
  const status = (req.query.status || 'all').toLowerCase();
  const patientId = req.query.patientId || '';
  const q = (req.query.q || '').trim().toLowerCase();

  let rows = await listAllMapped();
  if (patientId) rows = rows.filter((i) => i.patientId === patientId);
  if (status === 'void') rows = rows.filter((i) => i.status === 'void' || i.payStatus === 'void');
  else if (status !== 'all') {
    rows = rows.filter((i) => i.status !== 'void' && i.payStatus === status);
  }
  // status=all → include void so clients can filter; UI hides void by default
  if (q) {
    rows = rows.filter(
      (i) =>
        i.patient.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.number || '').toLowerCase().includes(q),
    );
  }
  res.json(rows);
});

router.get('/invoices/:id', async (req, res) => {
  if (!hasDatabase()) {
    const row = demoState.invoices.find((i) => i.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    return res.json(mapInvoice(row, patientName(row.patient_id)));
  }
  const [row] = await sql`
    SELECT i.*, p.name AS patient_name FROM invoices i
    JOIN patients p ON p.id = i.patient_id WHERE i.id = ${req.params.id}
  `;
  if (!row) return res.status(404).json({ error: 'Invoice not found' });
  const payments = await sql`SELECT * FROM invoice_payments WHERE invoice_id = ${row.id} ORDER BY paid_on`;
  res.json(mapInvoice({ ...row, payments }, row.patient_name));
});

router.post('/invoices', async (req, res) => {
  const schema = z.object({
    patientId: z.string().uuid(),
    date: z.string().min(1),
    description: z.string().min(1),
    amount: z.coerce.number().min(0),
    cptCode: z.string().optional().default(''),
    notes: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid invoice', details: parsed.error.flatten() });
  const d = parsed.data;

  if (!hasDatabase()) {
    const patient = demoState.patients.find((p) => p.id === d.patientId);
    if (!patient) return res.status(400).json({ error: 'Client not found' });
    const row = {
      id: newId(),
      patient_id: d.patientId,
      invoice_number: nextInvoiceNumber(),
      invoice_date: d.date,
      description: d.description,
      cpt_code: d.cptCode,
      amount: d.amount,
      notes: d.notes,
      status: 'open',
      created_at: new Date().toISOString(),
      payments: [],
    };
    demoState.invoices.unshift(row);
    return res.status(201).json(mapInvoice(row, patient.name));
  }

  const number = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const [row] = await sql`
    INSERT INTO invoices (patient_id, invoice_date, description, amount, invoice_number, notes, cpt_code, status)
    VALUES (${d.patientId}, ${d.date}, ${d.description}, ${d.amount}, ${number}, ${d.notes}, ${d.cptCode}, 'open')
    RETURNING *
  `;
  const [patient] = await sql`SELECT name FROM patients WHERE id = ${d.patientId}`;
  res.status(201).json(mapInvoice({ ...row, payments: [] }, patient?.name));
});

router.patch('/invoices/:id', async (req, res) => {
  const schema = z.object({
    patientId: z.string().uuid().optional(),
    date: z.string().optional(),
    description: z.string().min(1).optional(),
    amount: z.coerce.number().min(0).optional(),
    cptCode: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['open', 'void']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update' });
  const d = parsed.data;

  if (!hasDatabase()) {
    const idx = demoState.invoices.findIndex((i) => i.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Invoice not found' });
    const cur = demoState.invoices[idx];
    const next = {
      ...cur,
      ...(d.patientId != null ? { patient_id: d.patientId } : {}),
      ...(d.date != null ? { invoice_date: d.date } : {}),
      ...(d.description != null ? { description: d.description } : {}),
      ...(d.amount != null ? { amount: d.amount } : {}),
      ...(d.cptCode != null ? { cpt_code: d.cptCode } : {}),
      ...(d.notes != null ? { notes: d.notes } : {}),
      ...(d.status != null ? { status: d.status } : {}),
    };
    demoState.invoices[idx] = next;
    return res.json(mapInvoice(next, patientName(next.patient_id)));
  }

  const [cur] = await sql`SELECT * FROM invoices WHERE id = ${req.params.id}`;
  if (!cur) return res.status(404).json({ error: 'Invoice not found' });
  const [row] = await sql`
    UPDATE invoices SET
      patient_id = ${d.patientId ?? cur.patient_id},
      invoice_date = ${d.date ?? cur.invoice_date},
      description = ${d.description ?? cur.description},
      amount = ${d.amount ?? cur.amount},
      cpt_code = ${d.cptCode ?? cur.cpt_code},
      notes = ${d.notes ?? cur.notes},
      status = ${d.status ?? cur.status}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  const payments = await sql`SELECT * FROM invoice_payments WHERE invoice_id = ${row.id}`;
  const [patient] = await sql`SELECT name FROM patients WHERE id = ${row.patient_id}`;
  res.json(mapInvoice({ ...row, payments }, patient?.name));
});

router.delete('/invoices/:id', async (req, res) => {
  if (!hasDatabase()) {
    const idx = demoState.invoices.findIndex((i) => i.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Invoice not found' });
    demoState.invoices.splice(idx, 1);
    return res.json({ ok: true });
  }
  await sql`DELETE FROM invoices WHERE id = ${req.params.id}`;
  res.json({ ok: true });
});

router.post('/invoices/:id/payments', async (req, res) => {
  const schema = z.object({
    amount: z.coerce.number().positive(),
    date: z.string().min(1),
    method: z.string().optional().default('Card'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payment' });
  const d = parsed.data;

  if (!hasDatabase()) {
    const inv = demoState.invoices.find((i) => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status === 'void') return res.status(400).json({ error: 'Cannot pay a voided invoice' });
    const mapped = mapInvoice(inv, patientName(inv.patient_id));
    if (mapped.balance <= 0) return res.status(400).json({ error: 'Invoice is already paid' });
    const amount = Math.min(d.amount, mapped.balance);
    inv.payments = inv.payments || [];
    inv.payments.push({ id: newId(), amount, paid_on: d.date, method: d.method });
    return res.status(201).json(mapInvoice(inv, patientName(inv.patient_id)));
  }

  const [cur] = await sql`SELECT * FROM invoices WHERE id = ${req.params.id}`;
  if (!cur) return res.status(404).json({ error: 'Invoice not found' });
  if (cur.status === 'void') return res.status(400).json({ error: 'Cannot pay a voided invoice' });
  const payments = await sql`SELECT * FROM invoice_payments WHERE invoice_id = ${cur.id}`;
  const mapped = mapInvoice({ ...cur, payments }, '');
  if (mapped.balance <= 0) return res.status(400).json({ error: 'Invoice is already paid' });
  const amount = Math.min(d.amount, mapped.balance);
  await sql`
    INSERT INTO invoice_payments (invoice_id, amount, paid_on, method)
    VALUES (${cur.id}, ${amount}, ${d.date}, ${d.method})
  `;
  const nextPays = await sql`SELECT * FROM invoice_payments WHERE invoice_id = ${cur.id} ORDER BY paid_on`;
  const [patient] = await sql`SELECT name FROM patients WHERE id = ${cur.patient_id}`;
  res.status(201).json(mapInvoice({ ...cur, payments: nextPays }, patient?.name));
});

router.post('/invoices/:id/void', async (req, res) => {
  req.body = { status: 'void' };
  // reuse patch logic via internal call style
  if (!hasDatabase()) {
    const idx = demoState.invoices.findIndex((i) => i.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Invoice not found' });
    demoState.invoices[idx] = { ...demoState.invoices[idx], status: 'void' };
    return res.json(mapInvoice(demoState.invoices[idx], patientName(demoState.invoices[idx].patient_id)));
  }
  const [row] = await sql`UPDATE invoices SET status = 'void' WHERE id = ${req.params.id} RETURNING *`;
  if (!row) return res.status(404).json({ error: 'Invoice not found' });
  const payments = await sql`SELECT * FROM invoice_payments WHERE invoice_id = ${row.id}`;
  const [patient] = await sql`SELECT name FROM patients WHERE id = ${row.patient_id}`;
  res.json(mapInvoice({ ...row, payments }, patient?.name));
});

// silence unused import if tree-shaken
void DEMO_IDS;

export default router;
