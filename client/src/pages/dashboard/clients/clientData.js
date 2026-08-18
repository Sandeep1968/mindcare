/** Client 360 aggregation helpers — read existing module stores; do not duplicate source records. */

import {
  loadInvoices,
  invoicesForClient,
  clientOutstanding,
  invoiceStatus as invStatus,
  cacheInvoices,
  fetchInvoices,
} from './billingStore';

export const CARE_TYPES = [
  'Individual Therapy',
  'Couples Therapy',
  'Family Therapy',
  'Group Therapy',
  'Other',
];

export const THERAPISTS = ['Dr. Sarah Williams', 'Dr. Emily Chen'];

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say', 'Other'];

export const FREQUENCIES = ['Weekly', 'Biweekly', 'Monthly', 'As needed'];

export const PRESENTING_CONCERNS = [
  'Anxiety & Stress',
  'Depression & Mood',
  'Relationships',
  'Trauma & Recovery',
  'Life Transitions',
  'Grief & Loss',
  'ADHD / Focus',
  'Personal Growth',
  'General / Not sure yet',
];

export function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function canViewBilling(role) {
  return role === 'admin' || role === 'staff' || role === 'practitioner';
}

export function canViewClinical(role) {
  return role === 'admin' || role === 'practitioner';
}

export function canEditClients(role) {
  return role === 'admin' || role === 'staff' || role === 'practitioner';
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

export function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLongDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(t) {
  if (!t) return '';
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getBillingRows() {
  return loadInvoices();
}

export async function refreshBillingCache(patientId) {
  try {
    const rows = await fetchInvoices(patientId ? { patientId } : {});
    if (patientId) {
      const all = loadInvoices().filter((i) => i.patientId !== patientId);
      cacheInvoices([...rows, ...all]);
      return rows;
    }
    cacheInvoices(rows);
    return rows;
  } catch {
    return loadInvoices();
  }
}

export function ensureClientDemoStores(clients) {
  const notes = readLocal('mindcare.demo.notes', []);
  if (!notes.length && clients?.length) {
    const alex = clients.find((c) => c.name === 'Alex Rivera');
    if (alex) {
      writeLocal('mindcare.demo.notes', [
        {
          id: 'n-seed-1',
          patientId: alex.id,
          patientName: alex.name,
          symptoms: 'Anxiety',
          diagnosis: 'Follow-up',
          body: 'Client reported improved sleep. Continued CBT skills practice. DAP note documented.',
          date: '2026-08-14',
          type: 'DAP',
        },
        {
          id: 'n-seed-2',
          patientId: alex.id,
          patientName: alex.name,
          symptoms: 'Anxiety',
          diagnosis: 'Progress review',
          body: 'Reviewed coping strategies. Client engaged well.',
          date: '2026-08-07',
          type: 'DAP',
        },
      ]);
    }
  }

  const plans = readLocal('mindcare.demo.plans', []);
  if (!plans.length && clients?.length) {
    const alex = clients.find((c) => c.name === 'Alex Rivera');
    if (alex) {
      writeLocal('mindcare.demo.plans', [
        {
          id: 'p-seed-1',
          client: alex.name,
          patientId: alex.id,
          goal: 'Reduce anxiety',
          focus: 'CBT · coping skills',
          status: 'active',
          updated: '2026-08-01',
          created: '2026-06-05',
          review: '2026-09-01',
          goals: [
            { text: 'Reduce anxiety', status: 'In Progress' },
            { text: 'Improve coping strategies', status: 'In Progress' },
            { text: 'Improve sleep routine', status: 'Improving' },
          ],
        },
      ]);
    }
  }

  const forms = readLocal('mindcare.demo.clientForms', null);
  if (!forms) {
    writeLocal('mindcare.demo.clientForms', [
      { id: 'f1', patientId: 'a2000002-0000-4000-8000-000000000001', name: 'Intake Form', status: 'Completed', date: '2026-05-12' },
      { id: 'f2', patientId: 'a2000002-0000-4000-8000-000000000001', name: 'Consent Form', status: 'Completed', date: '2026-05-12' },
      { id: 'f3', patientId: 'a2000002-0000-4000-8000-000000000001', name: 'Privacy Acknowledgement', status: 'Completed', date: '2026-05-12' },
      { id: 'f4', patientId: 'a2000002-0000-4000-8000-000000000001', name: 'PHQ-9 Screening', status: 'Needs Review', date: '2026-08-01' },
      { id: 'f5', patientId: 'a2000002-0000-4000-8000-000000000002', name: 'Intake Form', status: 'Pending', date: '2026-06-01' },
      { id: 'f6', patientId: 'a2000002-0000-4000-8000-000000000003', name: 'Intake Form', status: 'Pending', date: todayIso() },
    ]);
  }

  const meds = readLocal('mindcare.demo.medications', null);
  if (!meds) {
    writeLocal('mindcare.demo.medications', [
      {
        id: 'm1',
        patientId: 'a2000002-0000-4000-8000-000000000001',
        name: 'Sertraline 50mg',
        status: 'current',
        start: '2026-06-12',
        end: '',
        provider: 'External PCP',
        updated: '2026-07-18',
      },
      {
        id: 'm2',
        patientId: 'a2000002-0000-4000-8000-000000000001',
        name: 'Hydroxyzine 25mg PRN',
        status: 'previous',
        start: '2026-05-20',
        end: '2026-06-10',
        provider: 'External PCP',
        updated: '2026-06-10',
      },
    ]);
  }

  const adminNotes = readLocal('mindcare.demo.adminNotes', null);
  if (!adminNotes) {
    writeLocal('mindcare.demo.adminNotes', [
      { id: 'a1', patientId: 'a2000002-0000-4000-8000-000000000001', text: 'Client prefers evening appointments.', date: '2026-05-12', author: 'Maya Chen' },
      { id: 'a2', patientId: 'a2000002-0000-4000-8000-000000000001', text: 'Client requested virtual sessions.', date: '2026-05-14', author: 'Maya Chen' },
    ]);
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function billingForClient(client) {
  return invoicesForClient(client, loadInvoices());
}

export function outstandingBalance(client) {
  return clientOutstanding(client, loadInvoices());
}

/**
 * Load the shared caches needed by attentionFlags/lastVisit/nextAppointment
 * once, then pass the result to each per-client call. Avoids re-reading
 * localStorage on every patient row in the list.
 */
export function loadAttentionCaches() {
  return {
    invoices: loadInvoices(),
    forms: readLocal('mindcare.demo.clientForms', []),
    plans: readLocal('mindcare.demo.plans', []),
  };
}

export function attentionFlags(client, appointments = [], caches = null) {
  /* Accept pre-loaded caches from loadAttentionCaches() to avoid
     repeated localStorage reads when called in a loop over patients. */
  const inv   = caches?.invoices ?? loadInvoices();
  const forms = caches?.forms   ?? readLocal('mindcare.demo.clientForms', []);
  const plans = caches?.plans   ?? readLocal('mindcare.demo.plans', []);

  const flags = [];
  const bal = clientOutstanding(client, inv);
  if (bal > 0) flags.push({ key: 'payment', label: 'Payment' });

  const clientForms = forms.filter((f) => f.patientId === client.id);
  if (clientForms.some((f) => f.status === 'Pending' || f.status === 'Needs Review')) {
    flags.push({ key: 'forms', label: 'Forms' });
  }

  const clientPlans = plans.filter(
    (p) => p.patientId === client.id || p.client === client.name,
  );
  const active = clientPlans.find((p) => p.status === 'active');
  if (active?.review) {
    const review = new Date(`${active.review}T12:00:00`);
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    if (review <= soon) flags.push({ key: 'plan', label: 'Plan review' });
  }

  const today = todayIso();
  const upcoming = appointments
    .filter((a) => {
      const pid = a.patient_id || a.patientId;
      return pid === client.id && ['confirmed', 'pending'].includes(a.status);
    })
    .sort((a, b) => `${a.appt_date || a.date}${a.appt_time || a.time}`.localeCompare(`${b.appt_date || b.date}${b.appt_time || b.time}`));
  if (upcoming[0]) {
    const d = upcoming[0].appt_date || upcoming[0].date;
    if (d === today) flags.push({ key: 'appt', label: 'Today' });
  }

  if (client.status === 'new') flags.push({ key: 'intake', label: 'Intake' });
  if (!client.emergency && !client.emergency_phone) flags.push({ key: 'safety', label: 'No emergency contact' });

  const hasUpcoming = appointments.some((a) => {
    const pid = a.patient_id || a.patientId;
    const d = a.appt_date || a.date;
    return pid === client.id && d >= today && !['cancelled', 'declined', 'completed', 'no-show'].includes(a.status);
  });
  if ((client.status || 'active') === 'active' && !hasUpcoming) {
    flags.push({ key: 'gap', label: 'Needs scheduling' });
  }

  return flags;
}

export function lastVisit(client, appointments = []) {
  const today = todayIso();
  const past = appointments
    .filter((a) => {
      const pid = a.patient_id || a.patientId;
      const d = a.appt_date || a.date;
      if (pid !== client.id || !d || d > today) return false;
      if (['cancelled', 'declined'].includes(a.status)) return false;
      return true;
    })
    .map((a) => a.appt_date || a.date)
    .filter(Boolean)
    .sort()
    .reverse();
  return past[0] || null;
}

export function nextAppointment(client, appointments = []) {
  const today = todayIso();
  const upcoming = appointments
    .filter((a) => {
      const pid = a.patient_id || a.patientId;
      const d = a.appt_date || a.date;
      return pid === client.id && d >= today && !['cancelled', 'declined', 'completed', 'no-show'].includes(a.status);
    })
    .sort((a, b) => `${a.appt_date || a.date}${a.appt_time || a.time}`.localeCompare(`${b.appt_date || b.date}${b.appt_time || b.time}`));
  return upcoming[0] || null;
}

export function inLastVisitRange(dateIso, range) {
  if (range === 'any' || !dateIso) return range === 'any' ? true : false;
  if (!dateIso && range !== 'any') return false;
  const d = new Date(`${dateIso}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.floor((today - d) / 86400000);
  if (range === 'today') return diff === 0;
  if (range === 'week') return diff >= 0 && diff <= 7;
  if (range === 'month') return diff >= 0 && diff <= 31;
  if (range === 'older') return diff > 31;
  return true;
}

export function buildCareJourney(client, { appointments = [], role }) {
  const events = [];
  const clinical = canViewClinical(role);
  const billing = canViewBilling(role);

  if (client.created_at || client.care_started) {
    events.push({
      id: 'created',
      date: (client.care_started || client.created_at || '').slice(0, 10),
      category: 'admin',
      title: 'Client Intake',
      detail: 'Initial intake completed',
      href: null,
    });
  }

  appointments
    .filter((a) => (a.patient_id || a.patientId) === client.id)
    .forEach((a) => {
      const completed = a.status === 'completed';
      events.push({
        id: `appt-${a.id}`,
        date: a.appt_date || a.date,
        category: completed ? 'sessions' : 'appointments',
        title: completed ? 'Therapy Session' : 'Appointment',
        detail: a.reason || a.session_type || 'Visit',
        href: `/dashboard/appointments`,
        meta: a,
      });
    });

  if (clinical) {
    readLocal('mindcare.demo.notes', [])
      .filter((n) => n.patientId === client.id)
      .forEach((n) => {
        events.push({
          id: `note-${n.id}`,
          date: n.date,
          category: 'sessions',
          title: 'Clinical Note',
          detail: n.diagnosis || n.type || 'Session documentation',
          href: '/dashboard/clinical/notes',
        });
      });

    readLocal('mindcare.demo.plans', [])
      .filter((p) => p.patientId === client.id || p.client === client.name)
      .forEach((p) => {
        events.push({
          id: `plan-${p.id}`,
          date: p.created || p.updated,
          category: 'plans',
          title: 'Treatment Plan',
          detail: p.status === 'active' ? 'Treatment plan created' : 'Treatment plan updated',
          href: '/dashboard/clinical/plans',
        });
        if (p.updated && p.updated !== p.created) {
          events.push({
            id: `plan-u-${p.id}`,
            date: p.updated,
            category: 'plans',
            title: 'Treatment Plan Updated',
            detail: p.goal || 'Goals reviewed',
            href: '/dashboard/clinical/plans',
          });
        }
      });

    readLocal('mindcare.demo.medications', [])
      .filter((m) => m.patientId === client.id)
      .forEach((m) => {
        events.push({
          id: `med-${m.id}`,
          date: m.updated || m.start,
          category: 'medications',
          title: 'Medication Record',
          detail: 'Medication information updated',
          href: null,
        });
      });
  }

  readLocal('mindcare.demo.clientForms', [])
    .filter((f) => f.patientId === client.id && f.status === 'Completed')
    .forEach((f) => {
      events.push({
        id: `form-${f.id}`,
        date: f.date,
        category: 'forms',
        title: 'Form Completed',
        detail: f.name,
        href: '/dashboard/clinical/forms',
      });
    });

  if (billing) {
    billingForClient(client).forEach((b) => {
      const st = invStatus(b);
      events.push({
        id: `bill-${b.id}`,
        date: b.date,
        category: 'billing',
        title: 'Billing Event',
        detail: `${b.description || b.note || 'Charge'} · $${b.amount} · ${st}`,
        href: '/dashboard/billing',
      });
    });
  }

  readLocal('mindcare.demo.adminNotes', [])
    .filter((n) => n.patientId === client.id)
    .forEach((n) => {
      events.push({
        id: `admin-${n.id}`,
        date: n.date,
        category: 'notes',
        title: 'Administrative Note',
        detail: n.text,
        href: null,
      });
    });

  return events
    .filter((e) => e.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function avatarColor(name = '') {
  const colors = ['#003e7e', '#c48900', '#2f5d8c', '#8a6a1a', '#4279b0'];
  let n = 0;
  for (let i = 0; i < name.length; i += 1) n += name.charCodeAt(i);
  return colors[n % colors.length];
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function statusLabel(s) {
  if (s === 'new') return 'Intake';
  if (s === 'inactive') return 'On hold / discharged';
  if (!s) return 'Active in care';
  if (s === 'active') return 'Active in care';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function visitKindLabel(apptOrPref) {
  const v = apptOrPref?.type || apptOrPref?.session_type || apptOrPref || '';
  if (v === 'in-person' || v === 'In-person') return 'In-person';
  if (v === 'video' || v === 'Virtual' || v === 'Either') return 'Zoom';
  return String(v || 'Zoom');
}
