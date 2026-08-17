import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState } from '../demo.js';
import { isZoomUrl, mapSettings, resolveMeeting } from '../lib/video.js';
import { zoomApiConfigured } from '../lib/zoom.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';

const router = Router();
router.use(authRequired);

function todayIso() {
  return toDateIso(new Date());
}

function getDemoSettings() {
  if (!demoState.settings) {
    demoState.settings = {
      clinic_name: 'MindCare Practice',
      video_provider: 'zoom',
      zoom_link: '',
      zoom_host_email: '',
      waiting_message: 'Your therapist will join shortly. Find a quiet, private space and use headphones if you can.',
    };
  }
  return demoState.settings;
}

async function ensureVideoColumns() {
  if (!hasDatabase()) return;
  try {
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_host_link TEXT DEFAULT ''`;
    await sql`ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS waiting_message TEXT DEFAULT ''`;
    await sql`ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS zoom_host_email TEXT DEFAULT ''`;
  } catch { /* ignore */ }
}

async function persistMeeting(apptId, meeting) {
  if (!hasDatabase()) {
    const a = demoState.appointments.find((x) => x.id === apptId);
    if (a) {
      a.video_link = meeting.joinUrl;
      a.video_host_link = meeting.hostUrl;
    }
    return;
  }
  await sql`
    UPDATE appointments
    SET video_link = ${meeting.joinUrl || ''},
        video_host_link = ${meeting.hostUrl || ''}
    WHERE id = ${apptId}
  `;
}

function meetingPayload(meeting, extra = {}) {
  return {
    provider: meeting.provider,
    mode: meeting.mode,
    hostUrl: meeting.hostUrl,
    joinUrl: meeting.joinUrl,
    link: meeting.link,
    meetingId: meeting.meetingId || '',
    error: meeting.error || null,
    zoomApiReady: zoomApiConfigured(),
    ...extra,
  };
}

/** Patient: upcoming video visits — always the JOIN link (their Zoom account / guest). */
router.get('/mine', async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Patient access only' });
  }
  const pid = req.user.patientId;
  if (!pid) return res.json([]);
  const today = todayIso();
  await ensureVideoColumns();
  const settings = !hasDatabase() ? getDemoSettings() : (await sql`SELECT * FROM clinic_settings WHERE id = 1`)[0] || {};

  if (!hasDatabase()) {
    const rows = [];
    for (const a of demoState.appointments) {
      if (a.patient_id !== pid || a.session_type !== 'video') continue;
      if (toDateIso(a.appt_date) < today) continue;
      if (['cancelled', 'declined'].includes(a.status || 'confirmed')) continue;
      const patient = demoState.patients.find((p) => p.id === a.patient_id);
      const meeting = await resolveMeeting({
        settings, appointment: a, patient, role: 'patient',
      });
      await persistMeeting(a.id, meeting);
      rows.push({
        id: a.id,
        date: toDateIso(a.appt_date),
        time: toTimeHm(a.appt_time),
        duration: a.duration_min || 50,
        reason: a.reason || 'Therapy session',
        therapist: a.therapist || 'Your therapist',
        link: meeting.joinUrl,
        hostUrl: meeting.hostUrl,
        joinUrl: meeting.joinUrl,
        provider: meeting.provider,
        mode: meeting.mode,
        waitingMessage: settings.waiting_message,
      });
    }
    rows.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return res.json(rows);
  }

  const rows = await sql`
    SELECT a.*, p.name AS patient_name, p.email AS patient_email
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.patient_id = ${pid} AND a.session_type = 'video' AND a.appt_date >= CURRENT_DATE
    ORDER BY a.appt_date, a.appt_time
  `;
  const out = [];
  for (const a of rows) {
    const meeting = await resolveMeeting({
      settings,
      appointment: a,
      patient: { name: a.patient_name, email: a.patient_email },
      role: 'patient',
    });
    if (meeting.joinUrl && (meeting.joinUrl !== a.video_link || meeting.hostUrl !== a.video_host_link)) {
      await persistMeeting(a.id, meeting);
    }
    out.push({
      id: a.id,
      date: toDateIso(a.appt_date),
      time: toTimeHm(a.appt_time),
      duration: a.duration_min || 50,
      reason: a.reason || 'Therapy session',
      therapist: a.therapist || 'Your therapist',
      link: meeting.joinUrl,
      hostUrl: meeting.hostUrl,
      joinUrl: meeting.joinUrl,
      provider: meeting.provider,
      mode: meeting.mode,
      waitingMessage: settings.waiting_message || '',
    });
  }
  res.json(out);
});

router.use(requireStaff);

router.get('/settings', async (_req, res) => {
  await ensureVideoColumns();
  if (!hasDatabase()) {
    return res.json(mapSettings(getDemoSettings()));
  }
  const [row] = await sql`SELECT * FROM clinic_settings WHERE id = 1`;
  res.json(mapSettings(row || {}));
});

router.patch('/settings', async (req, res) => {
  const schema = z.object({
    provider: z.enum(['zoom', 'jitsi']),
    zoomLink: z.string().optional().default(''),
    zoomHostEmail: z.union([z.literal(''), z.string().email()]).optional().default(''),
    clinicName: z.string().optional(),
    waitingMessage: z.string().optional(),
    applyToUpcoming: z.boolean().optional().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid settings' });
  const d = parsed.data;

  if (d.provider === 'zoom' && d.zoomLink && !isZoomUrl(d.zoomLink) && !zoomApiConfigured()) {
    return res.status(400).json({
      error: 'Paste a Zoom invite link (https://zoom.us/j/…) or configure ZOOM_* API keys in server/.env',
    });
  }

  await ensureVideoColumns();
  let updated = 0;

  if (!hasDatabase()) {
    const s = getDemoSettings();
    s.video_provider = d.provider;
    s.zoom_link = d.zoomLink;
    if (d.zoomHostEmail != null) s.zoom_host_email = d.zoomHostEmail;
    if (d.clinicName != null) s.clinic_name = d.clinicName;
    if (d.waitingMessage != null) s.waiting_message = d.waitingMessage;

    if (d.applyToUpcoming) {
      const today = todayIso();
      for (const a of demoState.appointments) {
        if (a.session_type !== 'video' || toDateIso(a.appt_date) < today) continue;
        const patient = demoState.patients.find((p) => p.id === a.patient_id);
        const meeting = await resolveMeeting({
          settings: s, appointment: a, patient, forceFresh: true, role: 'host',
        });
        if (meeting.joinUrl) {
          a.video_link = meeting.joinUrl;
          a.video_host_link = meeting.hostUrl;
          updated += 1;
        }
      }
    }

    return res.json({
      ...mapSettings(s),
      updatedUpcoming: updated,
      message: d.provider === 'zoom'
        ? (zoomApiConfigured()
          ? 'Zoom API ready — each visit creates a unique meeting (doctor start + patient join).'
          : 'Zoom PMI saved — doctor starts as host with their Zoom login; patient joins with theirs.')
        : 'Jitsi Meet saved — same browser room for doctor and patient',
    });
  }

  await sql`
    UPDATE clinic_settings SET
      video_provider = ${d.provider},
      zoom_link = ${d.zoomLink},
      zoom_host_email = ${d.zoomHostEmail || ''},
      clinic_name = ${d.clinicName || 'MindCare Practice'},
      waiting_message = ${d.waitingMessage || ''},
      updated_at = now()
    WHERE id = 1
  `;

  if (d.applyToUpcoming) {
    const upcoming = await sql`
      SELECT a.*, p.name AS patient_name, p.email AS patient_email
      FROM appointments a JOIN patients p ON p.id = a.patient_id
      WHERE a.session_type = 'video' AND a.appt_date >= CURRENT_DATE
    `;
    const [settings] = await sql`SELECT * FROM clinic_settings WHERE id = 1`;
    for (const a of upcoming) {
      const meeting = await resolveMeeting({
        settings,
        appointment: a,
        patient: { name: a.patient_name, email: a.patient_email },
        forceFresh: true,
        role: 'host',
      });
      if (meeting.joinUrl) {
        await persistMeeting(a.id, meeting);
        updated += 1;
      }
    }
  }

  const [row] = await sql`SELECT * FROM clinic_settings WHERE id = 1`;
  res.json({
    ...mapSettings(row),
    updatedUpcoming: updated,
    message: updated
      ? `Video settings saved — ${updated} upcoming visit${updated === 1 ? '' : 's'} updated`
      : d.provider === 'zoom'
        ? (zoomApiConfigured()
          ? 'Zoom API ready — doctor gets start link, patient gets join link'
          : 'Zoom PMI saved — use Join as host (doctor account) / Join session (patient account)')
        : 'Jitsi Meet saved',
  });
});

/**
 * Staff/doctor join — returns HOST start URL for Zoom (doctor's account)
 * or shared Jitsi room.
 */
router.get('/appointments/:id/join', async (req, res) => {
  await ensureVideoColumns();
  const role = req.query.role === 'patient' ? 'patient' : 'host';

  if (!hasDatabase()) {
    const a = demoState.appointments.find((x) => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Appointment not found' });
    if (a.session_type !== 'video') return res.status(400).json({ error: 'Not a video visit' });
    const settings = getDemoSettings();
    const patient = demoState.patients.find((p) => p.id === a.patient_id);
    const meeting = await resolveMeeting({ settings, appointment: a, patient, role });
    if (meeting.error) return res.status(400).json({ error: meeting.error });
    await persistMeeting(a.id, meeting);
    return res.json(meetingPayload(meeting, {
      patientName: patient?.name || 'Client',
      date: toDateIso(a.appt_date),
      time: toTimeHm(a.appt_time),
      waitingMessage: settings.waiting_message,
      role,
    }));
  }

  const [a] = await sql`
    SELECT a.*, p.name AS patient_name, p.email AS patient_email
    FROM appointments a JOIN patients p ON p.id = a.patient_id
    WHERE a.id = ${req.params.id}
  `;
  if (!a) return res.status(404).json({ error: 'Appointment not found' });
  if (a.session_type !== 'video') return res.status(400).json({ error: 'Not a video visit' });
  const [settings] = await sql`SELECT * FROM clinic_settings WHERE id = 1`;
  const meeting = await resolveMeeting({
    settings: settings || {},
    appointment: a,
    patient: { name: a.patient_name, email: a.patient_email },
    role,
  });
  if (meeting.error) return res.status(400).json({ error: meeting.error });
  await persistMeeting(a.id, meeting);
  res.json(meetingPayload(meeting, {
    patientName: a.patient_name,
    date: toDateIso(a.appt_date),
    time: toTimeHm(a.appt_time),
    waitingMessage: settings?.waiting_message || '',
    role,
  }));
});

/** Instant ad-hoc session — doctor host + patient join URLs. */
router.post('/instant', async (_req, res) => {
  await ensureVideoColumns();
  const settings = !hasDatabase()
    ? getDemoSettings()
    : (await sql`SELECT * FROM clinic_settings WHERE id = 1`)[0] || {};

  const provider = settings.video_provider || 'zoom';
  if (provider === 'zoom' && !settings.zoom_link && !zoomApiConfigured()) {
    return res.status(400).json({
      error: 'For Zoom: paste Personal Meeting invite link, or set ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET / ZOOM_HOST_EMAIL',
    });
  }

  const meeting = await resolveMeeting({
    settings,
    appointment: { id: `instant-${Date.now()}`, duration_min: 50 },
    patient: { name: 'Walk-in' },
    forceFresh: true,
    role: 'host',
  });
  if (meeting.error) return res.status(400).json({ error: meeting.error });

  res.json({
    ...meetingPayload(meeting),
    waitingMessage: settings.waiting_message || '',
    message: meeting.provider === 'zoom'
      ? 'Zoom ready — you start as host (your Zoom login); copy join link for the patient (their Zoom login).'
      : 'Jitsi room ready — same browser link for you and the patient',
  });
});

export default router;
