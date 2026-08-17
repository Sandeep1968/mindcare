/** Clinic times are wall-clock in the clinic timezone (default: US Eastern). */

export const CLINIC_TZ_KEY = 'mindcare.clinic.timezone';
export const DEFAULT_CLINIC_TZ = 'America/New_York';
export const INDIA_TZ = 'Asia/Kolkata';

export const CLINIC_TZ_OPTIONS = [
  { value: 'America/New_York', label: 'US Eastern (New York)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
];

export function getClinicTimeZone() {
  try {
    const v = localStorage.getItem(CLINIC_TZ_KEY);
    if (v && CLINIC_TZ_OPTIONS.some((o) => o.value === v)) return v;
  } catch { /* ignore */ }
  return DEFAULT_CLINIC_TZ;
}

export function setClinicTimeZone(tz) {
  localStorage.setItem(CLINIC_TZ_KEY, tz);
}

export function tzShortLabel(tz = getClinicTimeZone()) {
  if (tz === 'Asia/Kolkata') return 'IST';
  if (tz === 'America/New_York') return 'ET';
  if (tz === 'America/Chicago') return 'CT';
  if (tz === 'America/Denver') return 'MT';
  if (tz === 'America/Los_Angeles') return 'PT';
  return tz.split('/').pop();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Local calendar YYYY-MM-DD for a Date in a given IANA zone. */
export function dateIsoInZone(date = new Date(), timeZone = getClinicTimeZone()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** HH:MM in a given IANA zone. */
export function timeHmInZone(date = new Date(), timeZone = getClinicTimeZone()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('hour')}:${get('minute')}`;
}

/**
 * Interpret clinic wall date+time as an absolute Instant.
 * (Appointment rows store clinic-local wall clock, not UTC.)
 */
export function clinicWallToUtc(dateIso, timeHm, timeZone = getClinicTimeZone()) {
  const [y, m, d] = String(dateIso).slice(0, 10).split('-').map(Number);
  const [hh, mm] = String(timeHm).slice(0, 5).split(':').map(Number);
  let utcMs = Date.UTC(y, m - 1, d, hh, mm, 0);

  for (let i = 0; i < 3; i += 1) {
    const probe = new Date(utcMs);
    const gotDate = dateIsoInZone(probe, timeZone);
    const gotTime = timeHmInZone(probe, timeZone);
    const [gy, gm, gd] = gotDate.split('-').map(Number);
    const [ghh, gmm] = gotTime.split(':').map(Number);
    const wantMin = Date.UTC(y, m - 1, d, hh, mm) / 60000;
    const gotMin = Date.UTC(gy, gm - 1, gd, ghh, gmm) / 60000;
    utcMs += (wantMin - gotMin) * 60000;
  }
  return new Date(utcMs);
}

export function formatClock(date = new Date(), timeZone = getClinicTimeZone()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** e.g. "10:00 AM ET · 7:30 PM IST" */
export function formatDualTime(dateIso, timeHm, clinicTz = getClinicTimeZone()) {
  if (!dateIso || !timeHm) return '';
  const instant = clinicWallToUtc(dateIso, timeHm, clinicTz);
  const clinic = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(instant);
  const india = new Intl.DateTimeFormat('en-US', {
    timeZone: INDIA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(instant);
  return `${clinic} ${tzShortLabel(clinicTz)} · ${india} IST`;
}

export function formatDualDateTime(dateIso, timeHm, clinicTz = getClinicTimeZone()) {
  if (!dateIso || !timeHm) return '';
  const instant = clinicWallToUtc(dateIso, timeHm, clinicTz);
  const clinic = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(instant);
  const india = new Intl.DateTimeFormat('en-US', {
    timeZone: INDIA_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(instant);
  return { clinic: `${clinic} ${tzShortLabel(clinicTz)}`, india: `${india} IST` };
}

export function addMinutesHm(timeHm, minutes) {
  const [h, m] = String(timeHm).slice(0, 5).split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const mm = ((total % 60) + 60) % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

export function toMinutes(timeHm) {
  const [h, m] = String(timeHm).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}
