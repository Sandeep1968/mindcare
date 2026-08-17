import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState, newId } from '../demo.js';
import { notifyAppointmentBooked } from '../lib/notifyAppointment.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';

const router = Router();
router.use(authRequired, requireStaff);

const STATUSES = ['confirmed', 'declined', 'pending', 'completed', 'cancelled', 'no-show'];

function mapAppt(a, patientName) {
  const date = toDateIso(a.appt_date);
  const link = a.video_link || '';
  return {
    id: a.id,
    patientId: a.patient_id,
    patientName,
    date,
    time: toTimeHm(a.appt_time),
    duration: a.duration_min || 50,
    type: a.session_type,
    reason: a.reason || '',
    location: a.location || '',
    link,
    checkedIn: Boolean(a.checked_in),
    status: a.status || 'confirmed',
    therapist: a.therapist || 'Dr. Sarah Williams',
    source: a.source || 'clinic',
    adminNote: a.admin_note || '',
    cancelReason: a.cancel_reason || '',
  };
}

function toMinutes(t) {
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function overlaps(aStart, aDur, bStart, bDur) {
  const a0 = toMinutes(aStart);
  const a1 = a0 + (aDur || 50);
  const b0 = toMinutes(bStart);
  const b1 = b0 + (bDur || 50);
  return a0 < b1 && b0 < a1;
}

function allMapped() {
  return demoState.appointments.map((a) => {
    const p = demoState.patients.find((x) => x.id === a.patient_id);
    return mapAppt(a, p?.name || 'Patient');
  });
}

function applyFilters(rows, { date, kind, status, filter, q }) {
  const today = toDateIso(new Date());
  let out = [...rows];
  if (date) out = out.filter((a) => a.date === date);
  else if (filter === 'today') out = out.filter((a) => a.date === today);
  else if (filter === 'past') out = out.filter((a) => a.date < today);
  else if (filter === 'upcoming') out = out.filter((a) => a.date >= today);
  else if (filter === 'week') {
    const start = new Date();
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const s = toIsoLocal(start);
    const e = toIsoLocal(end);
    out = out.filter((a) => a.date >= s && a.date <= e);
  }
  if (kind === 'video' || kind === 'in-person') out = out.filter((a) => a.type === kind);
  if (status && status !== 'all') out = out.filter((a) => a.status === status);
  if (q) {
    const qq = q.toLowerCase();
    out = out.filter((a) =>
      a.patientName.toLowerCase().includes(qq)
      || (a.reason || '').toLowerCase().includes(qq)
      || (a.therapist || '').toLowerCase().includes(qq)
      || a.id.toLowerCase().includes(qq));
  }
  return out.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function toIsoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function findConflicts({ date, time, duration = 50, excludeId, therapist }) {
  return allMapped().filter((a) => {
    if (a.id === excludeId) return false;
    if (a.date !== date) return false;
    if (['cancelled', 'declined', 'no-show'].includes(a.status)) return false;
    if (therapist && a.therapist && a.therapist !== therapist) return false;
    return overlaps(time, duration, a.time, a.duration);
  });
}

router.get('/conflicts', async (req, res) => {
  const date = req.query.date;
  const time = req.query.time;
  const duration = Number(req.query.duration || 50);
  const excludeId = req.query.excludeId || '';
  const therapist = req.query.therapist || '';
  if (!date || !time) return res.status(400).json({ error: 'date and time required' });
  if (!hasDatabase()) {
    const conflicts = findConflicts({ date, time, duration, excludeId, therapist });
    return res.json({ conflicts, available: conflicts.length === 0 });
  }
  const rows = await sql`
    SELECT a.*, p.name AS patient_name
    FROM appointments a JOIN patients p ON p.id = a.patient_id
    WHERE a.appt_date = ${date}
  `;
  const mapped = rows.map((a) => mapAppt({ ...a, status: a.status || 'confirmed' }, a.patient_name));
  const conflicts = mapped.filter((a) => {
    if (a.id === excludeId) return false;
    return overlaps(time, duration, a.time, a.duration);
  });
  res.json({ conflicts, available: conflicts.length === 0 });
});

router.get('/', async (req, res) => {
  const filter = req.query.filter || 'all';
  const date = req.query.date || '';
  const kind = req.query.kind || 'all';
  const status = req.query.status || 'all';
  const q = (req.query.q || '').trim();

  if (!hasDatabase()) {
    return res.json(applyFilters(allMapped(), { date, kind, status, filter, q }));
  }

  let rows;
  if (date) {
    rows = await sql`
      SELECT a.*, p.name AS patient_name FROM appointments a
      JOIN patients p ON p.id = a.patient_id WHERE a.appt_date = ${date} ORDER BY a.appt_time`;
  } else {
    rows = await sql`
      SELECT a.*, p.name AS patient_name FROM appointments a
      JOIN patients p ON p.id = a.patient_id ORDER BY a.appt_date DESC, a.appt_time DESC`;
  }
  const mapped = rows.map((a) => mapAppt({ ...a, status: a.status || 'confirmed' }, a.patient_name));
  res.json(applyFilters(mapped, { date: '', kind, status, filter: date ? 'all' : filter, q }));
});

router.post('/', async (req, res) => {
  const schema = z.object({
    patientId: z.string().uuid().optional(),
    patientName: z.string().min(1).optional(),
    patientEmail: z.string().email().optional().or(z.literal('')),
    date: z.string().min(1),
    time: z.string().min(1),
    duration: z.number().optional().default(50),
    type: z.enum(['video', 'in-person']).default('video'),
    reason: z.string().optional().default(''),
    location: z.string().optional().default(''),
    link: z.string().optional().default(''),
    status: z.enum(STATUSES).optional().default('confirmed'),
    therapist: z.string().optional().default('Dr. Sarah Williams'),
    source: z.string().optional().default('clinic'),
    adminNote: z.string().optional().default(''),
    force: z.boolean().optional().default(false),
  }).refine((d) => d.patientId || d.patientName, { message: 'Patient required' })
    .refine((d) => d.patientId || Boolean(d.patientEmail), { message: 'Client email is required to send the Zoom link' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid appointment', details: parsed.error.flatten() });
  const d = parsed.data;

  if (!hasDatabase()) {
    const conflicts = findConflicts({ date: d.date, time: d.time, duration: d.duration, therapist: d.therapist });
    if (conflicts.length && !d.force) {
      return res.status(409).json({
        error: 'Scheduling conflict',
        conflicts,
        message: `Conflict with ${conflicts[0].patientName} at ${conflicts[0].time}`,
      });
    }

    let patientId = d.patientId;
    if (!patientId) {
      const existing = demoState.patients.find((p) => p.name.toLowerCase() === d.patientName.toLowerCase());
      if (existing) patientId = existing.id;
      else {
        patientId = newId();
        demoState.patients.push({
          id: patientId, name: d.patientName, email: d.patientEmail || '', phone: '', dob: null,
          insurance: '', emergency: '', notes: '', payer_type: 'self-pay', created_at: new Date().toISOString(),
        });
      }
    } else if (d.patientEmail) {
      const existing = demoState.patients.find((p) => p.id === patientId);
      if (existing && !existing.email) existing.email = d.patientEmail;
    }

    const row = {
      id: newId(),
      patient_id: patientId,
      appt_date: d.date,
      appt_time: d.time,
      duration_min: d.duration,
      session_type: d.type,
      reason: d.reason,
      location: d.location || (d.type === 'in-person' ? 'Clinic' : ''),
      video_link: d.link || '',
      checked_in: false,
      status: d.status,
      therapist: d.therapist,
      source: d.source,
      admin_note: d.adminNote,
      cancel_reason: '',
    };
    demoState.appointments.push(row);
    const p = demoState.patients.find((x) => x.id === patientId);
    const mapped = mapAppt(row, p?.name || d.patientName);
    const notify = await notifyAppointmentBooked({ appointment: row, patient: p });
    return res.status(201).json({ ...mapped, notify });
  }

  let patientId = d.patientId;
  if (!patientId) {
    const [created] = await sql`
      INSERT INTO patients (name, email, phone, notes, payer_type)
      VALUES (${d.patientName}, ${d.patientEmail || null}, '', '', 'self-pay') RETURNING id`;
    patientId = created.id;
  }
  const [row] = await sql`
    INSERT INTO appointments (patient_id, appt_date, appt_time, duration_min, session_type, reason, location, video_link)
    VALUES (${patientId}, ${d.date}, ${d.time}, ${d.duration}, ${d.type}, ${d.reason},
      ${d.location || (d.type === 'in-person' ? 'Clinic' : '')}, ${d.link || ''})
    RETURNING *`;
  const [patient] = await sql`SELECT * FROM patients WHERE id = ${patientId}`;
  const mapped = mapAppt({ ...row, status: 'confirmed', therapist: d.therapist, source: d.source }, patient.name);
  const notify = await notifyAppointmentBooked({
    appointment: { ...row, therapist: d.therapist, session_type: d.type },
    patient,
  });
  res.status(201).json({ ...mapped, notify });
});

router.patch('/:id', async (req, res) => {
  if (!hasDatabase()) {
    const row = demoState.appointments.find((a) => a.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const body = req.body || {};
    if (body.date) row.appt_date = body.date;
    if (body.time) row.appt_time = body.time;
    if (body.type) row.session_type = body.type;
    if (body.reason != null) row.reason = body.reason;
    if (body.location != null) row.location = body.location;
    if (body.link != null) row.video_link = body.link;
    if (body.adminNote != null) row.admin_note = body.adminNote;
    if (body.status && STATUSES.includes(body.status)) row.status = body.status;
    if (body.cancelReason != null) row.cancel_reason = body.cancelReason;
    if (body.force !== true && body.date && body.time) {
      const conflicts = findConflicts({
        date: row.appt_date, time: row.appt_time, duration: row.duration_min, excludeId: row.id,
      });
      if (conflicts.length) {
        return res.status(409).json({ error: 'Scheduling conflict', conflicts, message: `Conflict with ${conflicts[0].patientName} at ${conflicts[0].time}` });
      }
    }
    const p = demoState.patients.find((x) => x.id === row.patient_id);
    const mapped = mapAppt(row, p?.name || 'Patient');
    let notify = null;
    if (body.date || body.time) {
      notify = await notifyAppointmentBooked({ appointment: row, patient: p, event: 'rescheduled' });
    }
    return res.json({ ...mapped, notify });
  }
  res.status(501).json({ error: 'Patch appointments requires demo mode or schema migration' });
});

router.patch('/:id/check-in', async (req, res) => {
  if (!hasDatabase()) {
    const row = demoState.appointments.find((a) => a.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    row.checked_in = !row.checked_in;
    return res.json(row);
  }
  const [row] = await sql`UPDATE appointments SET checked_in = NOT checked_in WHERE id = ${req.params.id} RETURNING *`;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.patch('/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (!hasDatabase()) {
    const row = demoState.appointments.find((a) => a.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    row.status = status;
    if (req.body?.cancelReason) row.cancel_reason = req.body.cancelReason;
    if (req.body?.adminNote) row.admin_note = req.body.adminNote;
    const p = demoState.patients.find((x) => x.id === row.patient_id);
    return res.json(mapAppt(row, p?.name || 'Patient'));
  }
  const [row] = await sql`SELECT a.*, p.name AS patient_name FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.id = ${req.params.id}`;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(mapAppt({ ...row, status }, row.patient_name));
});

export default router;
