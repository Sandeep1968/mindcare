import { Router } from 'express';
import { z } from 'zod';
import { authRequired, requireStaff } from '../middleware/auth.js';
import {
  listThreads,
  getThread,
  createThread,
  addReply,
  setThreadStatus,
  unreadCount,
} from '../lib/messages.js';

const router = Router();
router.use(authRequired, requireStaff);

router.get('/', async (req, res) => {
  const patientId = req.query.patientId || undefined;
  const status = req.query.status || undefined;
  const rows = await listThreads({ patientId, status });
  res.json(rows);
});

router.get('/unread-count', async (_req, res) => {
  res.json({ count: await unreadCount() });
});

router.get('/:id', async (req, res) => {
  const row = await getThread(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const parsed = z.object({
    patientId: z.string().uuid(),
    subject: z.string().min(2),
    body: z.string().min(1),
    category: z.enum(['scheduling', 'billing', 'forms', 'general']).optional(),
    priority: z.enum(['routine', 'high']).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Select a patient, subject, and message' });
  }
  try {
    const thread = await createThread({
      ...parsed.data,
      author: req.user.name,
      authorRole: 'staff',
      channel: 'portal',
    });
    res.status(201).json(thread);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not send message' });
  }
});

router.post('/:id/reply', async (req, res) => {
  const parsed = z.object({ body: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a reply' });
  const thread = await addReply({
    threadId: req.params.id,
    body: parsed.data.body,
    author: req.user.name,
    authorRole: 'staff',
  });
  if (!thread) return res.status(404).json({ error: 'Not found' });
  res.json(thread);
});

router.patch('/:id', async (req, res) => {
  const parsed = z.object({
    status: z.enum(['unread', 'open', 'follow_up', 'resolved', 'archived']),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });
  try {
    const thread = await setThreadStatus(req.params.id, parsed.data.status);
    if (!thread) return res.status(404).json({ error: 'Not found' });
    res.json(thread);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not update' });
  }
});

export default router;
