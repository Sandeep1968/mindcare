import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { hasDatabase, demoState } from '../demo.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';
import { chartForPatient, completeForm } from '../lib/clinical.js';
import { listThreads, createThread, addReply } from '../lib/messages.js';

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
    const chart = await chartForPatient(pid, patient.name);
    return res.json({
      patient: publicPatient(patient),
      appointments,
      forms: chart.forms,
      medications: chart.medications,
      plans: chart.plans,
      assessments: chart.assessments,
    });
  }

  const [patient] = await sql`SELECT * FROM patients WHERE id = ${pid}`;
  if (!patient) {
    const demo = demoState.patients.find((p) => p.id === pid);
    if (!demo) return res.status(404).json({ error: 'Patient record not found' });
    const appointments = demoState.appointments
      .filter((a) => a.patient_id === pid)
      .map(publicAppointment)
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    const chart = await chartForPatient(pid, demo.name);
    return res.json({
      patient: publicPatient(demo),
      appointments,
      forms: chart.forms,
      medications: chart.medications,
      plans: chart.plans,
      assessments: chart.assessments,
    });
  }
  const rows = await sql`
    SELECT * FROM appointments WHERE patient_id = ${pid}
    ORDER BY appt_date DESC, appt_time DESC
  `;
  const chart = await chartForPatient(pid, patient.name);
  res.json({
    patient: publicPatient(patient),
    appointments: rows.map(publicAppointment),
    forms: chart.forms,
    medications: chart.medications,
    plans: chart.plans,
    assessments: chart.assessments,
  });
});

function portalThread(t) {
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    lastAt: t.lastAt,
    fromCareTeam: t.thread?.[t.thread.length - 1]?.direction === 'outbound',
    thread: t.thread || [],
  };
}

router.get('/messages', async (req, res) => {
  const rows = await listThreads({ patientId: req.user.patientId });
  res.json(rows.filter((t) => t.status !== 'archived').map(portalThread));
});

router.post('/messages', async (req, res) => {
  const parsed = z.object({
    subject: z.string().min(2),
    body: z.string().min(1),
    category: z.enum(['scheduling', 'billing', 'forms', 'general']).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a subject and message' });
  try {
    const thread = await createThread({
      patientId: req.user.patientId,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category,
      author: req.user.name,
      authorRole: 'patient',
      channel: 'portal',
    });
    res.status(201).json(portalThread(thread));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not send message' });
  }
});

router.post('/messages/:id/reply', async (req, res) => {
  const parsed = z.object({ body: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a message' });
  const thread = await addReply({
    threadId: req.params.id,
    body: parsed.data.body,
    author: req.user.name,
    authorRole: 'patient',
    patientId: req.user.patientId,
  });
  if (!thread) return res.status(404).json({ error: 'Not found' });
  res.json(portalThread(thread));
});

router.post('/forms/:id/sign', async (req, res) => {
  const parsed = z.object({
    signedName: z.string().min(2, 'Type your full legal name'),
    agreed: z.literal(true, { errorMap: () => ({ message: 'You must agree before signing' }) }),
  }).safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return res.status(400).json({ error: first?.message || 'Enter your name and agree to sign' });
  }
  try {
    const row = await completeForm({
      formId: req.params.id,
      patientId: req.user.patientId,
      signedName: parsed.data.signedName.trim(),
    });
    if (!row) return res.status(404).json({ error: 'Form not found' });
    res.json(row);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not sign form' });
  }
});

export default router;
