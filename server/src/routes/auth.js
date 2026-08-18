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
import { listPatientPortalUsers, ensurePatientPortalAccounts, setPatientPortalPassword } from '../lib/portalAccounts.js';

const router = Router();

router.get('/users', async (req, res) => {
  const intent = req.query.intent === 'patient' ? 'patient' : 'staff';
  if (intent === 'patient') {
    return res.json(await listPatientPortalUsers());
  }
  if (!hasDatabase()) {
    const rows = DEMO_USERS
      .filter((u) => u.role !== 'patient')
      .map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email }));
    return res.json(rows);
  }
  const rows = await sql`SELECT id, name, role, email FROM users WHERE role IN ('admin', 'practitioner', 'staff') ORDER BY role, name`;
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
    return res.status(400).json({ error: 'Enter your email and password' });
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

  try {
    await ensurePatientPortalAccounts();
  } catch (err) {
    console.error('ensurePatientPortalAccounts', err);
  }
  const rows = userId
    ? await sql`SELECT * FROM users WHERE id = ${userId}`
    : await sql`SELECT * FROM users WHERE lower(email) = ${email.toLowerCase()}`;
  let user = rows[0];
  if (!user) {
    const demo = findDemoUser({ userId, email });
    if (demo) {
      const token = signToken(demo);
      return res.json({ token, user: publicDemoUser(demo), demoMode: true });
    }
    return res.status(401).json({ error: 'User not found' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, patientId: user.patient_id },
  });
});

router.post('/portal-password', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    dob: z.string().min(8),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return res.status(400).json({ error: first?.message || 'Enter email, date of birth, and a new password' });
  }
  try {
    const user = await setPatientPortalPassword(parsed.data);
    const token = signToken(user);
    return res.json({
      token,
      user: publicDemoUser(user),
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Could not set portal password' });
  }
});

router.post('/password', authRequired, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return res.status(400).json({ error: first?.message || 'Invalid password' });
  }
  const { currentPassword, newPassword } = parsed.data;

  if (!hasDatabase()) {
    const user = findDemoUser({ userId: req.user.sub });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password_hash = await bcrypt.hash(newPassword, 10);
    return res.json({ ok: true });
  }

  const [user] = await sql`SELECT * FROM users WHERE id = ${req.user.sub}`;
  if (!user) {
    const demo = findDemoUser({ userId: req.user.sub });
    if (!demo) return res.status(401).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, demo.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    demo.password_hash = await bcrypt.hash(newPassword, 10);
    return res.json({ ok: true });
  }
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`;
  res.json({ ok: true });
});

router.get('/me', authRequired, async (req, res) => {
  if (!hasDatabase()) {
    const user = findDemoUser({ userId: req.user.sub });
    if (!user) return res.status(401).json({ error: 'User not found' });
    return res.json(publicDemoUser(user));
  }
  const [user] = await sql`SELECT id, name, email, role, patient_id FROM users WHERE id = ${req.user.sub}`;
  if (!user) {
    const demo = findDemoUser({ userId: req.user.sub });
    if (demo) return res.json(publicDemoUser(demo));
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, patientId: user.patient_id });
});

export default router;
