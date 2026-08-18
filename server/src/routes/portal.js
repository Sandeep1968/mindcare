import { Router } from 'express';
import { sql } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { hasDatabase, demoState } from '../demo.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';

const router = Router();
router.use(authRequired);

function requirePatient(req, res, next) {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ error: 'Patient portal access only' });
  }
  if (!req.user.patientId) {
    return res.status(403).json({ error: 'No patient record linked to this login' });
  }
  next();
}

router.use(requirePatient);

function publicPatient(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    email: p.email || '',
    phone: p.phone || '',
    dob: p.dob || '',
    gender: p.gender || '',
    city: p.city || '',
    state: p.state || '',
    insurance: p.insurance || '',
    emergency: p.emergency || '',
    emergency_phone: p.emergency_phone || '',
    payer_type: p.payer_type || 'self-pay',
    status: p.status || 'active',
    care_type: p.care_type || '',
    therapist: p.therapist || '',
    visit_pref: p.visit_pref || '',
    frequency: p.frequency || '',
    primary_concern: p.primary_concern || '',
    care_started: p.care_started || '',
    client_code: p.client_code || '',
  };
}

function publicAppointment(a) {
  return {
    id: a.id,
    date: toDateIso(a.appt_date || a.date),
    time: toTimeHm(a.appt_time || a.time),
    duration: a.duration_min || a.duration || 50,
    type: a.session_type || a.type || 'video',
    reason: a.reason || 'Therapy session',
    location: a.location || '',
    status: a.status || 'confirmed',
    therapist: a.therapist || 'Your therapist',
    videoLink: a.session_type === 'video' || a.type === 'video' ? (a.video_link || '') : '',
  };
}

/** Logged-in patient: own chart + session list. No clinical SOAP notes. */
router.get('/me', async (req, res) => {
  const pid = req.user.patientId;

  if (!hasDatabase()) {
    const patient = demoState.patients.find((p) => p.id === pid);
    if (!patient) return res.status(404).json({ error: 'Patient record not found' });
    const appointments = demoState.appointments
      .filter((a) => a.patient_id === pid)
      .map(publicAppointment)
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return res.json({ patient: publicPatient(patient), appointments });
  }

  const [patient] = await sql`SELECT * FROM patients WHERE id = ${pid}`;
  if (!patient) {
    const demo = demoState.patients.find((p) => p.id === pid);
    if (!demo) return res.status(404).json({ error: 'Patient record not found' });
    const appointments = demoState.appointments
      .filter((a) => a.patient_id === pid)
      .map(publicAppointment)
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return res.json({ patient: publicPatient(demo), appointments });
  }
  const rows = await sql`
    SELECT * FROM appointments WHERE patient_id = ${pid}
    ORDER BY appt_date DESC, appt_time DESC
  `;
  res.json({
    patient: publicPatient(patient),
    appointments: rows.map(publicAppointment),
  });
});

export default router;
