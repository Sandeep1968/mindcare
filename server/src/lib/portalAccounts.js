import bcrypt from 'bcryptjs';
import { sql } from '../db.js';
import {
  hasDatabase,
  DEMO_IDS,
  DEMO_PASSWORD_PLAIN,
  DEMO_USERS,
  demoState,
  newId,
} from '../demo.js';

function publicRow(u) {
  return { id: u.id, name: u.name, role: u.role, email: u.email };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function dobIso(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

export async function listPatientPortalUsers() {
  if (!hasDatabase()) {
    return DEMO_USERS.filter((u) => u.role === 'patient').map(publicRow);
  }
  try {
    await ensurePatientPortalAccounts();
    const rows = await sql`SELECT id, name, role, email FROM users WHERE role = 'patient' ORDER BY name`;
    if (rows.length) return rows.map(publicRow);
  } catch (err) {
    console.error('listPatientPortalUsers', err);
  }
  return DEMO_USERS.filter((u) => u.role === 'patient').map(publicRow);
}

/** Patient sets (or replaces) their portal password after proving email + DOB. */
export async function setPatientPortalPassword({ email, dob, password }) {
  const em = String(email || '').trim().toLowerCase();
  const wantDob = dobIso(dob);
  if (!em || !wantDob || !password) {
    throw httpError(400, 'Email, date of birth, and a password are required');
  }
  const hash = await bcrypt.hash(password, 10);

  if (!hasDatabase()) {
    const patient = demoState.patients.find((p) => String(p.email || '').toLowerCase() === em);
    if (!patient) {
      throw httpError(404, 'No patient record for that email. Ask the clinic to add you first.');
    }
    if (!dobIso(patient.dob) || dobIso(patient.dob) !== wantDob) {
      throw httpError(401, 'Date of birth does not match our record.');
    }
    let user = DEMO_USERS.find(
      (u) => u.role === 'patient' && (u.email.toLowerCase() === em || u.patient_id === patient.id),
    );
    if (!user) {
      user = {
        id: newId(),
        name: patient.name,
        email: em,
        role: 'patient',
        password_hash: hash,
        patient_id: patient.id,
      };
      DEMO_USERS.push(user);
    } else {
      user.password_hash = hash;
      user.patient_id = patient.id;
      user.email = em;
      user.name = patient.name;
    }
    return user;
  }

  const [patient] = await sql`SELECT * FROM patients WHERE lower(email) = ${em} LIMIT 1`;
  if (!patient) {
    throw httpError(404, 'No patient record for that email. Ask the clinic to add you first.');
  }
  if (!dobIso(patient.dob) || dobIso(patient.dob) !== wantDob) {
    throw httpError(401, 'Date of birth does not match our record.');
  }

  const [existing] = await sql`
    SELECT * FROM users
    WHERE lower(email) = ${em} OR patient_id = ${patient.id}
    ORDER BY CASE WHEN role = 'patient' THEN 0 ELSE 1 END
    LIMIT 1
  `;
  if (existing && existing.role !== 'patient') {
    throw httpError(409, 'That email is already used by a staff account. Use a different email on your chart.');
  }
  if (existing) {
    const [row] = await sql`
      UPDATE users
      SET password_hash = ${hash}, patient_id = ${patient.id}, name = ${patient.name}, email = ${em}
      WHERE id = ${existing.id}
      RETURNING *
    `;
    return row;
  }

  const [row] = await sql`
    INSERT INTO users (name, email, role, password_hash, patient_id)
    VALUES (${patient.name}, ${em}, 'patient', ${hash}, ${patient.id})
    RETURNING *
  `;
  return row;
}

/**
 * Only the demo Alex login is auto-created. Real patients choose a password
 * themselves on the portal sign-in screen.
 */
export async function ensurePatientPortalAccounts() {
  if (!hasDatabase()) return;

  const hash = await bcrypt.hash(DEMO_PASSWORD_PLAIN, 8);
  const portalEmail = 'patient@mindcare.local';
  let [patient] = await sql`
    SELECT id, name, email FROM patients
    WHERE id = ${DEMO_IDS.patientAlex}
       OR lower(email) = 'alex.rivera@example.com'
       OR lower(name) = 'alex rivera'
    ORDER BY CASE
      WHEN id = ${DEMO_IDS.patientAlex} THEN 0
      WHEN lower(email) = 'alex.rivera@example.com' THEN 1
      ELSE 2
    END
    LIMIT 1
  `;
  if (!patient) {
    [patient] = await sql`
      INSERT INTO patients (id, name, email, phone, dob, payer_type)
      VALUES (
        ${DEMO_IDS.patientAlex}, 'Alex Rivera', 'alex.rivera@example.com',
        '(555) 201-4400', '1992-04-12', 'self-pay'
      )
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, email
    `;
  }

  await sql`
    INSERT INTO users (id, name, email, role, password_hash, patient_id)
    VALUES (
      ${DEMO_IDS.patientUser}, 'Alex Rivera', ${portalEmail}, 'patient', ${hash}, ${patient.id}
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      patient_id = EXCLUDED.patient_id
  `;
}
