import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';
import {
  hasDatabase,
  DEMO_USERS,
  findDemoUser,
  publicDemoUser,
} from '../demo.js';

const router = Router();

router.get('/users', async (req, res) => {
  const intent = req.query.intent === 'patient' ? 'patient' : 'staff';
  if (!hasDatabase()) {
    const rows = DEMO_USERS
      .filter((u) => (intent === 'patient' ? u.role === 'patient' : u.role !== 'patient'))
      .map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email }));
    return res.json(rows);
  }
  const rows = intent === 'patient'
    ? await sql`SELECT id, name, role, email FROM users WHERE role = 'patient' ORDER BY name`
    : await sql`SELECT id, name, role, email FROM users WHERE role IN ('admin', 'practitioner', 'staff') ORDER BY role, name`;
  res.json(rows);
});

router.get('/bootstrap', async (_req, res) => {
  if (!hasDatabase()) return res.json({ needsSetup: false, demoMode: true });
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role IN ('admin', 'practitioner')`;
  res.json({ needsSetup: count === 0, demoMode: false });
});

router.post('/setup', async (req, res) => {
  if (!hasDatabase()) {
    return res.status(400).json({ error: 'Demo mode is on — pick a demo user and sign in with password mindcare123' });
  }
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(4),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM users WHERE role IN ('admin', 'practitioner')`;
  if (count > 0) return res.status(400).json({ error: 'An admin/practitioner already exists. Sign in instead.' });

  const { name, email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (name, email, role, password_hash)
    VALUES (${name}, ${email.toLowerCase()}, 'admin', ${hash})
    RETURNING id, name, email, role, patient_id
  `;
  const token = signToken(user);
  res.status(201).json({ token, user: publicDemoUser(user) });
});

router.post('/login', async (req, res) => {
  const emptyToUndef = (v) => (v === '' || v == null ? undefined : v);
  const schema = z.object({
    userId: z.preprocess(emptyToUndef, z.string().uuid().optional()),
    email: z.preprocess(emptyToUndef, z.string().email().optional()),
    password: z.string().min(1),
  }).refine((d) => d.userId || d.email, { message: 'Select a user' });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Select a user, then enter password mindcare123' });
  }

  const { userId, email, password } = parsed.data;

  if (!hasDatabase()) {
    const user = findDemoUser({ userId, email });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });
    const token = signToken(user);
    return res.json({ token, user: publicDemoUser(user), demoMode: true });
  }

  const rows = userId
    ? await sql`SELECT * FROM users WHERE id = ${userId}`
    : await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'User not found' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, patientId: user.patient_id },
  });
});

router.get('/me', authRequired, async (req, res) => {
  if (!hasDatabase()) {
    const user = findDemoUser({ userId: req.user.sub });
    if (!user) return res.status(401).json({ error: 'User not found' });
    return res.json(publicDemoUser(user));
  }
  const [user] = await sql`SELECT id, name, email, role, patient_id FROM users WHERE id = ${req.user.sub}`;
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, patientId: user.patient_id });
});

export default router;
