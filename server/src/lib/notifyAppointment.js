import { DEMO_USERS } from '../demo.js';
import { buildAppointmentIcs, formatVisitLabel, googleCalendarUrl } from './calendar.js';
import { sendMail } from './mail.js';
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

function logisticsDescription(appt, patient, role, meeting) {
  const type = appt.session_type || appt.type;
  const when = formatVisitLabel({
    type,
    date: toDateIso(appt.appt_date || appt.date),
    time: toTimeHm(appt.appt_time || appt.time),
  });
  const lines = [
    `${CLINIC.name} appointment confirmation`,
    `When: ${when} (${appt.duration_min || appt.duration || 50} min)`,
    `With: ${appt.therapist || 'Therapist'}`,
    `Client: ${patient?.name || 'Client'}`,
  ];
  if (type === 'in-person') {
    lines.push(`Location: ${appt.location || CLINIC.address}`);
  } else if (meeting?.provider === 'zoom' && (meeting.joinUrl || meeting.hostUrl)) {
    if (role === 'patient') {
      lines.push(`Join Zoom (your Zoom login or guest): ${meeting.joinUrl}`);
      lines.push('Wait in Waiting Room until your therapist admits you. Do not use the clinic Zoom login.');
    } else {
      lines.push(`Start Zoom as host (clinic Zoom login): ${meeting.hostUrl || meeting.joinUrl}`);
      lines.push(`Patient join link: ${meeting.joinUrl}`);
    }
  } else {
    const link = meeting?.joinUrl || appt.video_link || appt.link || '';
    lines.push(link ? `Virtual visit link: ${link}` : 'Virtual visit: Zoom link will be shared from Video Visits.');
  }
  if (role === 'patient') {
    lines.push('', 'If you need to reschedule, contact the clinic. Do not reply with clinical details by email.');
  } else {
    lines.push('', 'This time is marked busy on your calendar invite. Decline/cancel in calendar if the visit changes.');
  }
  return lines.join('\n');
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

  const patientDetails = logisticsDescription(appt, patient, 'patient', meeting);
  const therapistDetails = logisticsDescription(appt, patient, 'therapist', meeting);

  const location =
    type === 'in-person'
      ? appt.location || CLINIC.address
      : meeting?.joinUrl || appt.video_link || appt.link || 'Virtual Zoom session';

  const titlePatient = `${CLINIC.name}: ${type === 'in-person' ? 'In-person' : 'Virtual Zoom'} visit`;
  const titleTherapist = `Busy — Session with client (${type === 'in-person' ? 'in-person' : 'virtual Zoom'})`;

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

  const verb = event === 'rescheduled' ? 'updated' : event === 'cancelled' ? 'cancelled' : 'confirmed';

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
      organizerEmail: process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] || 'noreply@mindcare.local',
      attendeeName: patientName,
      attendeeEmail: patientEmail,
      method: event === 'cancelled' ? 'CANCEL' : 'REQUEST',
    });
    try {
      results.patient = await sendMail({
        to: patientEmail,
        subject: `MindCare visit ${verb}: ${date} at ${time}`,
        text: [
          `Hello ${patientName},`,
          '',
          `Your appointment is ${verb}.`,
          patientDetails,
          '',
          `Add to Google Calendar: ${gcalPatient}`,
          '',
          'An .ics calendar file is attached — open it to save the visit on your phone or computer.',
        ].join('\n'),
        html: `
          <p>Hello ${escapeHtml(patientName)},</p>
          <p>Your appointment is <strong>${verb}</strong>.</p>
          <pre style="font-family:Segoe UI,sans-serif;white-space:pre-wrap">${escapeHtml(patientDetails)}</pre>
          <p><a href="${gcalPatient}">Add to Google Calendar</a></p>
          <p style="color:#666;font-size:12px">Calendar invite attached (.ics). Emails contain scheduling details only.</p>
        `,
        icsContent: ics,
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
      organizerEmail: process.env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] || 'noreply@mindcare.local',
      attendeeName: therapistName,
      attendeeEmail: therapistEmail,
      method: event === 'cancelled' ? 'CANCEL' : 'REQUEST',
    });
    try {
      results.therapist = await sendMail({
        to: therapistEmail,
        subject: `Calendar hold ${verb}: ${date} ${time} (${patientName})`,
        text: [
          `Hello ${therapistName},`,
          '',
          `A session was ${verb}. This invite marks you BUSY for that slot.`,
          therapistDetails,
          '',
          `Add to Google Calendar: ${gcalTherapist}`,
          '',
          'Tip: Subscribe to your MindCare busy feed in Google Calendar so future bookings sync automatically.',
        ].join('\n'),
        html: `
          <p>Hello ${escapeHtml(therapistName)},</p>
          <p>A session was <strong>${verb}</strong>. Accept the calendar invite to <strong>block this time</strong> so overlapping bookings are avoided.</p>
          <pre style="font-family:Segoe UI,sans-serif;white-space:pre-wrap">${escapeHtml(therapistDetails)}</pre>
          <p><a href="${gcalTherapist}">Add to Google Calendar</a></p>
        `,
        icsContent: ics,
        icsFilename: 'mindcare-busy-block.ics',
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
