import { sql } from '../db.js';
import { hasDatabase, demoState, newId, DEMO_IDS } from '../demo.js';
import { toDateIso } from './dates.js';

let _ready = false;

export async function ensureClinicalSchema() {
  if (_ready || !hasDatabase()) return;
  await sql`ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'DAP'`;
  await sql`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      goal TEXT NOT NULL DEFAULT '',
      focus TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      review_date DATE,
      goals_json TEXT DEFAULT '[]',
      created_at DATE NOT NULL DEFAULT CURRENT_DATE,
      updated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS patient_forms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      form_key TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      form_date DATE NOT NULL DEFAULT CURRENT_DATE,
      signed_name TEXT DEFAULT '',
      signed_at TIMESTAMPTZ
    )`;
  await sql`ALTER TABLE patient_forms ADD COLUMN IF NOT EXISTS signed_name TEXT DEFAULT ''`;
  await sql`ALTER TABLE patient_forms ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ`;
  await sql`
    CREATE TABLE IF NOT EXISTS medications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'current',
      start_date DATE,
      end_date DATE,
      provider TEXT DEFAULT '',
      updated_at DATE NOT NULL DEFAULT CURRENT_DATE
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS assigned_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      assessment_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
      completed_at DATE,
      assigned_by TEXT DEFAULT ''
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      author TEXT DEFAULT '',
      note_date DATE NOT NULL DEFAULT CURRENT_DATE
    )`;
  _ready = true;
}

function seedDemoClinical() {
  if (demoState._clinicalSeeded) return;
  demoState._clinicalSeeded = true;
  const alex = DEMO_IDS.patientAlex;
  const jordan = DEMO_IDS.patientJordan;
  demoState.notes = demoState.notes || [
    {
      id: newId(),
      patientId: alex,
      patientName: 'Alex Rivera',
      symptoms: 'Anxiety',
      diagnosis: 'Follow-up',
      body: 'Client reported improved sleep. Continued CBT skills practice.',
      date: '2026-08-14',
      type: 'DAP',
    },
  ];
  demoState.plans = demoState.plans || [
    {
      id: newId(),
      patientId: alex,
      client: 'Alex Rivera',
      goal: 'Reduce anxiety',
      focus: 'CBT · coping skills',
      status: 'active',
      updated: '2026-08-01',
      created: '2026-06-05',
      review: '2026-09-01',
      goals: [
        { text: 'Reduce anxiety', status: 'In Progress' },
        { text: 'Improve coping strategies', status: 'In Progress' },
      ],
    },
  ];
  demoState.forms = demoState.forms || [
    { id: newId(), patientId: alex, name: 'Intake Form', status: 'Completed', date: '2026-05-12', formKey: 'intake' },
    { id: newId(), patientId: alex, name: 'Informed consent', status: 'Completed', date: '2026-05-12', formKey: 'consent' },
    { id: newId(), patientId: jordan, name: 'Intake Form', status: 'Pending', date: '2026-06-01', formKey: 'intake' },
  ];
  demoState.medications = demoState.medications || [
    {
      id: newId(),
      patientId: alex,
      name: 'Sertraline 50mg',
      status: 'current',
      start: '2026-06-12',
      end: '',
      provider: 'External PCP',
      updated: '2026-07-18',
    },
  ];
  demoState.assessments = demoState.assessments || [
    {
      id: newId(),
      assessmentId: 'anxiety',
      name: 'Anxiety check-in',
      cat: 'Mental health',
      status: 'pending',
      assignedAt: '2026-08-12',
      patientId: alex,
      patientName: 'Alex Rivera',
      assignedBy: 'Dr. Sarah Williams',
    },
  ];
  demoState.adminNotes = demoState.adminNotes || [
    { id: newId(), patientId: alex, text: 'Client prefers evening appointments.', date: '2026-05-12', author: 'Maya Chen' },
  ];
}

function patientName(id) {
  return demoState.patients.find((p) => p.id === id)?.name || '';
}

export function mapNote(row, name = '') {
  return {
    id: row.id,
    patientId: row.patient_id || row.patientId,
    patientName: row.patient_name || row.patientName || name,
    symptoms: row.symptoms || '',
    diagnosis: row.diagnosis || '',
    body: row.body || row.notes || '',
    date: toDateIso(row.record_date || row.date),
    type: row.note_type || row.type || 'DAP',
  };
}

export function mapPlan(row, name = '') {
  let goals = row.goals;
  if (typeof row.goals_json === 'string') {
    try { goals = JSON.parse(row.goals_json || '[]'); } catch { goals = []; }
  }
  return {
    id: row.id,
    patientId: row.patient_id || row.patientId,
    client: row.client || row.patient_name || name,
    goal: row.goal || '',
    focus: row.focus || '',
    status: row.status || 'active',
    updated: toDateIso(row.updated_at || row.updated),
    created: toDateIso(row.created_at || row.created),
    review: toDateIso(row.review_date || row.review),
    goals: Array.isArray(goals) ? goals : [],
  };
}

export function mapForm(row) {
  return {
    id: row.id,
    patientId: row.patient_id || row.patientId,
    name: row.name,
    formKey: row.form_key || row.formKey || '',
    status: row.status || 'Pending',
    date: toDateIso(row.form_date || row.date),
    signedName: row.signed_name || row.signedName || '',
    signedAt: row.signed_at || row.signedAt || null,
  };
}

export function mapMed(row) {
  return {
    id: row.id,
    patientId: row.patient_id || row.patientId,
    name: row.name,
    status: row.status || 'current',
    start: toDateIso(row.start_date || row.start),
    end: toDateIso(row.end_date || row.end),
    provider: row.provider || '',
    updated: toDateIso(row.updated_at || row.updated),
  };
}

export function mapAssessment(row, name = '') {
  return {
    id: row.id,
    assessmentId: row.assessment_id || row.assessmentId,
    name: row.name,
    cat: row.category || row.cat || '',
    status: row.status || 'pending',
    assignedAt: toDateIso(row.assigned_at || row.assignedAt),
    completedAt: toDateIso(row.completed_at || row.completedAt),
    patientId: row.patient_id || row.patientId,
    patientName: row.patient_name || row.patientName || name,
    assignedBy: row.assigned_by || row.assignedBy || '',
  };
}

export function mapAdminNote(row) {
  return {
    id: row.id,
    patientId: row.patient_id || row.patientId,
    text: row.body || row.text || '',
    date: toDateIso(row.note_date || row.date),
    author: row.author || '',
  };
}

export async function chartForPatient(patientId, name = '') {
  if (!hasDatabase()) {
    seedDemoClinical();
    return {
      notes: (demoState.notes || []).filter((n) => n.patientId === patientId).map((n) => mapNote(n, name)),
      plans: (demoState.plans || []).filter((p) => p.patientId === patientId || p.client === name).map((p) => mapPlan(p, name)),
      forms: (demoState.forms || []).filter((f) => f.patientId === patientId).map(mapForm),
      medications: (demoState.medications || []).filter((m) => m.patientId === patientId).map(mapMed),
      assessments: (demoState.assessments || []).filter((a) => a.patientId === patientId).map((a) => mapAssessment(a, name)),
      adminNotes: (demoState.adminNotes || []).filter((n) => n.patientId === patientId).map(mapAdminNote),
    };
  }
  await ensureClinicalSchema();
  const [notes, plans, forms, meds, assessments, adminNotes] = await Promise.all([
    sql`SELECT r.*, p.name AS patient_name FROM clinical_records r JOIN patients p ON p.id = r.patient_id WHERE r.patient_id = ${patientId} ORDER BY r.record_date DESC`,
    sql`SELECT t.*, p.name AS patient_name FROM treatment_plans t JOIN patients p ON p.id = t.patient_id WHERE t.patient_id = ${patientId} ORDER BY t.updated_at DESC`,
    sql`SELECT * FROM patient_forms WHERE patient_id = ${patientId} ORDER BY form_date DESC`,
    sql`SELECT * FROM medications WHERE patient_id = ${patientId} ORDER BY updated_at DESC`,
    sql`SELECT a.*, p.name AS patient_name FROM assigned_assessments a JOIN patients p ON p.id = a.patient_id WHERE a.patient_id = ${patientId} ORDER BY a.assigned_at DESC`,
    sql`SELECT * FROM admin_notes WHERE patient_id = ${patientId} ORDER BY note_date DESC`,
  ]);
  return {
    notes: notes.map((r) => mapNote(r, name)),
    plans: plans.map((r) => mapPlan(r, name)),
    forms: forms.map(mapForm),
    medications: meds.map(mapMed),
    assessments: assessments.map((r) => mapAssessment(r, name)),
    adminNotes: adminNotes.map(mapAdminNote),
  };
}

export async function clinicalBundle() {
  if (!hasDatabase()) {
    seedDemoClinical();
    return {
      notes: (demoState.notes || []).map((n) => mapNote(n, n.patientName)),
      plans: (demoState.plans || []).map((p) => mapPlan(p, p.client)),
      forms: (demoState.forms || []).map(mapForm),
      medications: (demoState.medications || []).map(mapMed),
      assessments: (demoState.assessments || []).map((a) => mapAssessment(a, a.patientName)),
      adminNotes: (demoState.adminNotes || []).map(mapAdminNote),
    };
  }
  await ensureClinicalSchema();
  const [notes, plans, forms, meds, assessments, adminNotes] = await Promise.all([
    sql`SELECT r.*, p.name AS patient_name FROM clinical_records r JOIN patients p ON p.id = r.patient_id ORDER BY r.record_date DESC`,
    sql`SELECT t.*, p.name AS patient_name FROM treatment_plans t JOIN patients p ON p.id = t.patient_id ORDER BY t.updated_at DESC`,
    sql`SELECT f.*, p.name AS patient_name FROM patient_forms f JOIN patients p ON p.id = f.patient_id ORDER BY f.form_date DESC`,
    sql`SELECT m.*, p.name AS patient_name FROM medications m JOIN patients p ON p.id = m.patient_id ORDER BY m.updated_at DESC`,
    sql`SELECT a.*, p.name AS patient_name FROM assigned_assessments a JOIN patients p ON p.id = a.patient_id ORDER BY a.assigned_at DESC`,
    sql`SELECT n.*, p.name AS patient_name FROM admin_notes n JOIN patients p ON p.id = n.patient_id ORDER BY n.note_date DESC`,
  ]);
  return {
    notes: notes.map((r) => mapNote(r)),
    plans: plans.map((r) => mapPlan(r)),
    forms: forms.map(mapForm),
    medications: meds.map(mapMed),
    assessments: assessments.map((r) => mapAssessment(r)),
    adminNotes: adminNotes.map(mapAdminNote),
  };
}

export async function addNote({ patientId, symptoms, diagnosis, body, type, date }) {
  const day = date || new Date().toISOString().slice(0, 10);
  if (!hasDatabase()) {
    seedDemoClinical();
    const row = {
      id: newId(),
      patientId,
      patientName: patientName(patientId),
      symptoms: symptoms || '',
      diagnosis: diagnosis || '',
      body: body || '',
      date: day,
      type: type || 'DAP',
    };
    demoState.notes.unshift(row);
    return row;
  }
  await ensureClinicalSchema();
  const [row] = await sql`
    INSERT INTO clinical_records (patient_id, record_date, symptoms, diagnosis, notes, note_type)
    VALUES (${patientId}, ${day}, ${symptoms || ''}, ${diagnosis || ''}, ${body || ''}, ${type || 'DAP'})
    RETURNING *
  `;
  const [p] = await sql`SELECT name FROM patients WHERE id = ${patientId}`;
  return mapNote(row, p?.name);
}

export async function addPlan({ patientId, goal, focus, review, goals }) {
  const today = new Date().toISOString().slice(0, 10);
  const goalsJson = JSON.stringify(goals || [{ text: goal, status: 'In Progress' }]);
  if (!hasDatabase()) {
    seedDemoClinical();
    const row = {
      id: newId(),
      patientId,
      client: patientName(patientId),
      goal,
      focus: focus || '',
      status: 'active',
      updated: today,
      created: today,
      review: review || '',
      goals: JSON.parse(goalsJson),
    };
    demoState.plans.unshift(row);
    return row;
  }
  await ensureClinicalSchema();
  const [row] = await sql`
    INSERT INTO treatment_plans (patient_id, goal, focus, status, review_date, goals_json, created_at, updated_at)
    VALUES (${patientId}, ${goal}, ${focus || ''}, 'active', ${review || null}, ${goalsJson}, ${today}, ${today})
    RETURNING *
  `;
  const [p] = await sql`SELECT name FROM patients WHERE id = ${patientId}`;
  return mapPlan(row, p?.name);
}

export async function addForm({ patientId, name, formKey, status }) {
  const today = new Date().toISOString().slice(0, 10);
  if (!hasDatabase()) {
    seedDemoClinical();
    const row = {
      id: newId(),
      patientId,
      name,
      formKey: formKey || '',
      status: status || 'Pending',
      date: today,
    };
    demoState.forms.unshift(row);
    return row;
  }
  await ensureClinicalSchema();
  const [row] = await sql`
    INSERT INTO patient_forms (patient_id, name, form_key, status, form_date)
    VALUES (${patientId}, ${name}, ${formKey || ''}, ${status || 'Pending'}, ${today})
    RETURNING *
  `;
  return mapForm(row);
}

export async function completeForm({ formId, patientId, signedName }) {
  const when = new Date().toISOString();
  if (!hasDatabase()) {
    seedDemoClinical();
    const idx = (demoState.forms || []).findIndex((f) => f.id === formId && f.patientId === patientId);
    if (idx < 0) return null;
    const cur = demoState.forms[idx];
    if (cur.status === 'Completed') {
      const err = new Error('This form is already signed');
      err.status = 409;
      throw err;
    }
    demoState.forms[idx] = {
      ...cur,
      status: 'Completed',
      signedName,
      signedAt: when,
      date: when.slice(0, 10),
    };
    return mapForm(demoState.forms[idx]);
  }
  await ensureClinicalSchema();
  const [cur] = await sql`
    SELECT * FROM patient_forms WHERE id = ${formId} AND patient_id = ${patientId}
  `;
  if (!cur) return null;
  if (cur.status === 'Completed') {
    const err = new Error('This form is already signed');
    err.status = 409;
    throw err;
  }
  const [row] = await sql`
    UPDATE patient_forms
    SET status = 'Completed', signed_name = ${signedName}, signed_at = ${when}, form_date = CURRENT_DATE
    WHERE id = ${formId} AND patient_id = ${patientId}
    RETURNING *
  `;
  return mapForm(row);
}

export async function addMedication({ patientId, name, status, start, end, provider }) {
  const today = new Date().toISOString().slice(0, 10);
  if (!hasDatabase()) {
    seedDemoClinical();
    const row = {
      id: newId(),
      patientId,
      name,
      status: status || 'current',
      start: start || today,
      end: end || '',
      provider: provider || '',
      updated: today,
    };
    demoState.medications.unshift(row);
    return row;
  }
  await ensureClinicalSchema();
  const [row] = await sql`
    INSERT INTO medications (patient_id, name, status, start_date, end_date, provider, updated_at)
    VALUES (${patientId}, ${name}, ${status || 'current'}, ${start || today}, ${end ? end : null}, ${provider || ''}, ${today})
    RETURNING *
  `;
  return mapMed(row);
}

export async function addAssessment({ patientId, assessmentId, name, cat, assignedBy }) {
  const today = new Date().toISOString().slice(0, 10);
  if (!hasDatabase()) {
    seedDemoClinical();
    const row = {
      id: newId(),
      assessmentId,
      name,
      cat: cat || '',
      status: 'pending',
      assignedAt: today,
      patientId,
      patientName: patientName(patientId),
      assignedBy: assignedBy || '',
    };
    demoState.assessments.unshift(row);
    return row;
  }
  await ensureClinicalSchema();
  const [row] = await sql`
    INSERT INTO assigned_assessments (patient_id, assessment_id, name, category, status, assigned_at, assigned_by)
    VALUES (${patientId}, ${assessmentId}, ${name}, ${cat || ''}, 'pending', ${today}, ${assignedBy || ''})
    RETURNING *
  `;
  const [p] = await sql`SELECT name FROM patients WHERE id = ${patientId}`;
  return mapAssessment(row, p?.name);
}

export async function addAdminNote({ patientId, text, author }) {
  const today = new Date().toISOString().slice(0, 10);
  if (!hasDatabase()) {
    seedDemoClinical();
    const row = { id: newId(), patientId, text, date: today, author: author || '' };
    demoState.adminNotes.unshift(row);
    return row;
  }
  await ensureClinicalSchema();
  const [row] = await sql`
    INSERT INTO admin_notes (patient_id, body, author, note_date)
    VALUES (${patientId}, ${text}, ${author || ''}, ${today})
    RETURNING *
  `;
  return mapAdminNote(row);
}
