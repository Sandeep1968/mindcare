import { randomBytes } from 'crypto';
import { sql } from '../db.js';
import { hasDatabase, demoState, newId, DEMO_USERS } from '../demo.js';
import { sendMail, smtpConfigured } from './mail.js';

let _ready = false;

export async function ensureInviteSchema() {
  if (_ready || !hasDatabase()) return;
  await sql`
    CREATE TABLE IF NOT EXISTS portal_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'invite',
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  _ready = true;
}

function clientOrigin() {
  const first = (process.env.CLIENT_ORIGIN || '').split(',')[0].trim();
  return first || 'http://localhost:5173';
}

export function portalSetPasswordUrl(token, purpose) {
  const key = purpose === 'reset' ? 'reset' : 'invite';
  return `${clientOrigin()}/dashboard/login?intent=patient&${key}=${encodeURIComponent(token)}`;
}

function expiresAt(purpose) {
  const ms = purpose === 'reset' ? 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

function seedInvites() {
  if (!demoState.portalInvites) demoState.portalInvites = [];
}

export async function hasPortalLogin(patientId) {
  if (!hasDatabase()) {
    return DEMO_USERS.some((u) => u.role === 'patient' && u.patient_id === patientId);
  }
  const [row] = await sql`SELECT id FROM users WHERE patient_id = ${patientId} AND role = 'patient' LIMIT 1`;
  return Boolean(row);
}

export async function createPortalInvite(patient, purpose = 'invite') {
  const token = randomBytes(24).toString('base64url');
  const exp = expiresAt(purpose);
  if (!hasDatabase()) {
    seedInvites();
    demoState.portalInvites = (demoState.portalInvites || []).filter(
      (i) => !(i.patientId === patient.id && i.purpose === purpose && !i.usedAt),
    );
    const row = {
      id: newId(),
      patientId: patient.id,
      token,
      purpose,
      expiresAt: exp.toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    demoState.portalInvites.unshift(row);
    return row;
  }
  await ensureInviteSchema();
  await sql`
    UPDATE portal_invites SET used_at = now()
    WHERE patient_id = ${patient.id} AND purpose = ${purpose} AND used_at IS NULL
  `;
  const [row] = await sql`
    INSERT INTO portal_invites (patient_id, token, purpose, expires_at)
    VALUES (${patient.id}, ${token}, ${purpose}, ${exp.toISOString()})
    RETURNING *
  `;
  return {
    id: row.id,
    patientId: row.patient_id,
    token: row.token,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

export async function peekInvite(token) {
  if (!token) return null;
  if (!hasDatabase()) {
    seedInvites();
    const row = (demoState.portalInvites || []).find((i) => i.token === token);
    if (!row || row.usedAt || new Date(row.expiresAt) < new Date()) return null;
    const patient = demoState.patients.find((p) => p.id === row.patientId);
    if (!patient) return null;
    return { ...row, email: patient.email, name: patient.name };
  }
  await ensureInviteSchema();
  const [row] = await sql`
    SELECT i.*, p.email, p.name
    FROM portal_invites i
    JOIN patients p ON p.id = i.patient_id
    WHERE i.token = ${token}
    LIMIT 1
  `;
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    token: row.token,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    email: row.email,
    name: row.name,
  };
}

export async function consumeInvite(token) {
  const found = await peekInvite(token);
  if (!found) return null;
  if (!hasDatabase()) {
    const row = demoState.portalInvites.find((i) => i.token === token);
    if (row) row.usedAt = new Date().toISOString();
    return found;
  }
  await sql`UPDATE portal_invites SET used_at = now() WHERE token = ${token}`;
  return found;
}

export async function sendPortalInviteEmail(patient, invite) {
  const url = portalSetPasswordUrl(invite.token, invite.purpose);
  const clinic = process.env.CLINIC_NAME || 'MindCare Practice';
  const isReset = invite.purpose === 'reset';
  const subject = isReset
    ? `${clinic} portal password reset`
    : `${clinic} patient portal — set your password`;
  const text = isReset
    ? `Hello ${patient.name},\n\nUse this link to set a new patient portal password. It expires in 24 hours.\n\n${url}\n\nIf you did not request this, you can ignore this email.\n`
    : `Hello ${patient.name},\n\nYour care team at ${clinic} created a patient portal for you. Use this link to choose your password (valid for 14 days):\n\n${url}\n\nYou will need the email on file with the clinic.\n`;
  try {
    const mail = await sendMail({ to: patient.email, subject, text });
    return { emailed: mail.status === 'sent' || mail.status === 'demo', mode: mail.mode, status: mail.status };
  } catch (err) {
    console.error('portal invite email', err);
    return { emailed: false, error: err.message };
  }
}

export async function issuePortalInvite(patient, purpose = 'invite') {
  if (!patient?.email) {
    const err = new Error('Patient email is required for a portal invite');
    err.status = 400;
    throw err;
  }
  const invite = await createPortalInvite(patient, purpose);
  const mail = await sendPortalInviteEmail(patient, invite);
  return {
    inviteUrl: portalSetPasswordUrl(invite.token, purpose),
    emailed: Boolean(mail.emailed),
    smtp: smtpConfigured(),
    expiresAt: invite.expiresAt,
    purpose,
  };
}

export async function portalStatus(patientId) {
  const hasLogin = await hasPortalLogin(patientId);
  return { hasLogin };
}
