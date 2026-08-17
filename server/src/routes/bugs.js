import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState, newId } from '../demo.js';
import { sendMail } from '../lib/mail.js';

const router = Router();
router.use(authRequired, requireStaff);

const DEV_BUG_EMAILS = [
  'cseshivangi599@gmail.com',
  'malhotra.05@gmail.com',
  'ankit.malhotra97.am@gmail.com',
];

function bugReportRecipients() {
  const extra = String(process.env.BUG_REPORT_EMAIL || '')
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEV_BUG_EMAILS, ...extra])];
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ticketCode(id) {
  return `BUG-${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function dataUrlToAttachment(dataUrl, name = 'screenshot.jpg') {
  if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return null;
  const match = String(dataUrl).match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) return null;
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 3_500_000) return null;
  const ext = match[1].includes('png') ? 'png' : 'jpg';
  return {
    filename: name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') ? name : `screenshot.${ext}`,
    content: buf,
    contentType: match[1],
  };
}

async function ensureBugTable() {
  if (!hasDatabase()) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reporter_name TEXT DEFAULT '',
        reporter_email TEXT DEFAULT '',
        reporter_role TEXT DEFAULT '',
        page_name TEXT NOT NULL,
        page_route TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        expected TEXT DEFAULT '',
        steps TEXT DEFAULT '',
        severity TEXT DEFAULT 'major',
        frequency TEXT DEFAULT 'always',
        browser TEXT DEFAULT '',
        viewport TEXT DEFAULT '',
        screenshot_name TEXT DEFAULT '',
        screenshot_data TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open'
      )
    `;
  } catch { /* ignore */ }
}

const bodySchema = z.object({
  title: z.string().min(4).max(180),
  description: z.string().min(8).max(4000),
  expected: z.string().min(4).max(2000),
  steps: z.string().max(2000).optional().default(''),
  severity: z.enum(['blocker', 'major', 'minor']).default('major'),
  frequency: z.enum(['always', 'sometimes', 'once']).default('always'),
  pageName: z.string().min(1).max(120),
  pageRoute: z.string().min(1).max(400),
  screenshot: z.string().optional().default(''),
  screenshotName: z.string().optional().default(''),
  browser: z.string().optional().default(''),
  viewport: z.string().optional().default(''),
});

router.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return res.status(400).json({ error: first?.message || 'Complete the bug report fields' });
  }
  const d = parsed.data;
  const screenshot = d.screenshot && d.screenshot.startsWith('data:image/') ? d.screenshot : '';
  const row = {
    id: newId(),
    created_at: new Date().toISOString(),
    reporter_name: req.user?.name || '',
    reporter_email: req.user?.email || '',
    reporter_role: req.user?.role || '',
    page_name: d.pageName.trim(),
    page_route: d.pageRoute.trim(),
    title: d.title.trim(),
    description: d.description.trim(),
    expected: d.expected.trim(),
    steps: d.steps.trim(),
    severity: d.severity,
    frequency: d.frequency,
    browser: d.browser.slice(0, 400),
    viewport: d.viewport.slice(0, 40),
    screenshot_name: d.screenshotName || '',
    screenshot_data: screenshot,
    status: 'open',
  };
  const ticket = ticketCode(row.id);

  if (!hasDatabase()) {
    if (!demoState.bugReports) demoState.bugReports = [];
    demoState.bugReports.unshift({ ...row, ticket });
    if (demoState.bugReports.length > 80) demoState.bugReports.length = 80;
  } else {
    await ensureBugTable();
    await sql`
      INSERT INTO bug_reports (
        id, reporter_name, reporter_email, reporter_role, page_name, page_route,
        title, description, expected, steps, severity, frequency, browser, viewport,
        screenshot_name, screenshot_data, status
      ) VALUES (
        ${row.id}, ${row.reporter_name}, ${row.reporter_email}, ${row.reporter_role},
        ${row.page_name}, ${row.page_route}, ${row.title}, ${row.description}, ${row.expected},
        ${row.steps}, ${row.severity}, ${row.frequency}, ${row.browser}, ${row.viewport},
        ${row.screenshot_name}, ${row.screenshot_data}, ${row.status}
      )
    `;
  }

  const to = bugReportRecipients();
  const shot = dataUrlToAttachment(screenshot, row.screenshot_name || 'screenshot.jpg');
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0b2540;max-width:640px">
      <p style="font-size:13px;color:#c48900;font-weight:700;letter-spacing:.04em;margin:0 0 6px">MINDCARE BUG ${escapeHtml(ticket)}</p>
      <h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(row.title)}</h2>
      <p><strong>Severity:</strong> ${escapeHtml(row.severity)} · <strong>How often:</strong> ${escapeHtml(row.frequency)}</p>
      <p><strong>Page:</strong> ${escapeHtml(row.page_name)}<br/>
         <strong>Route:</strong> <code>${escapeHtml(row.page_route)}</code></p>
      <p><strong>Reporter:</strong> ${escapeHtml(row.reporter_name)} (${escapeHtml(row.reporter_role)}) ${escapeHtml(row.reporter_email)}</p>
      <p><strong>Browser:</strong> ${escapeHtml(row.browser)}<br/>
         <strong>Viewport:</strong> ${escapeHtml(row.viewport)}</p>
      <h3 style="margin:18px 0 6px">What happened</h3>
      <p style="white-space:pre-wrap">${escapeHtml(row.description)}</p>
      <h3 style="margin:18px 0 6px">What should happen instead</h3>
      <p style="white-space:pre-wrap">${escapeHtml(row.expected)}</p>
      ${row.steps ? `<h3 style="margin:18px 0 6px">Steps to reproduce</h3><p style="white-space:pre-wrap">${escapeHtml(row.steps)}</p>` : ''}
      ${shot ? '<h3 style="margin:18px 0 6px">Screenshot</h3><p><img src="cid:bugshot" alt="Bug screenshot" style="max-width:100%;border:1px solid #e5dcc8;border-radius:8px"/></p>' : '<p><em>No screenshot attached.</em></p>'}
    </div>
  `;

  try {
    await sendMail({
      to,
      subject: `[${ticket}] ${row.severity.toUpperCase()} · ${row.page_name}: ${row.title}`,
      text: [
        `MindCare bug ${ticket}`,
        `Severity: ${row.severity} · Frequency: ${row.frequency}`,
        `Page: ${row.page_name}`,
        `Route: ${row.page_route}`,
        `Reporter: ${row.reporter_name} (${row.reporter_role}) ${row.reporter_email}`,
        `Browser: ${row.browser}`,
        `Viewport: ${row.viewport}`,
        '',
        `Issue: ${row.title}`,
        '',
        row.description,
        '',
        `Expected instead: ${row.expected}`,
        row.steps ? `\nSteps:\n${row.steps}` : '',
        shot ? '\nScreenshot is attached.' : '\nNo screenshot attached.',
      ].filter(Boolean).join('\n'),
      html,
      attachments: shot ? [{ ...shot, cid: 'bugshot' }] : [],
    });
  } catch (err) {
    return res.status(502).json({
      error: `Report saved, but email failed: ${err.message}. Check SMTP settings.`,
      ticket,
    });
  }

  res.status(201).json({ id: row.id, ticket, status: 'open', emailedTo: to });
});

export default router;
