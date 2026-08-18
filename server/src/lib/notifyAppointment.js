import { DEMO_USERS } from '../demo.js';
import { buildAppointmentIcs, googleCalendarUrl, clinicTz } from './calendar.js';
import { sendMail, organizerEmail, defaultReplyTo, clinicContactLine } from './mail.js';
import { getClinicVideoSettings, persistAppointmentMeeting, resolveMeeting } from './video.js';
import { toDateIso, toTimeHm } from './dates.js';

const CLINIC = {
  name: process.env.CLINIC_NAME || 'MindCare Practice',
  address: process.env.CLINIC_ADDRESS || 'Clinic address on file',
  fromName: process.env.CLINIC_FROM_NAME || 'MindCare Scheduling',
};

/** Map therapist display name → notification email */
export function resolveTherapistEmail(therapistName) {
  const name = (therapistName || '').trim();
  const mapRaw = process.env.THERAPIST_EMAIL_MAP || '';
  // THERAPIST_EMAIL_MAP="Dr. Sarah Williams=doctor@mindcare.local;Dr. Emily Chen=emily@..."
  if (mapRaw) {
    for (const part of mapRaw.split(';')) {
      const [n, e] = part.split('=').map((s) => s?.trim());
      if (n && e && n.toLowerCase() === name.toLowerCase()) return e;
    }
  }
  const user = DEMO_USERS.find(
    (u) => (u.role === 'practitioner' || u.role === 'admin') && u.name.toLowerCase() === name.toLowerCase(),
  );
  if (user?.email) return user.email;
  const doctor = DEMO_USERS.find((u) => u.role === 'practitioner');
  return process.env.DEFAULT_THERAPIST_EMAIL || doctor?.email || 'doctor@mindcare.local';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFriendlyWhen(date, time) {
  const d = new Date(`${date}T${String(time).slice(0, 5)}:00`);
  if (Number.isNaN(d.getTime())) return `${date} at ${String(time).slice(0, 5)}`;
  const tz = clinicTz() === 'America/New_York' ? 'ET' : clinicTz();
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const clock = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${clock} ${tz}`;
}

function appointmentSubject({ role, event, date, time, patientName }) {
  const when = formatFriendlyWhen(date, time);
  if (event === 'cancelled') {
    return role === 'patient'
      ? `MindCare appointment cancelled — ${when}`
      : `Session cancelled — ${when} (${patientName})`;
  }
  if (event === 'rescheduled') {
    return role === 'patient'
      ? `MindCare appointment updated — ${when}`
      : `Session updated — ${when} (${patientName})`;
  }
  return role === 'patient'
    ? `Your MindCare appointment — ${when}`
    : `Session scheduled — ${when} (${patientName})`;
}

function logisticsRows(appt, patient, role, meeting) {
  const type = appt.session_type || appt.type;
  const date = toDateIso(appt.appt_date || appt.date);
  const time = toTimeHm(appt.appt_time || appt.time);
  const rows = [
    ['When', `${formatFriendlyWhen(date, time)} (${appt.duration_min || appt.duration || 50} minutes)`],
    ['Therapist', appt.therapist || 'Therapist'],
  ];
  if (role === 'therapist') rows.push(['Patient', patient?.name || 'Patient']);
  if (type === 'in-person') {
    rows.push(['Location', appt.location || CLINIC.address]);
  } else if (meeting?.provider === 'zoom' && (meeting.joinUrl || meeting.hostUrl)) {
    if (role === 'patient') {
      rows.push(['Join link', meeting.joinUrl]);
      rows.push(['Note', 'Use your own Zoom login or join as guest. Wait in the Waiting Room until admitted.']);
    } else {
      rows.push(['Host link', meeting.hostUrl || meeting.joinUrl]);
      rows.push(['Patient join link', meeting.joinUrl]);
    }
  } else {
    const link = meeting?.joinUrl || appt.video_link || appt.link || '';
    rows.push(['Visit link', link || 'Link will be sent from the clinic before your session.']);
  }
  return rows;
}

function logisticsText(rows, footerNote) {
  return [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    footerNote,
    '',
    clinicContactLine(),
    defaultReplyTo() ? `Reply to this message at ${defaultReplyTo()}.` : '',
  ].filter(Boolean).join('\n');
}

function appointmentHtml({ greeting, lead, rows, calendarUrl, footerNote }) {
  const rowHtml = rows
    .map(([label, value]) => {
      const val = String(value);
      const linked = /^https?:\/\//i.test(val)
        ? `<a href="${escapeHtml(val)}" style="color:#003e7e;word-break:break-all">${escapeHtml(val)}</a>`
        : escapeHtml(val);
      return `<tr><td style="padding:8px 16px 8px 0;color:#64748b;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;color:#0f172a">${linked}</td></tr>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#f8fafc">
<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
  <p style="margin:0 0 12px;font-size:15px">${greeting}</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${lead}</p>
  <table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.5;width:100%">${rowHtml}</table>
  ${calendarUrl ? `<p style="margin:20px 0 0"><a href="${escapeHtml(calendarUrl)}" style="color:#003e7e;font-weight:600">Add to Google Calendar</a></p>` : ''}
  <p style="margin:20px 0 0;font-size:13px;color:#475569;line-height:1.5">${escapeHtml(footerNote)}</p>
  <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.5">${escapeHtml(clinicContactLine())}</p>
</div></body></html>`;
}

function logisticsDescription(appt, patient, role, meeting) {
  const rows = logisticsRows(appt, patient, role, meeting);
  const footer = role === 'patient'
    ? 'To reschedule, reply to this email or contact the clinic. Please do not include clinical details by email.'
    : 'Accept the attached calendar invite to block this time. Decline in calendar if the visit changes.';
  return logisticsText(rows, footer);
}

/**
 * Notify patient + therapist and return calendar links.
 * Solves double-booking visibility: therapist gets ICS (blocks Google Calendar when accepted)
 * and can subscribe to the busy feed for ongoing sync.
 */
export async function notifyAppointmentBooked({ appointment, patient, event = 'created' }) {
  const appt = appointment;
  const date = toDateIso(appt.appt_date || appt.date);
  const time = toTimeHm(appt.appt_time || appt.time);
  const duration = appt.duration_min || appt.duration || 50;
  const type = appt.session_type || appt.type || 'video';
  const therapistName = appt.therapist || 'Dr. Sarah Williams';
  const therapistEmail = resolveTherapistEmail(therapistName);
  const patientEmail = patient?.email || null;
  const patientName = patient?.name || 'Client';

  let meeting = null;
  if (type !== 'in-person') {
    const settings = await getClinicVideoSettings();
    meeting = await resolveMeeting({
      settings,
      appointment: appt,
      patient,
      role: 'host',
    });
    if (meeting?.joinUrl) {
      appt.video_link = meeting.joinUrl;
      appt.video_host_link = meeting.hostUrl || '';
      if (appt.id) await persistAppointmentMeeting(appt.id, meeting);
    }
  }

  const patientRows = logisticsRows(appt, patient, 'patient', meeting);
  const therapistRows = logisticsRows(appt, patient, 'therapist', meeting);
  const patientDetails = logisticsDescription(appt, patient, 'patient', meeting);
  const therapistDetails = logisticsDescription(appt, patient, 'therapist', meeting);
  const orgEmail = organizerEmail();

  const location =
    type === 'in-person'
      ? appt.location || CLINIC.address
      : meeting?.joinUrl || appt.video_link || appt.link || 'Virtual Zoom session';

  const titlePatient = `${CLINIC.name} appointment`;
  const titleTherapist = `${CLINIC.name} — session block`;

  const gcalPatient = googleCalendarUrl({
    title: titlePatient,
    details: patientDetails,
    location,
    date,
    time,
    durationMin: duration,
  });

  const gcalTherapist = googleCalendarUrl({
    title: titleTherapist,
    details: therapistDetails,
    location,
    date,
    time,
    durationMin: duration,
  });

  const results = { patient: null, therapist: null, googleCalendar: { patient: gcalPatient, therapist: gcalTherapist } };
  const replyTo = defaultReplyTo();

  // Patient email
  if (patientEmail) {
    const ics = buildAppointmentIcs({
      id: `${appt.id}-patient`,
      title: titlePatient,
      description: patientDetails,
      location,
      date,
      time,
      durationMin: duration,
      organizerName: CLINIC.fromName,
      organizerEmail: orgEmail,
      attendeeName: patientName,
      attendeeEmail: patientEmail,
      method: event === 'cancelled' ? 'CANCEL' : 'REQUEST',
    });
    const patientLead = event === 'cancelled'
      ? 'Your appointment has been cancelled.'
      : event === 'rescheduled'
        ? 'Your appointment time has been updated.'
        : 'This message confirms your upcoming appointment.';
    const patientFooter = 'A calendar file is attached if you want to save the visit on your phone or computer.';
    try {
      results.patient = await sendMail({
        to: patientEmail,
        replyTo,
        subject: appointmentSubject({ role: 'patient', event, date, time, patientName }),
        text: [
          `Hello ${patientName},`,
          '',
          patientLead,
          '',
          logisticsText(patientRows, patientFooter),
          '',
          `Google Calendar: ${gcalPatient}`,
        ].join('\n'),
        html: appointmentHtml({
          greeting: `Hello ${patientName},`,
          lead: patientLead,
          rows: patientRows,
          calendarUrl: gcalPatient,
          footerNote: patientFooter,
        }),
        icsContent: ics,
        icsFilename: 'mindcare-appointment.ics',
      });
    } catch (err) {
      results.patient = { status: 'failed', error: err.message, to: patientEmail };
    }
  } else {
    results.patient = { status: 'skipped', reason: 'No patient email on file' };
  }

  // Therapist email — blocks their calendar so others see busy time
  if (therapistEmail) {
    const ics = buildAppointmentIcs({
      id: `${appt.id}-therapist`,
      title: titleTherapist,
      description: therapistDetails,
      location,
      date,
      time,
      durationMin: duration,
      organizerName: CLINIC.fromName,
      organizerEmail: orgEmail,
      attendeeName: therapistName,
      attendeeEmail: therapistEmail,
      method: event === 'cancelled' ? 'CANCEL' : 'REQUEST',
    });
    const therapistLead = event === 'cancelled'
      ? 'A session on your calendar was cancelled.'
      : event === 'rescheduled'
        ? 'A session on your calendar was updated.'
        : 'A new session was added to your schedule.';
    const therapistFooter = 'Accept the calendar invite to mark this time as busy.';
    try {
      results.therapist = await sendMail({
        to: therapistEmail,
        replyTo,
        subject: appointmentSubject({ role: 'therapist', event, date, time, patientName }),
        text: [
          `Hello ${therapistName},`,
          '',
          therapistLead,
          '',
          logisticsText(therapistRows, therapistFooter),
          '',
          `Google Calendar: ${gcalTherapist}`,
        ].join('\n'),
        html: appointmentHtml({
          greeting: `Hello ${therapistName},`,
          lead: therapistLead,
          rows: therapistRows,
          calendarUrl: gcalTherapist,
          footerNote: therapistFooter,
        }),
        icsContent: ics,
        icsFilename: 'mindcare-session.ics',
      });
    } catch (err) {
      results.therapist = { status: 'failed', error: err.message, to: therapistEmail };
    }
  }

  return {
    notified: {
      patient: results.patient?.status === 'sent' || results.patient?.status === 'demo',
      therapist: results.therapist?.status === 'sent' || results.therapist?.status === 'demo',
    },
    emails: results,
    googleCalendar: results.googleCalendar,
    mode: results.therapist?.mode || results.patient?.mode || 'demo',
    meeting: meeting
      ? { provider: meeting.provider, joinUrl: meeting.joinUrl, hostUrl: meeting.hostUrl, error: meeting.error || null }
      : null,
  };
}

