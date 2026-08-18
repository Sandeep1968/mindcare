import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { demoState, newId } from '../demo.js';

function ensureOutbox() {
  if (!demoState.emailOutbox) demoState.emailOutbox = [];
  return demoState.emailOutbox;
}

function smtpPass() {
  return String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.SMTP_USER && smtpPass());
}

/** Extract bare email from `"Name" <a@b.com>` or `a@b.com`. */
export function parseEmailAddress(value) {
  const raw = String(value || '').trim();
  const bracket = raw.match(/<([^>]+)>/);
  if (bracket) return bracket[1].trim().toLowerCase();
  const plain = raw.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return plain ? plain[0].toLowerCase() : '';
}

/** Display name from a From header, if present. */
export function parseDisplayName(value) {
  const raw = String(value || '').trim();
  const m = raw.match(/^(.+?)\s*<[^>]+>$/);
  if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  return process.env.CLINIC_FROM_NAME || process.env.CLINIC_NAME || 'MindCare';
}

/** Reply-To for patient/staff replies — defaults to the authenticated SMTP mailbox. */
export function defaultReplyTo() {
  return (
    process.env.CLINIC_REPLY_TO?.trim()
    || parseEmailAddress(process.env.SMTP_FROM)
    || process.env.SMTP_USER?.trim()
    || ''
  );
}

/** Gmail requires the From address to match SMTP_USER or deliverability suffers. */
export function alignFromHeader(from = process.env.SMTP_FROM) {
  const authUser = process.env.SMTP_USER?.trim().toLowerCase();
  const fromEmail = parseEmailAddress(from);
  const display = parseDisplayName(from);
  if (authUser) {
    if (!fromEmail || fromEmail !== authUser) {
      return `${display} <${authUser}>`;
    }
    return from.includes('<') ? from : `${display} <${authUser}>`;
  }
  return from || 'MindCare <noreply@mindcare.local>';
}

/** Organizer / ICS identity should match the authenticated sender. */
export function organizerEmail() {
  return process.env.SMTP_USER?.trim() || parseEmailAddress(process.env.SMTP_FROM) || 'noreply@mindcare.local';
}

export function clinicContactLine() {
  const bits = [process.env.CLINIC_NAME || 'MindCare Practice'];
  if (process.env.CLINIC_PHONE) bits.push(process.env.CLINIC_PHONE);
  const reply = defaultReplyTo();
  if (reply) bits.push(reply);
  return bits.join(' · ');
}

function getTransport() {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass(),
    },
  });
}

function icsMethod(icsContent) {
  const match = String(icsContent || '').match(/METHOD:([A-Z]+)/i);
  return match ? match[1].toUpperCase() : 'REQUEST';
}

function buildMessageId() {
  const domain = parseEmailAddress(process.env.SMTP_USER) || parseEmailAddress(process.env.SMTP_FROM) || 'mindcare.local';
  return `<${Date.now()}.${randomBytes(8).toString('hex')}@${domain.split('@')[1] || domain}>`;
}

/**
 * Send email (real SMTP when configured) or store in demo outbox.
 * Never put clinical content in subject/body — logistics only.
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  icsContent,
  icsFilename = 'appointment.ics',
  attachments = [],
  replyTo,
  headers = {},
}) {
  const from = alignFromHeader();
  const reply = replyTo || defaultReplyTo();
  const authUser = process.env.SMTP_USER?.trim();
  const entry = {
    id: newId(),
    to,
    from,
    replyTo: reply || null,
    subject,
    text,
    html: html || null,
    hasIcs: Boolean(icsContent),
    createdAt: new Date().toISOString(),
    mode: smtpConfigured() ? 'smtp' : 'demo',
    status: 'queued',
  };

  const transport = getTransport();
  if (transport) {
    try {
      const mail = {
        from,
        to,
        subject,
        text,
        messageId: buildMessageId(),
        headers: {
          ...(reply ? { 'Reply-To': reply } : {}),
          'X-Auto-Response-Suppress': 'All',
          ...headers,
        },
      };

      if (html) mail.html = html;
      if (reply) mail.replyTo = reply;
      if (authUser) mail.envelope = { from: authUser, to: Array.isArray(to) ? to : [to] };

      if (icsContent) {
        const method = icsMethod(icsContent);
        mail.alternatives = [
          {
            contentType: `text/calendar; charset=UTF-8; method=${method}`,
            content: icsContent,
            contentDisposition: 'inline',
          },
        ];
        mail.attachments = [
          {
            filename: icsFilename,
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8',
          },
          ...attachments,
        ];
      } else if (attachments.length) {
        mail.attachments = attachments;
      }

      const info = await transport.sendMail(mail);
      entry.status = 'sent';
      entry.messageId = info.messageId;
    } catch (err) {
      entry.status = 'failed';
      entry.error = err.message;
      ensureOutbox().unshift(entry);
      throw err;
    }
  } else {
    entry.status = 'demo';
    entry.icsPreview = icsContent ? icsContent.slice(0, 400) : null;
  }

  ensureOutbox().unshift(entry);
  if (ensureOutbox().length > 100) ensureOutbox().length = 100;
  return entry;
}

export function listOutbox(limit = 40) {
  return ensureOutbox().slice(0, limit);
}
