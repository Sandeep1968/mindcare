import nodemailer from 'nodemailer';
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

/**
 * Send email (real SMTP when configured) or store in demo outbox.
 * Never put clinical content in subject/body — logistics only.
 */
export async function sendMail({ to, subject, text, html, icsContent, icsFilename = 'mindcare-appointment.ics', attachments = [] }) {
  const from = process.env.SMTP_FROM || 'MindCare <noreply@mindcare.local>';
  const entry = {
    id: newId(),
    to,
    from,
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
      const info = await transport.sendMail({
        from,
        to,
        subject,
        text,
        html,
        attachments: [
          ...(icsContent
            ? [
                {
                  filename: icsFilename,
                  content: icsContent,
                  contentType: 'text/calendar; charset=utf-8; method=REQUEST',
                },
              ]
            : []),
          ...attachments,
        ],
      });
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
