import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState, newId } from '../demo.js';
import { notifyAppointmentBooked } from '../lib/notifyAppointment.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';

const router = Router();

function defaultTherapist(r) {
  return r.preferred_therapist || 'Dr. Sarah Williams';
}

function mapRequest(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    email: r.email,
    phone: r.phone,
    payerType: r.payer_type,
    preferredDate: toDateIso(r.preferred_date),
    preferredTime: toTimeHm(r.preferred_time),
    service: r.service,
    sessionType: r.session_type,
    sessionPref: r.session_pref,
    notes: r.notes,
    matchAudience: r.match_audience,
    therapistPref: r.therapist_pref,
    slidingScale: r.sliding_scale,
    preferredTherapist: r.preferred_therapist,
    matchCompleted: r.match_completed,
    crisis: r.crisis,
    match: r.match_json,
    assessment: r.assessment_json,
    status: r.status,
    patientId: r.patient_id,
    appointmentId: r.appointment_id,
  };
}

/** Public: submit booking from website */
router.post('/', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().default(''),
    payerType: z.string().optional().default('self-pay'),
    preferredDate: z.string().min(1),
    preferredTime: z.string().min(1),
    service: z.string().optional().default('General / Not sure yet'),
    sessionType: z.enum(['video', 'in-person']).default('video'),
    sessionPref: z.string().optional().default('video'),
    notes: z.string().optional().default(''),
    matchAudience: z.string().optional().default('individual'),
    therapistPref: z.string().optional().default('any'),
    slidingScale: z.boolean().optional().default(false),
    preferredTherapist: z.string().optional().default(''),
    matchCompleted: z.boolean().optional().default(false),
    crisis: z.string().optional().default('no'),
    match: z.any().optional().nullable(),
    assessment: z.any().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid booking data', details: parsed.error.flatten() });

  const d = parsed.data;

  if (!hasDatabase()) {
    const row = {
      id: newId(),
      created_at: new Date().toISOString(),
      name: d.name,
      email: d.email.toLowerCase(),
      phone: d.phone,
      payer_type: d.payerType,
      preferred_date: d.preferredDate,
      preferred_time: d.preferredTime,
      service: d.service,
      session_type: d.sessionType,
      session_pref: d.sessionPref,
      notes: d.notes,
      match_audience: d.matchAudience,
      therapist_pref: d.therapistPref,
      sliding_scale: d.slidingScale,
      preferred_therapist: d.preferredTherapist,
      match_completed: d.matchCompleted,
      crisis: d.crisis,
      match_json: d.match || null,
      assessment_json: d.assessment || null,
      status: 'new',
      patient_id: null,
      appointment_id: null,
    };
    demoState.requests.unshift(row);
    return res.status(201).json(mapRequest(row));
  }

  const [row] = await sql`
    INSERT INTO appointment_requests (
      name, email, phone, payer_type, preferred_date, preferred_time, service,
      session_type, session_pref, notes, match_audience, therapist_pref,
      sliding_scale, preferred_therapist, match_completed, crisis, match_json, assessment_json, status
    ) VALUES (
      ${d.name}, ${d.email.toLowerCase()}, ${d.phone}, ${d.payerType},
      ${d.preferredDate}, ${d.preferredTime}, ${d.service},
      ${d.sessionType}, ${d.sessionPref}, ${d.notes}, ${d.matchAudience}, ${d.therapistPref},
      ${d.slidingScale}, ${d.preferredTherapist}, ${d.matchCompleted}, ${d.crisis},
      ${d.match ? JSON.stringify(d.match) : null}::jsonb,
      ${d.assessment ? JSON.stringify(d.assessment) : null}::jsonb,
      'new'
    )
    RETURNING *
  `;
  res.status(201).json(mapRequest(row));
});

/** Staff: list website bookings */
router.get('/', authRequired, requireStaff, async (req, res) => {
  const status = req.query.status || 'all';
  const kind = req.query.kind || 'all';

  if (!hasDatabase()) {
    let rows = [...demoState.requests];
    if (status !== 'all') rows = rows.filter((r) => r.status === status);
    if (kind === 'video') rows = rows.filter((r) => r.session_type === 'video');
    if (kind === 'in-person') rows = rows.filter((r) => r.session_type === 'in-person');
    return res.json(rows.map(mapRequest));
  }

  let rows;
  if (status === 'all') {
    rows = await sql`SELECT * FROM appointment_requests ORDER BY created_at DESC`;
  } else {
    rows = await sql`SELECT * FROM appointment_requests WHERE status = ${status} ORDER BY created_at DESC`;
  }
  if (kind === 'video') rows = rows.filter((r) => r.session_type === 'video');
  if (kind === 'in-person') rows = rows.filter((r) => r.session_type === 'in-person');
  res.json(rows.map(mapRequest));
});

router.get('/:id', authRequired, requireStaff, async (req, res) => {
  if (!hasDatabase()) {
    const row = demoState.requests.find((r) => r.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(mapRequest(row));
  }
  const [row] = await sql`SELECT * FROM appointment_requests WHERE id = ${req.params.id}`;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(mapRequest(row));
});

router.post('/:id/confirm', authRequired, requireStaff, async (req, res) => {
  if (!hasDatabase()) {
    const r = demoState.requests.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.status !== 'new') return res.status(400).json({ error: 'Already reviewed' });
    let patient = demoState.patients.find((p) => p.email?.toLowerCase() === r.email.toLowerCase());
    if (!patient) {
      patient = {
        id: newId(),
        name: r.name,
        email: r.email,
        phone: r.phone,
        dob: null,
        insurance: '',
        emergency: '',
        notes: r.notes || '',
        payer_type: r.payer_type,
        created_at: new Date().toISOString(),
      };
      demoState.patients.push(patient);
    }
    const therapist = defaultTherapist(r);
    const appt = {
      id: newId(),
      patient_id: patient.id,
      appt_date: r.preferred_date,
      appt_time: r.preferred_time,
      duration_min: 50,
      session_type: r.session_type,
      reason: r.service || 'Intake',
      location: r.session_type === 'in-person' ? 'Clinic' : '',
      video_link: '',
      checked_in: false,
      status: 'confirmed',
      therapist,
      source: 'website',
      from_request_id: r.id,
    };
    demoState.appointments.push(appt);
    r.status = 'confirmed';
    r.patient_id = patient.id;
    r.appointment_id = appt.id;
    const notify = await notifyAppointmentBooked({ appointment: appt, patient });
    return res.json({ request: mapRequest(r), patient, appointment: appt, notify });
  }

  const [r] = await sql`SELECT * FROM appointment_requests WHERE id = ${req.params.id}`;
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.status !== 'new') return res.status(400).json({ error: 'Already reviewed' });

  let patient;
  const byEmail = r.email
    ? await sql`SELECT * FROM patients WHERE lower(email) = ${r.email.toLowerCase()} LIMIT 1`
    : [];
  if (byEmail[0]) {
    patient = byEmail[0];
  } else {
    const notes = [
      r.notes ? `Booking note: ${r.notes}` : '',
      `Match: ${r.match_audience}; therapist ${r.therapist_pref}${r.sliding_scale ? '; sliding scale' : ''}`,
      r.assessment_json ? `Assessment: ${r.assessment_json.name || r.assessment_json.id} — ${r.assessment_json.level}` : '',
    ].filter(Boolean).join('\n');
    [patient] = await sql`
      INSERT INTO patients (name, email, phone, insurance, notes, payer_type)
      VALUES (
        ${r.name}, ${r.email}, ${r.phone},
        ${r.payer_type === 'insurance' ? 'Insurance (from booking)' : r.payer_type === 'self-pay' ? 'Self-pay' : ''},
        ${notes}, ${r.payer_type}
      )
      RETURNING *
    `;
  }

  const therapist = defaultTherapist(r);
  const [appt] = await sql`
    INSERT INTO appointments (
      patient_id, appt_date, appt_time, duration_min, session_type, reason, location, video_link, from_request_id
    ) VALUES (
      ${patient.id}, ${r.preferred_date}, ${r.preferred_time}, 50, ${r.session_type},
      ${r.service || 'Intake'},
      ${r.session_type === 'in-person' ? 'Clinic' : ''},
      ${r.session_type === 'video' ? '' : ''},
      ${r.id}
    )
    RETURNING *
  `;

  const [updated] = await sql`
    UPDATE appointment_requests
    SET status = 'confirmed', patient_id = ${patient.id}, appointment_id = ${appt.id}
    WHERE id = ${r.id}
    RETURNING *
  `;
  const notify = await notifyAppointmentBooked({
    appointment: { ...appt, therapist, session_type: r.session_type },
    patient,
  });
  res.json({ request: mapRequest(updated), patient, appointment: { ...appt, therapist }, notify });
});

router.post('/:id/decline', authRequired, requireStaff, async (req, res) => {
  if (!hasDatabase()) {
    const r = demoState.requests.find((x) => x.id === req.params.id);
    if (!r || r.status !== 'new') return res.status(400).json({ error: 'Cannot decline' });
    r.status = 'declined';
    return res.json(mapRequest(r));
  }
  const [updated] = await sql`
    UPDATE appointment_requests SET status = 'declined'
    WHERE id = ${req.params.id} AND status = 'new'
    RETURNING *
  `;
  if (!updated) return res.status(400).json({ error: 'Cannot decline' });
  res.json(mapRequest(updated));
});

export default router;
