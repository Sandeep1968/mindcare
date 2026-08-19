import { sql } from '../db.js';
import { hasDatabase, demoState, newId, DEMO_IDS } from '../demo.js';
import { sendMail, smtpConfigured } from './mail.js';

let _ready = false;

export async function ensureMessagesSchema() {
  if (_ready || !hasDatabase()) return;
  await sql`
    CREATE TABLE IF NOT EXISTS message_threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      subject TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'general',
      channel TEXT NOT NULL DEFAULT 'portal',
      priority TEXT NOT NULL DEFAULT 'routine',
      status TEXT NOT NULL DEFAULT 'unread',
      assigned_to TEXT DEFAULT '',
      last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS message_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'portal',
      author TEXT NOT NULL DEFAULT '',
      author_role TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  _ready = true;
}

function seedDemoMessages() {
  if (demoState._messagesSeeded) return;
  demoState._messagesSeeded = true;
  if (demoState.messageThreads?.length) return;
  const alex = DEMO_IDS.patientAlex;
  const jordan = DEMO_IDS.patientJordan;
  demoState.messageThreads = [
    {
      id: newId(),
      patientId: alex,
      patientName: 'Alex Rivera',
      contact: { email: 'alex.rivera@example.com', phone: '(555) 201-4400' },
      subject: 'Running 5 minutes late',
      category: 'scheduling',
      channel: 'portal',
      priority: 'routine',
      status: 'unread',
      assignedTo: 'Maya Chen',
      lastAt: '2026-08-18T09:40:00.000Z',
      thread: [
        {
          id: newId(),
          direction: 'inbound',
          channel: 'portal',
          at: '2026-08-18T09:40:00.000Z',
          author: 'Alex Rivera',
          text: 'Traffic on the bridge — still coming. I should be there in 5 minutes.',
        },
      ],
    },
    {
      id: newId(),
      patientId: jordan,
      patientName: 'Jordan Blake',
      contact: { email: 'jordan.blake@example.com', phone: '(555) 201-4411' },
      subject: 'Insurance card upload',
      category: 'billing',
      channel: 'portal',
      priority: 'high',
      status: 'follow_up',
      assignedTo: 'Maya Chen',
      lastAt: '2026-08-17T16:05:00.000Z',
      thread: [
        {
          id: newId(),
          direction: 'inbound',
          channel: 'portal',
          at: '2026-08-17T15:20:00.000Z',
          author: 'Jordan Blake',
          text: 'Uploaded front/back of insurance card. Please confirm if anything else is needed.',
        },
        {
          id: newId(),
          direction: 'outbound',
          channel: 'portal',
          at: '2026-08-17T16:05:00.000Z',
          author: 'Maya Chen',
          text: 'Received. We are verifying benefits and will update you by tomorrow.',
        },
      ],
    },
  ];
}

function publicEvent(e) {
  return {
    id: e.id,
    direction: e.direction,
    channel: e.channel || 'portal',
    at: e.at || e.created_at,
    author: e.author,
    text: e.text || e.body,
  };
}

function mapDbThread(row, events, patient) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: patient?.name || row.patient_name || '',
    contact: { email: patient?.email || row.email || '', phone: patient?.phone || row.phone || '' },
    subject: row.subject,
    category: row.category,
    channel: row.channel,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to || '',
    lastAt: row.last_at,
    thread: (events || []).map(publicEvent),
  };
}

async function loadPatient(patientId) {
  if (!hasDatabase()) {
    return demoState.patients.find((p) => p.id === patientId) || null;
  }
  const [row] = await sql`SELECT id, name, email, phone FROM patients WHERE id = ${patientId}`;
  return row || null;
}

function portalInboxUrl() {
  const first = (process.env.CLIENT_ORIGIN || '').split(',')[0].trim();
  return `${first || 'http://localhost:5173'}/dashboard/portal/messages`;
}

/** Logistics-only ping. Never include the message body (PHI). */
async function notifyPatientNewMessage(patient) {
  if (!patient?.email) return { emailed: false };
  const clinic = process.env.CLINIC_NAME || 'MindCare Practice';
  try {
    const mail = await sendMail({
      to: patient.email,
      subject: `${clinic}: a message is waiting in your portal`,
      text: `Hello ${patient.name},\n\nYour care team posted a message in the patient portal. Sign in to read it. This email does not include the message itself.\n\n${portalInboxUrl()}\n`,
    });
    return { emailed: mail.status === 'sent' || mail.status === 'demo', smtp: smtpConfigured() };
  } catch (err) {
    console.error('message notify', err);
    return { emailed: false };
  }
}

export async function listThreads({ patientId, status } = {}) {
  if (!hasDatabase()) {
    seedDemoMessages();
    let rows = [...(demoState.messageThreads || [])];
    if (patientId) rows = rows.filter((t) => t.patientId === patientId);
    if (status && status !== 'all') rows = rows.filter((t) => t.status === status);
    return rows.sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
  }
  await ensureMessagesSchema();
  let rows;
  if (patientId) {
    rows = await sql`
      SELECT t.*, p.name AS patient_name, p.email, p.phone
      FROM message_threads t
      JOIN patients p ON p.id = t.patient_id
      WHERE t.patient_id = ${patientId}
      ORDER BY t.last_at DESC
    `;
  } else {
    rows = await sql`
      SELECT t.*, p.name AS patient_name, p.email, p.phone
      FROM message_threads t
      JOIN patients p ON p.id = t.patient_id
      ORDER BY t.last_at DESC
    `;
  }
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const events = await sql`
    SELECT * FROM message_events
    WHERE thread_id = ANY(${ids})
    ORDER BY created_at ASC
  `;
  const byThread = new Map();
  for (const e of events) {
    const list = byThread.get(e.thread_id) || [];
    list.push(e);
    byThread.set(e.thread_id, list);
  }
  return rows.map((r) => mapDbThread(r, byThread.get(r.id) || [], {
    name: r.patient_name,
    email: r.email,
    phone: r.phone,
  }));
}

export async function getThread(id) {
  const all = await listThreads();
  return all.find((t) => t.id === id) || null;
}

export async function createThread({
  patientId, subject, category, channel, priority, body, author, authorRole,
}) {
  const patient = await loadPatient(patientId);
  if (!patient) {
    const err = new Error('Patient not found');
    err.status = 404;
    throw err;
  }
  const now = new Date().toISOString();
  const isPatient = authorRole === 'patient';
  const event = {
    id: newId(),
    direction: isPatient ? 'inbound' : 'outbound',
    channel: channel || 'portal',
    at: now,
    author: author || (isPatient ? patient.name : 'Care team'),
    text: body,
  };
  const thread = {
    id: newId(),
    patientId,
    patientName: patient.name,
    contact: { email: patient.email || '', phone: patient.phone || '' },
    subject: subject.trim(),
    category: category || 'general',
    channel: channel || 'portal',
    priority: priority || 'routine',
    status: isPatient ? 'unread' : 'open',
    assignedTo: isPatient ? '' : (author || ''),
    lastAt: now,
    thread: [event],
  };

  if (!hasDatabase()) {
    seedDemoMessages();
    demoState.messageThreads.unshift(thread);
  } else {
    await ensureMessagesSchema();
    const [row] = await sql`
      INSERT INTO message_threads (
        id, patient_id, subject, category, channel, priority, status, assigned_to, last_at
      )
      VALUES (
        ${thread.id}, ${patientId}, ${thread.subject}, ${thread.category}, ${thread.channel},
        ${thread.priority}, ${thread.status}, ${thread.assignedTo}, ${now}
      )
      RETURNING *
    `;
    thread.id = row.id;
    await sql`
      INSERT INTO message_events (id, thread_id, patient_id, direction, channel, author, author_role, body, created_at)
      VALUES (
        ${event.id}, ${thread.id}, ${patientId}, ${event.direction}, ${event.channel},
        ${event.author}, ${authorRole || ''}, ${body}, ${now}
      )
    `;
  }

  let notify = { emailed: false };
  if (!isPatient) notify = await notifyPatientNewMessage(patient);
  return { ...thread, notify };
}

export async function addReply({ threadId, body, author, authorRole, patientId }) {
  const now = new Date().toISOString();
  const isPatient = authorRole === 'patient';
  const event = {
    id: newId(),
    direction: isPatient ? 'inbound' : 'outbound',
    channel: 'portal',
    at: now,
    author: author || (isPatient ? 'Patient' : 'Care team'),
    text: body,
  };

  if (!hasDatabase()) {
    seedDemoMessages();
    const idx = demoState.messageThreads.findIndex((t) => t.id === threadId);
    if (idx < 0) return null;
    const cur = demoState.messageThreads[idx];
    if (patientId && cur.patientId !== patientId) return null;
    const nextStatus = isPatient ? 'unread' : (cur.status === 'unread' ? 'open' : cur.status);
    const next = {
      ...cur,
      status: nextStatus,
      lastAt: now,
      thread: [...(cur.thread || []), event],
    };
    demoState.messageThreads[idx] = next;
    let notify = { emailed: false };
    if (!isPatient) {
      const patient = await loadPatient(cur.patientId);
      notify = await notifyPatientNewMessage(patient);
    }
    return { ...next, notify };
  }

  await ensureMessagesSchema();
  const [cur] = await sql`SELECT * FROM message_threads WHERE id = ${threadId}`;
  if (!cur) return null;
  if (patientId && cur.patient_id !== patientId) return null;
  const nextStatus = isPatient ? 'unread' : (cur.status === 'unread' ? 'open' : cur.status);
  await sql`
    INSERT INTO message_events (id, thread_id, patient_id, direction, channel, author, author_role, body, created_at)
    VALUES (
      ${event.id}, ${threadId}, ${cur.patient_id}, ${event.direction}, ${event.channel},
      ${event.author}, ${authorRole || ''}, ${body}, ${now}
    )
  `;
  await sql`
    UPDATE message_threads SET status = ${nextStatus}, last_at = ${now} WHERE id = ${threadId}
  `;
  const thread = await getThread(threadId);
  let notify = { emailed: false };
  if (!isPatient) {
    const patient = await loadPatient(cur.patient_id);
    notify = await notifyPatientNewMessage(patient);
  }
  return { ...thread, notify };
}

export async function setThreadStatus(id, status, patientId) {
  const allowed = ['unread', 'open', 'follow_up', 'resolved', 'archived'];
  if (!allowed.includes(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }
  if (!hasDatabase()) {
    seedDemoMessages();
    const idx = demoState.messageThreads.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    if (patientId && demoState.messageThreads[idx].patientId !== patientId) return null;
    demoState.messageThreads[idx] = {
      ...demoState.messageThreads[idx],
      status,
      lastAt: new Date().toISOString(),
    };
    return demoState.messageThreads[idx];
  }
  await ensureMessagesSchema();
  const [cur] = await sql`SELECT * FROM message_threads WHERE id = ${id}`;
  if (!cur) return null;
  if (patientId && cur.patient_id !== patientId) return null;
  await sql`UPDATE message_threads SET status = ${status}, last_at = now() WHERE id = ${id}`;
  return getThread(id);
}

export async function unreadCount(patientId) {
  const rows = await listThreads({ patientId });
  return rows.filter((t) => t.status === 'unread').length;
}
