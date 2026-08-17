/** Shared video room helpers — Zoom is the clinic default; Jitsi remains optional. */

import { sql } from '../db.js';
import { hasDatabase, demoState } from '../demo.js';
import {
  createZoomMeeting,
  parseZoomMeeting,
  zoomApiConfigured,
  zoomLinksFromClinicPmi,
} from './zoom.js';

export const DEFAULT_VIDEO_PROVIDER = 'zoom';

export async function getClinicVideoSettings() {
  if (!hasDatabase()) {
    if (!demoState.settings) demoState.settings = {};
    if (!demoState.settings.video_provider) demoState.settings.video_provider = DEFAULT_VIDEO_PROVIDER;
    if (!demoState.settings.zoom_host_email) {
      demoState.settings.zoom_host_email = process.env.ZOOM_HOST_EMAIL || '';
    }
    return demoState.settings;
  }
  const [row] = await sql`SELECT * FROM clinic_settings WHERE id = 1`;
  const settings = row || {};
  if (!settings.video_provider) settings.video_provider = DEFAULT_VIDEO_PROVIDER;
  if (!settings.zoom_host_email) settings.zoom_host_email = process.env.ZOOM_HOST_EMAIL || '';
  return settings;
}

export async function persistAppointmentMeeting(apptId, meeting) {
  if (!apptId || !meeting?.joinUrl) return;
  if (!hasDatabase()) {
    const a = demoState.appointments.find((x) => x.id === apptId);
    if (a) {
      a.video_link = meeting.joinUrl;
      a.video_host_link = meeting.hostUrl || '';
    }
    return;
  }
  await sql`
    UPDATE appointments
    SET video_link = ${meeting.joinUrl},
        video_host_link = ${meeting.hostUrl || ''}
    WHERE id = ${apptId}
  `;
}

export function jitsiRoomUrl(seed = 'session') {
  const slug = String(seed)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'session';
  return `https://meet.jit.si/MindCare-${slug}`;
}

export function isZoomUrl(url) {
  return /^https:\/\/([\w-]+\.)*zoom\.us\//i.test(String(url || ''));
}

export function isJitsiUrl(url) {
  return /meet\.jit\.si\//i.test(String(url || ''));
}

/**
 * Resolve meeting links for a visit.
 * Zoom always returns DIFFERENT hostUrl (doctor account) vs joinUrl (patient account/guest).
 */
export async function resolveMeeting({
  settings,
  appointment,
  patient,
  forceFresh = false,
  role = 'host',
} = {}) {
  const provider = settings?.video_provider || settings?.provider || DEFAULT_VIDEO_PROVIDER;
  const apptId = appointment?.id;
  const existingJoin = appointment?.video_link || '';
  const existingHost = appointment?.video_host_link || '';

  if (provider === 'zoom') {
    const hostCanStart = Boolean(existingHost && String(existingHost).includes('zak='));
    if (!forceFresh && existingJoin && isZoomUrl(existingJoin) && (role === 'patient' || hostCanStart)) {
      const parsed = parseZoomMeeting(existingJoin);
      const hostUrl = existingHost || (parsed ? `https://zoom.us/s/${parsed.meetingId}` : existingJoin);
      return {
        provider: 'zoom',
        hostUrl,
        joinUrl: existingJoin,
        meetingId: parsed?.meetingId || '',
        mode: hostCanStart ? 'api' : 'pmi',
        link: role === 'patient' ? existingJoin : hostUrl,
      };
    }

    // Create unique meeting under doctor's Zoom user (both accounts supported)
    if (zoomApiConfigured()) {
      try {
        const isInstant = !appointment?.appt_date || String(appointment.id || '').startsWith('instant-');
        const datePart = appointment?.appt_date ? String(appointment.appt_date).slice(0, 10) : '';
        const timePart = appointment?.appt_time ? String(appointment.appt_time).slice(0, 5) : '';
        const created = await createZoomMeeting({
          topic: `MindCare · ${patient?.name || 'Client'}`,
          startTimeIso: !isInstant && datePart && timePart ? `${datePart}T${timePart}:00` : undefined,
          durationMin: appointment?.duration_min || appointment?.duration || 50,
          patientEmail: patient?.email || undefined,
          hostEmailHint: settings?.zoom_host_email || settings?.zoomHostEmail || '',
          instant: isInstant,
        });
        return {
          provider: 'zoom',
          hostUrl: created.hostUrl,
          joinUrl: created.joinUrl,
          meetingId: created.meetingId,
          mode: 'api',
          link: role === 'patient' ? created.joinUrl : created.hostUrl,
        };
      } catch (err) {
        if (!settings?.zoom_link && !settings?.zoomLink) {
          return {
            provider: 'zoom',
            hostUrl: '',
            joinUrl: '',
            meetingId: '',
            mode: 'missing',
            link: '',
            error: err.message || 'Zoom could not create a meeting. Set doctor Zoom email in Video Visits.',
          };
        }
        console.warn('Zoom API create failed, falling back to PMI:', err.message);
      }
    }

    const pmi = settings?.zoom_link || settings?.zoomLink || '';
    const fromPmi = zoomLinksFromClinicPmi(pmi);
    if (fromPmi) {
      return {
        provider: 'zoom',
        hostUrl: fromPmi.hostUrl,
        joinUrl: fromPmi.joinUrl,
        meetingId: fromPmi.meetingId,
        mode: 'pmi',
        link: role === 'patient' ? fromPmi.joinUrl : fromPmi.hostUrl,
      };
    }

    return {
      provider: 'zoom',
      hostUrl: '',
      joinUrl: '',
      meetingId: '',
      mode: 'missing',
      link: '',
      error: 'Add Zoom Personal Meeting invite link in Video Visits settings, or configure ZOOM_* API keys.',
    };
  }

  // Jitsi — same room URL for both (browser, no accounts required)
  let joinUrl = existingJoin;
  if (forceFresh || !joinUrl || isZoomUrl(joinUrl) || !isJitsiUrl(joinUrl)) {
    joinUrl = jitsiRoomUrl(apptId || patient?.name || Date.now().toString(36));
  }
  return {
    provider: 'jitsi',
    hostUrl: joinUrl,
    joinUrl,
    meetingId: '',
    mode: 'jitsi',
    link: joinUrl,
  };
}

/** @deprecated prefer resolveMeeting — kept for simple callers */
export function resolveVideoLink(settings, opts = {}) {
  const provider = settings?.video_provider || settings?.provider || DEFAULT_VIDEO_PROVIDER;
  if (provider === 'zoom') {
    const zoom = settings?.zoom_link || settings?.zoomLink || '';
    return zoom || '';
  }
  if (opts.forceFresh || !opts.existingLink || isZoomUrl(opts.existingLink) || !isJitsiUrl(opts.existingLink)) {
    return jitsiRoomUrl(opts.appointmentId || opts.patientName || Date.now().toString(36));
  }
  return opts.existingLink;
}

export function mapSettings(row) {
  return {
    clinicName: row.clinic_name || 'MindCare Practice',
    provider: row.video_provider || DEFAULT_VIDEO_PROVIDER,
    zoomLink: row.zoom_link || '',
    zoomHostEmail: row.zoom_host_email || process.env.ZOOM_HOST_EMAIL || '',
    zoomApiReady: zoomApiConfigured(),
    waitingMessage:
      row.waiting_message ||
      'Your therapist will join shortly. Find a quiet, private space and use headphones if you can.',
  };
}
