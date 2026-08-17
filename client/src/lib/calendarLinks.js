/** Client-side Google Calendar template URL (logistics only). */
function pad(n) {
  return String(n).padStart(2, '0');
}

function toLocalStamp(dateIso, timeHm) {
  const [y, m, d] = String(dateIso).slice(0, 10).split('-');
  const [hh, mm] = String(timeHm).slice(0, 5).split(':');
  return `${y}${m}${d}T${pad(hh)}${pad(mm)}00`;
}

function addMinutes(dateIso, timeHm, minutes) {
  const [y, m, d] = String(dateIso).slice(0, 10).split('-').map(Number);
  const [hh, mm] = String(timeHm).slice(0, 5).split(':').map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0);
  dt.setMinutes(dt.getMinutes() + (minutes || 50));
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

export function googleCalendarUrl({ title, details, location, date, time, durationMin = 50 }) {
  const end = addMinutes(date, time, durationMin);
  const dates = `${toLocalStamp(date, time)}/${toLocalStamp(end.date, end.time)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'MindCare appointment',
    details: details || '',
    location: location || '',
    dates,
    ctz: 'America/New_York',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function appointmentGoogleLinks(appt) {
  const type = appt.type === 'in-person' ? 'In-person' : 'Virtual';
  const when = `${appt.date} at ${appt.time}`;
  const location = appt.type === 'in-person' ? (appt.location || 'Clinic') : (appt.link || 'Virtual visit');
  return {
    patient: googleCalendarUrl({
      title: `MindCare: ${type} visit`,
      details: `With ${appt.therapist || 'therapist'}\nClient: ${appt.patientName}\nWhen: ${when}`,
      location,
      date: appt.date,
      time: appt.time,
      durationMin: appt.duration || 50,
    }),
    therapist: googleCalendarUrl({
      title: `Busy — Session (${type.toLowerCase()})`,
      details: `MindCare calendar hold\nClient: ${appt.patientName}\nWhen: ${when}`,
      location,
      date: appt.date,
      time: appt.time,
      durationMin: appt.duration || 50,
    }),
  };
}

/** Subscribe URL for therapist busy feed (paste into Google Calendar → From URL). */
export function busyFeedUrl(therapist = 'Dr. Sarah Williams', token = 'mindcare-demo-calendar') {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const q = new URLSearchParams({ therapist, token });
  return `${base}/api/notifications/busy.ics?${q.toString()}`;
}
