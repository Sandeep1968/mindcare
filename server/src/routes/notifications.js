import { Router } from 'express';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState } from '../demo.js';
import { sql } from '../db.js';
import { listOutbox, smtpConfigured } from '../lib/mail.js';
import { addMinutes, toIcsLocal } from '../lib/calendar.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';

const router = Router();

function busyFromDemo(therapist, from, to) {
  return demoState.appointments
    .filter((a) => {
      const st = a.status || 'confirmed';
      if (['cancelled', 'declined'].includes(st)) return false;
      if (therapist && a.therapist && a.therapist !== therapist) return false;
      const date = toDateIso(a.appt_date);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    })
    .map((a) => {
      const date = toDateIso(a.appt_date);
      const start = toTimeHm(a.appt_time);
      const end = addMinutes(date, start, a.duration_min || 50);
      return {
        id: a.id,
        therapist: a.therapist || 'Dr. Sarah Williams',
        date,
        start,
        end: end.time,
        endDate: end.date,
        duration: a.duration_min || 50,
        type: a.session_type,
        label: 'Busy — MindCare session',
      };
    })
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildBusyFeedIcs(therapist, slots) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MindCare//Busy Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:MindCare Busy — ${therapist}`,
  ];
  for (const s of slots) {
    const end = addMinutes(s.date, s.start, s.duration || 50);
    lines.push(
      'BEGIN:VEVENT',
      `UID:busy-${s.id}@mindcare.clinic`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsLocal(s.date, s.start)}`,
      `DTEND:${toIcsLocal(end.date, end.time)}`,
      `SUMMARY:${escapeIcs('Busy — MindCare session')}`,
      `DESCRIPTION:${escapeIcs('Blocked by MindCare scheduling. Open the clinic app for client details.')}`,
      'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
      'CLASS:PRIVATE',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

router.get('/outbox', authRequired, requireStaff, (_req, res) => {
  res.json({ smtpConfigured: smtpConfigured(), items: listOutbox(50) });
});

router.get('/busy', authRequired, requireStaff, async (req, res) => {
  const therapist = req.query.therapist || 'Dr. Sarah Williams';
  const from = req.query.from || toDateIso(new Date());
  const to = req.query.to || from;

  if (!hasDatabase()) {
    return res.json({ therapist, from, to, slots: busyFromDemo(therapist, from, to) });
  }

  const rows = await sql`
    SELECT id, appt_date, appt_time, duration_min, session_type
    FROM appointments
    WHERE appt_date >= ${from} AND appt_date <= ${to}
    ORDER BY appt_date, appt_time
  `;
  const slots = rows.map((a) => {
    const date = toDateIso(a.appt_date);
    const start = toTimeHm(a.appt_time);
    const end = addMinutes(date, start, a.duration_min || 50);
    return {
      id: a.id,
      therapist,
      date,
      start,
      end: end.time,
      endDate: end.date,
      duration: a.duration_min || 50,
      type: a.session_type,
      label: 'Busy — MindCare session',
    };
  });
  res.json({ therapist, from, to, slots });
});

/**
 * Google Calendar subscription URL (Other calendars → From URL).
 * Example: /api/notifications/busy.ics?therapist=Dr.%20Sarah%20Williams&token=mindcare-demo-calendar
 */
router.get('/busy.ics', async (req, res) => {
  const token = req.query.token || '';
  const expected = process.env.CLINIC_CALENDAR_TOKEN || 'mindcare-demo-calendar';
  if (token !== expected) {
    return res.status(401).type('text').send('Unauthorized. Use CLINIC_CALENDAR_TOKEN.');
  }

  const therapist = req.query.therapist || 'Dr. Sarah Williams';
  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 120);
  const fromIso = toDateIso(from);
  const toIso = toDateIso(to);

  let slots;
  if (!hasDatabase()) {
    slots = busyFromDemo(therapist, fromIso, toIso);
  } else {
    const rows = await sql`
      SELECT id, appt_date, appt_time, duration_min
      FROM appointments
      WHERE appt_date >= ${fromIso} AND appt_date <= ${toIso}
      ORDER BY appt_date, appt_time
    `;
    slots = rows.map((a) => ({
      id: a.id,
      date: toDateIso(a.appt_date),
      start: toTimeHm(a.appt_time),
      duration: a.duration_min || 50,
    }));
  }

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(buildBusyFeedIcs(therapist, slots));
});

export default router;
