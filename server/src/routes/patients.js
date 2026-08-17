import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState, newId } from '../demo.js';

const router = Router();

router.use(authRequired, requireStaff);

async function ensurePatientColumns() {
  if (!hasDatabase()) return;
  try {
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT ''`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT DEFAULT ''`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS state TEXT DEFAULT ''`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_type TEXT DEFAULT 'Individual Therapy'`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS therapist TEXT DEFAULT 'Dr. Sarah Williams'`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS visit_pref TEXT DEFAULT 'Virtual'`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'Weekly'`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_concern TEXT DEFAULT ''`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_comm TEXT DEFAULT 'Email'`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS client_code TEXT DEFAULT ''`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_phone TEXT DEFAULT ''`;
  } catch { /* ignore */ }
}

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();

  if (!hasDatabase()) {
    let rows = [...demoState.patients];
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(q) ||
          (p.client_code || '').toLowerCase().includes(q),
      );
    }
    return res.json(rows);
  }

  await ensurePatientColumns();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = await sql`
      SELECT * FROM patients
      WHERE lower(name) LIKE ${like} OR lower(coalesce(email,'')) LIKE ${like} OR coalesce(phone,'') LIKE ${like}
      ORDER BY name
    `;
  } else {
    rows = await sql`SELECT * FROM patients ORDER BY name`;
  }
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  if (!hasDatabase()) {
    const patient = demoState.patients.find((p) => p.id === req.params.id);
    if (!patient) return res.status(404).json({ error: 'Not found' });
    const appointments = demoState.appointments.filter((a) => a.patient_id === patient.id);
    return res.json({ ...patient, records: [], appointments });
  }
  await ensurePatientColumns();
  const [patient] = await sql`SELECT * FROM patients WHERE id = ${req.params.id}`;
  if (!patient) return res.status(404).json({ error: 'Not found' });
  const records = await sql`SELECT * FROM clinical_records WHERE patient_id = ${patient.id} ORDER BY record_date DESC`;
  const appointments = await sql`SELECT * FROM appointments WHERE patient_id = ${patient.id} ORDER BY appt_date DESC, appt_time DESC`;
  res.json({ ...patient, records, appointments });
});

const patientBody = z.object({
  name: z.string().min(2, 'First and last name are required'),
  email: z.string().email('A valid email is required to send Zoom visit links'),
  phone: z.string().min(7, 'Phone is required'),
  dob: z.string().min(8, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  address: z.string().optional().default(''),
  insurance: z.string().optional().default(''),
  emergency: z.string().min(2, 'Emergency contact name is required'),
  emergencyPhone: z.string().min(7, 'Emergency contact phone is required'),
  notes: z.string().optional().default(''),
  payerType: z.enum(['self-pay', 'insurance', 'other']).default('self-pay'),
  status: z.enum(['new', 'active', 'inactive']).optional().default('new'),
  careType: z.string().min(1, 'Primary service is required'),
  therapist: z.string().min(1, 'Assigned therapist is required'),
  visitPref: z.enum(['Virtual', 'In-person', 'Either']).default('Virtual'),
  frequency: z.string().optional().default('Weekly'),
  primaryConcern: z.string().min(2, 'Primary concern is required'),
  preferredComm: z.enum(['Email', 'Phone', 'SMS']).default('Email'),
}).superRefine((d, ctx) => {
  if (d.payerType === 'insurance' && !String(d.insurance || '').trim()) {
    ctx.addIssue({ code: 'custom', message: 'Insurance plan is required for insurance payers', path: ['insurance'] });
  }
});

router.post('/', async (req, res) => {
  const parsed = patientBody.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return res.status(400).json({ error: first?.message || 'Complete all required client fields' });
  }
  const d = parsed.data;
  await ensurePatientColumns();

  if (!hasDatabase()) {
    const dup = demoState.patients.find(
      (p) =>
        (d.email && p.email && p.email.toLowerCase() === d.email.toLowerCase()) ||
        (d.phone && p.phone && p.phone.replace(/\D/g, '') === d.phone.replace(/\D/g, '') && d.phone.replace(/\D/g, '').length >= 7),
    );
    if (dup) {
      return res.status(409).json({
        error: 'A client with similar contact details already exists',
        existingId: dup.id,
        existingName: dup.name,
      });
    }
    const codeNum = 1024 + demoState.patients.length;
    const row = {
      id: newId(),
      name: d.name,
      email: d.email || null,
      phone: d.phone,
      dob: d.dob || null,
      gender: d.gender,
      city: d.city,
      state: d.state,
      address: d.address,
      insurance: d.insurance,
      emergency: d.emergency,
      emergency_phone: d.emergencyPhone,
      notes: d.notes,
      payer_type: d.payerType,
      status: d.status,
      care_type: d.careType,
      therapist: d.therapist,
      visit_pref: d.visitPref,
      frequency: d.frequency,
      primary_concern: d.primaryConcern,
      preferred_comm: d.preferredComm,
      care_started: new Date().toISOString().slice(0, 10),
      client_code: `CL-${codeNum}`,
      created_at: new Date().toISOString(),
    };
    demoState.patients.push(row);
    return res.status(201).json(row);
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM patients`;
  const clientCode = `CL-${1024 + Number(count || 0)}`;
  const [row] = await sql`
    INSERT INTO patients (
      name, email, phone, dob, gender, city, state, address, insurance, emergency, emergency_phone,
      notes, payer_type, status, care_type, therapist, visit_pref, frequency, primary_concern,
      preferred_comm, client_code
    )
    VALUES (
      ${d.name}, ${d.email}, ${d.phone}, ${d.dob}, ${d.gender}, ${d.city}, ${d.state}, ${d.address || ''},
      ${d.insurance}, ${d.emergency}, ${d.emergencyPhone}, ${d.notes}, ${d.payerType}, ${d.status},
      ${d.careType}, ${d.therapist}, ${d.visitPref}, ${d.frequency}, ${d.primaryConcern},
      ${d.preferredComm}, ${clientCode}
    )
    RETURNING *
  `;
  res.status(201).json(row);
});

router.patch('/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['new', 'active', 'inactive']).optional(),
    notes: z.string().optional(),
    therapist: z.string().optional(),
    careType: z.string().optional(),
    visitPref: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')).optional(),
    emergency: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update' });
  const d = parsed.data;

  if (!hasDatabase()) {
    const idx = demoState.patients.findIndex((p) => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const cur = demoState.patients[idx];
    const next = {
      ...cur,
      ...(d.status != null ? { status: d.status } : {}),
      ...(d.notes != null ? { notes: d.notes } : {}),
      ...(d.therapist != null ? { therapist: d.therapist } : {}),
      ...(d.careType != null ? { care_type: d.careType } : {}),
      ...(d.visitPref != null ? { visit_pref: d.visitPref } : {}),
      ...(d.phone != null ? { phone: d.phone } : {}),
      ...(d.email != null ? { email: d.email || null } : {}),
      ...(d.emergency != null ? { emergency: d.emergency } : {}),
      updated_at: new Date().toISOString(),
    };
    demoState.patients[idx] = next;
    return res.json(next);
  }

  return res.status(501).json({ error: 'Patient updates require demo mode or schema migration' });
});

router.post('/:id/records', async (req, res) => {
  if (!hasDatabase()) {
    return res.status(201).json({
      id: newId(),
      patient_id: req.params.id,
      record_date: new Date().toISOString().slice(0, 10),
      symptoms: req.body.symptoms || '',
      diagnosis: req.body.diagnosis || '',
      notes: req.body.notes || '',
    });
  }
  const schema = z.object({
    recordDate: z.string().optional(),
    symptoms: z.string().optional().default(''),
    diagnosis: z.string().optional().default(''),
    notes: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid record' });
  const d = parsed.data;
  const [row] = await sql`
    INSERT INTO clinical_records (patient_id, record_date, symptoms, diagnosis, notes)
    VALUES (${req.params.id}, ${d.recordDate || new Date().toISOString().slice(0, 10)}, ${d.symptoms}, ${d.diagnosis}, ${d.notes})
    RETURNING *
  `;
  res.status(201).json(row);
});

export default router;
