/** ICS + Google Calendar helpers — logistics only, no clinical PHI. */

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Clinic wall-clock zone for USA MindCare (override with CLINIC_TZ). */
export function clinicTz() {
  return process.env.CLINIC_TZ || 'America/New_York';
}

/** Local clinic time → ICS floating local datetime (YYYYMMDDTHHMMSS) */
export function toIcsLocal(dateIso, timeHm) {
  const [y, m, d] = String(dateIso).slice(0, 10).split('-');
  const [hh, mm] = String(timeHm).slice(0, 5).split(':');
  return `${y}${m}${d}T${pad(hh)}${pad(mm)}00`;
}

export function addMinutes(dateIso, timeHm, minutes) {
  const [y, m, d] = String(dateIso).slice(0, 10).split('-').map(Number);
  const [hh, mm] = String(timeHm).slice(0, 5).split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0);
  dt.setMinutes(dt.getMinutes() + (minutes || 50));
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** UID domain must match the sending mailbox (Gmail rejects mismatched organizer domains). */
export function calendarUidDomain(email) {
  const domain = String(email || '').split('@')[1];
  return domain || 'gmail.com';
}

function foldLine(line) {
  if (line.length <= 75) return line;
  const parts = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

/**
 * Build a calendar invite that marks the slot BUSY (TRANSP:OPAQUE).
 * Times use clinic TZID so USA + India calendars convert correctly.
 */
export function buildAppointmentIcs({
  id,
  title,
  description,
  location,
  date,
  time,
  durationMin = 50,
  organizerName,
  organizerEmail,
  attendeeName,
  attendeeEmail,
  method = 'REQUEST',
}) {
  const end = addMinutes(date, time, durationMin);
  const tz = clinicTz();
  const dtStart = toIcsLocal(date, time);
  const dtEnd = toIcsLocal(end.date, end.time);
  const uid = `${id}@${calendarUidDomain(organizerEmail)}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const status = method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MindCare//Appointments//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${tz}:${dtStart}`,
    `DTEND;TZID=${tz}:${dtEnd}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location || '')}`,
    `STATUS:${status}`,
    'TRANSP:OPAQUE',
    'CLASS:PRIVATE',
    `ORGANIZER;CN=${escapeIcs(organizerName || 'MindCare')}:mailto:${organizerEmail || 'noreply@mindcare.local'}`,
  ];

  if (attendeeEmail) {
    lines.push(
      `ATTENDEE;CN=${escapeIcs(attendeeName || 'Guest')};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${attendeeEmail}`,
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** One-click “Add to Google Calendar” (opens Google’s template UI). */
export function googleCalendarUrl({ title, details, location, date, time, durationMin = 50 }) {
  const end = addMinutes(date, time, durationMin);
  const dates = `${toIcsLocal(date, time)}/${toIcsLocal(end.date, end.time)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'MindCare appointment',
    details: details || '',
    location: location || '',
    dates,
    ctz: clinicTz(),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Human-readable when/where for emails (no diagnoses). */
export function formatVisitLabel(appt) {
  const type = appt.type === 'in-person' || appt.session_type === 'in-person' ? 'In-person' : 'Virtual';
  const tz = clinicTz() === 'America/New_York' ? 'ET' : clinicTz();
  return `${type} · ${appt.date || appt.appt_date} · ${String(appt.time || appt.appt_time).slice(0, 5)} ${tz}`;
}
