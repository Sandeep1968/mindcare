import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from './db.js';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const name = process.env.SEED_PRACTITIONER_NAME || 'Dr. Sarah Williams';
  const email = (process.env.SEED_PRACTITIONER_EMAIL || 'practitioner@mindcare.local').toLowerCase();
  const password = process.env.SEED_PRACTITIONER_PASSWORD || 'mindcare123';
  const hash = await bcrypt.hash(password, 10);

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length) {
    console.log('Practitioner already exists:', email);
  } else {
    await sql`
      INSERT INTO users (name, email, role, password_hash)
      VALUES (${name}, ${email}, 'practitioner', ${hash})
    `;
    console.log('✓ Seeded practitioner:', email, '/', password);
  }

  const sample = await sql`SELECT id FROM appointment_requests LIMIT 1`;
  if (!sample.length) {
    await sql`
      INSERT INTO appointment_requests (
        name, email, phone, payer_type, preferred_date, preferred_time, service,
        session_type, session_pref, notes, match_audience, therapist_pref,
        sliding_scale, preferred_therapist, match_completed, crisis, match_json, assessment_json, status
      ) VALUES
      (
        'Alex Rivera', 'alex.rivera@example.com', '(555) 201-4400', 'self-pay',
        (CURRENT_DATE + 3), '10:30', 'Anxiety & Stress',
        'video', 'video', 'Evenings after work are the hardest.',
        'individual', 'woman', false, 'Dr. Sarah Williams', true, 'no',
        ${JSON.stringify({ audience: 'individual', service: 'Anxiety & Stress', sessionType: 'video', therapistPref: 'woman' })}::jsonb,
        ${JSON.stringify({ id: 'anxiety', name: 'Anxiety check-in', total: 11, max: 18, level: 'moderate' })}::jsonb,
        'new'
      ),
      (
        'Jordan Blake', 'jordan.blake@example.com', '(555) 773-0192', 'insurance',
        (CURRENT_DATE + 5), '16:00', 'Relationships',
        'in-person', 'in-person', 'Partner may join the first visit.',
        'couples', 'any', false, 'James Chen, LCSW', true, 'no',
        ${JSON.stringify({ audience: 'couples', service: 'Relationships', sessionType: 'in-person', therapistPref: 'any' })}::jsonb,
        ${JSON.stringify({ id: 'couples', name: 'Couples communication', total: 14, max: 18, level: 'higher' })}::jsonb,
        'new'
      )
    `;
    console.log('✓ Seeded sample website bookings (virtual + in-person)');
  }

  console.log('Done.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
