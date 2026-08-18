import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState, DEMO_USERS, newId } from '../demo.js';

const router = Router();
router.use(authRequired, requireStaff);

const DEFAULT_SETTINGS = {
  clinic_name: 'MindCare Practice',
  phone: '(555) 010-2040',
  email: 'hello@mindcare.example',
  address: '1200 Calm Avenue, Suite 200',
  session_minutes: 50,
  video_provider: 'zoom',
  waiting_message: 'Your therapist will admit you shortly. Find a quiet, private space and use headphones if you can.',
};

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    patientId: u.patient_id || null,
  };
}

router.get('/', async (_req, res) => {
  if (!hasDatabase()) {
    return res.json({ ...DEFAULT_SETTINGS, ...(demoState.settings || {}) });
  }
  return res.json(DEFAULT_SETTINGS);
});

router.patch('/', async (req, res) => {
  const schema = z.object({
    clinic_name: z.string().min(2).optional(),
    phone: z.string().min(4).optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    session_minutes: z.coerce.number().min(30).max(120).optional(),
    video_provider: z.string().optional(),
    waiting_message: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid settings payload' });
  if (!hasDatabase()) {
    demoState.settings = { ...demoState.settings, ...parsed.data };
    return res.json(demoState.settings);
  }
  // DB mode can store this in a dedicated table later.
  return res.json({ ...DEFAULT_SETTINGS, ...parsed.data });
});

router.get('/users', async (_req, res) => {
  if (!hasDatabase()) {
    return res.json(DEMO_USERS.filter((u) => u.role !== 'patient').map(publicUser));
  }
  const rows = await sql`SELECT id, name, email, role, patient_id FROM users WHERE role IN ('admin','practitioner','staff') ORDER BY role, name`;
  res.json(rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, patientId: u.patient_id || null })));
});

router.post('/users', async (req, res) => {
  const emptyToUndef = (v) => (v === '' || v == null ? undefined : v);
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['admin', 'practitioner', 'staff']),
    password: z.preprocess(emptyToUndef, z.string().min(6).optional()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid user payload' });
  const d = parsed.data;
  const pass = d.password || 'mindcare123';
  const hash = await bcrypt.hash(pass, 10);
  if (!hasDatabase()) {
    const exists = DEMO_USERS.find((u) => u.email.toLowerCase() === d.email.toLowerCase());
    if (exists) return res.status(409).json({ error: 'User already exists' });
    const user = {
      id: newId(),
      name: d.name.trim(),
      email: d.email.toLowerCase(),
      role: d.role,
      password_hash: hash,
      patient_id: null,
    };
    DEMO_USERS.push(user);
    return res.status(201).json({ user: publicUser(user), temporaryPassword: pass });
  }
  const [exists] = await sql`SELECT id FROM users WHERE lower(email)=${d.email.toLowerCase()}`;
  if (exists) return res.status(409).json({ error: 'User already exists' });
  const [row] = await sql`
    INSERT INTO users (name, email, role, password_hash)
    VALUES (${d.name.trim()}, ${d.email.toLowerCase()}, ${d.role}, ${hash})
    RETURNING id, name, email, role, patient_id
  `;
  res.status(201).json({ user: { id: row.id, name: row.name, email: row.email, role: row.role, patientId: row.patient_id || null }, temporaryPassword: pass });
});

router.post('/users/:id/reset-password', async (req, res) => {
  const emptyToUndef = (v) => (v === '' || v == null ? undefined : v);
  const schema = z.object({ password: z.preprocess(emptyToUndef, z.string().min(6).optional()) });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid password' });
  const tempPassword = parsed.data.password || 'mindcare123';
  const hash = await bcrypt.hash(tempPassword, 10);
  if (!hasDatabase()) {
    const idx = DEMO_USERS.findIndex((u) => u.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'User not found' });
    DEMO_USERS[idx] = { ...DEMO_USERS[idx], password_hash: hash };
    return res.json({ ok: true, temporaryPassword: tempPassword });
  }
  const [row] = await sql`UPDATE users SET password_hash=${hash} WHERE id=${req.params.id} RETURNING id`;
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ ok: true, temporaryPassword: tempPassword });
});

router.get('/export', async (_req, res) => {
  if (!hasDatabase()) {
    return res.json({
      exportedAt: new Date().toISOString(),
      mode: 'demo',
      users: DEMO_USERS.map(publicUser),
      patients: demoState.patients,
      appointments: demoState.appointments,
      invoices: demoState.invoices,
      requests: demoState.requests,
      settings: demoState.settings,
    });
  }
  const [users, patients, appointments, invoices] = await Promise.all([
    sql`SELECT id, name, email, role, patient_id FROM users ORDER BY role, name`,
    sql`SELECT * FROM patients ORDER BY name`,
    sql`SELECT * FROM appointments ORDER BY appt_date DESC, appt_time DESC`,
    sql`SELECT * FROM invoices ORDER BY invoice_date DESC`,
  ]);
  return res.json({
    exportedAt: new Date().toISOString(),
    mode: 'database',
    users,
    patients,
    appointments,
    invoices,
  });
});

router.post('/restore', async (req, res) => {
  const payload = req.body || {};
  if (hasDatabase()) {
    return res.status(501).json({ error: 'Restore currently supported in demo mode only.' });
  }
  if (Array.isArray(payload.patients)) demoState.patients = payload.patients;
  if (Array.isArray(payload.appointments)) demoState.appointments = payload.appointments;
  if (Array.isArray(payload.invoices)) demoState.invoices = payload.invoices;
  if (Array.isArray(payload.requests)) demoState.requests = payload.requests;
  if (payload.settings && typeof payload.settings === 'object') demoState.settings = payload.settings;
  return res.json({ ok: true });
});

router.delete('/data', async (_req, res) => {
  if (hasDatabase()) {
    return res.status(501).json({ error: 'Erase-all is supported in demo mode only.' });
  }
  demoState.patients = [];
  demoState.appointments = [];
  demoState.requests = [];
  demoState.invoices = [];
  demoState.bugReports = [];
  return res.json({ ok: true });
});

export default router;
