/**
 * Zoom Server-to-Server OAuth + meeting create.
 * Doctor = Zoom host account (ZOOM_HOST_EMAIL). Patient joins with join_url on their own Zoom/guest.
 *
 * Env (Zoom Marketplace → Server-to-Server OAuth app):
 *   ZOOM_ACCOUNT_ID
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 *   ZOOM_HOST_EMAIL  (doctor's Zoom login email — must be on this Zoom account)
 */

let cachedToken = { accessToken: '', expiresAt: 0 };

export function zoomApiConfigured() {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID
    && process.env.ZOOM_CLIENT_ID
    && process.env.ZOOM_CLIENT_SECRET,
  );
}

export async function getZoomAccessToken() {
  if (!zoomApiConfigured()) {
    const err = new Error('Zoom API not configured');
    err.code = 'ZOOM_NOT_CONFIGURED';
    throw err;
  }
  if (cachedToken.accessToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'account_credentials',
    account_id: process.env.ZOOM_ACCOUNT_ID,
  });
  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.reason || data.error || 'Zoom OAuth failed');
    err.code = 'ZOOM_OAUTH_FAILED';
    err.details = data;
    throw err;
  }
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.accessToken;
}

let cachedHostEmail = '';

/** Doctor Zoom user on this account (env override, else first licensed/active user). */
export async function resolveZoomHostEmail() {
  if (process.env.ZOOM_HOST_EMAIL) return process.env.ZOOM_HOST_EMAIL.trim();
  if (cachedHostEmail) return cachedHostEmail;
  const token = await getZoomAccessToken();
  const me = await fetch('https://api.zoom.us/v2/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (me.ok) {
    const data = await me.json();
    if (data.email) {
      cachedHostEmail = data.email;
      return cachedHostEmail;
    }
  }
  const res = await fetch('https://api.zoom.us/v2/users?status=active&page_size=30', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Could not list Zoom users — set ZOOM_HOST_EMAIL');
    err.code = 'ZOOM_USERS_FAILED';
    throw err;
  }
  const users = data.users || [];
  const host = users.find((u) => u.type === 2 || u.type === 3) || users[0];
  if (!host?.email) {
    const err = new Error('No Zoom users on this account. Set ZOOM_HOST_EMAIL to the doctor Zoom login.');
    err.code = 'ZOOM_NO_HOST';
    throw err;
  }
  cachedHostEmail = host.email;
  return cachedHostEmail;
}

/**
 * Create a unique Zoom meeting under the doctor's Zoom user.
 * Returns start_url (doctor only) + join_url (patient / anyone with link).
 */
export async function createZoomMeeting({
  topic,
  startTimeIso,
  durationMin = 50,
  patientEmail,
  hostEmailHint,
  instant = false,
}) {
  const token = await getZoomAccessToken();
  // Server-to-Server OAuth has no current user ("me"). Create under the doctor's Zoom email.
  const hosts = [
    (process.env.ZOOM_HOST_EMAIL || '').trim(),
    (hostEmailHint || '').trim(),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  if (!hosts.length) {
    const err = new Error(
      'Zoom meeting could not start: enter the doctor Zoom login email in Video Visits and Save. That email must be a user on this Zoom account.',
    );
    err.code = 'ZOOM_NO_HOST_EMAIL';
    throw err;
  }

  const payload = {
    topic: topic || 'MindCare therapy session',
    type: instant || !startTimeIso ? 1 : 2,
    duration: durationMin || 50,
    timezone: process.env.CLINIC_TZ || 'America/New_York',
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      waiting_room: true,
      mute_upon_entry: true,
      meeting_authentication: false,
      ...(patientEmail ? { meeting_invitees: [{ email: patientEmail }] } : {}),
    },
  };
  if (payload.type === 2 && startTimeIso) payload.start_time = startTimeIso;

  let lastMessage = 'Could not create Zoom meeting';
  for (const userId of hosts) {
    const res = await fetch(
      `https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    if (res.ok && data.join_url && data.start_url) {
      return {
        meetingId: String(data.id),
        hostUrl: data.start_url,
        joinUrl: data.join_url,
        password: data.password || '',
        hostEmail: data.host_email || userId,
        mode: 'api',
      };
    }
    lastMessage = data.message || data.reason || lastMessage;
  }

  const err = new Error(
    `${lastMessage} Confirm the doctor Zoom email is a user on this Zoom account, and that the Server-to-Server app has meeting:write:meeting and meeting:write:meeting:admin scopes.`,
  );
  err.code = 'ZOOM_CREATE_FAILED';
  throw err;
}

/** Parse meeting number (+ optional pwd) from a Zoom invite / PMI link. */
export function parseZoomMeeting(url) {
  const raw = String(url || '');
  const conf = raw.match(/zoom\.us\/(?:j|s|wc\/join)\/(\d{8,15})/i)
    || raw.match(/confno=(\d{8,15})/i);
  if (!conf) return null;
  const pwdMatch = raw.match(/[?&]pwd=([\w.\-]+)/i);
  return {
    meetingId: conf[1],
    password: pwdMatch?.[1] || '',
  };
}

/**
 * Manual / PMI mode when Zoom API is not configured.
 * Doctor signs into THEIR Zoom account and starts; patient joins with THEIR account (or guest).
 */
export function zoomLinksFromClinicPmi(joinInviteUrl) {
  const parsed = parseZoomMeeting(joinInviteUrl);
  if (!parsed) return null;
  const { meetingId, password } = parsed;
  const pwdQ = password ? `?pwd=${password}` : '';
  return {
    meetingId,
    // Host starts while logged into doctor's Zoom account
    hostUrl: `https://zoom.us/s/${meetingId}${pwdQ}`,
    joinUrl: joinInviteUrl.includes('/j/')
      ? joinInviteUrl
      : `https://zoom.us/j/${meetingId}${pwdQ}`,
    password,
    mode: 'pmi',
  };
}

export function zoomHostDeepLink(meetingId) {
  if (!meetingId) return null;
  return `zoommtg://zoom.us/start?confno=${meetingId}`;
}

export function zoomJoinDeepLink(meetingId, password) {
  if (!meetingId) return null;
  return `zoommtg://zoom.us/join?action=join&confno=${meetingId}${password ? `&pwd=${password}` : ''}`;
}
