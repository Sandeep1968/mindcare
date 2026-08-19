import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireStaff } from '../middleware/auth.js';
import {
  clinicalBundle,
  chartForPatient,
  addNote,
  addPlan,
  addForm,
  addMedication,
  addAssessment,
  addAdminNote,
} from '../lib/clinical.js';

const router = Router();
router.use(authRequired, requireStaff);

router.get('/bundle', async (_req, res) => {
  res.json(await clinicalBundle());
});

router.get('/chart/:patientId', async (req, res) => {
  res.json(await chartForPatient(req.params.patientId));
});

router.post('/notes', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    symptoms: z.string().optional().default(''),
    diagnosis: z.string().optional().default(''),
    body: z.string().min(1),
    type: z.string().optional(),
    date: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Select a patient and enter a note' });
  res.status(201).json(await addNote(parsed.data));
});

router.post('/plans', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    goal: z.string().min(2),
    focus: z.string().optional().default(''),
    review: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Select a patient and enter a goal' });
  res.status(201).json(await addPlan(parsed.data));
});

router.post('/forms', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    name: z.string().min(2),
    formKey: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Select a patient and a form' });
  res.status(201).json(await addForm(parsed.data));
});

router.post('/medications', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    name: z.string().min(2),
    status: z.enum(['current', 'previous']).optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    provider: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Select a patient and medication name' });
  res.status(201).json(await addMedication(parsed.data));
});

router.post('/assessments', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    assessmentId: z.string().min(1),
    name: z.string().min(1),
    cat: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Select a patient and an assessment' });
  const assignedBy = req.user?.name || '';
  res.status(201).json(await addAssessment({ ...parsed.data, assignedBy }));
});

router.post('/admin-notes', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    text: z.string().min(1),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a note' });
  res.status(201).json(await addAdminNote({
    patientId: parsed.data.patientId,
    text: parsed.data.text,
    author: req.user?.name || 'Staff',
  }));
});

export default router;
