import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Bug, Camera, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { pageMetaFromPath } from '../pages/dashboard/navConfig';

const empty = {
  title: '',
  description: '',
  expected: '',
  steps: '',
  severity: 'major',
  frequency: 'always',
  pageName: '',
  pageRoute: '',
};

async function fileToJpegDataUrl(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read image'));
      el.src = url;
    });
    const max = 1400;
    let w = img.width;
    let h = img.height;
    if (w > max) {
      h = Math.round((h * max) / w);
      w = max;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.74);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BugReportButton() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [screenshot, setScreenshot] = useState('');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const fileRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const meta = pageMetaFromPath(location.pathname);
    setForm((f) => ({
      ...f,
      pageRoute: `${location.pathname}${location.search || ''}`,
      pageName: f.pageName || meta.name,
    }));
  }, [open, location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => titleRef.current?.focus(), 50);
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    async function onPaste(e) {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      const dataUrl = await fileToJpegDataUrl(file);
      setScreenshot(dataUrl);
      setFileName('pasted-screenshot.jpg');
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open]);

  function close() {
    setOpen(false);
    setError('');
    setDone('');
  }

  function openForm() {
    const meta = pageMetaFromPath(location.pathname);
    setForm({
      ...empty,
      pageRoute: `${location.pathname}${location.search || ''}`,
      pageName: meta.name,
    });
    setScreenshot('');
    setFileName('');
    setError('');
    setDone('');
    setOpen(true);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please attach an image screenshot (PNG, JPG, or WebP).');
      return;
    }
    const dataUrl = await fileToJpegDataUrl(file);
    setScreenshot(dataUrl);
    setFileName(file.name);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api('/bugs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          screenshot,
          screenshotName: fileName,
          browser: navigator.userAgent,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
        }),
      });
      setDone(res.ticket || res.id || 'submitted');
      setTimeout(() => close(), 1800);
    } catch (err) {
      setError(err.message || 'Could not send the bug report');
    } finally {
      setSaving(false);
    }
  }

  const modal = open ? createPortal(
    <div
      className="mc-bug-overlay fixed inset-0 z-[200] overflow-y-auto bg-mc-ink/50 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="mx-auto flex min-h-full items-start justify-center py-2 sm:items-center">
        <div
          className="mc-bug-sheet flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-report-title"
        >
          {done ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h3 className="mt-3 text-lg font-bold text-mc-navy">Report sent</h3>
              <p className="mt-1 text-sm text-mc-ink-soft">
                Ticket {done} emailed to the developer team with your screenshot.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-mc-line px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-mc-gold-deep">Bug finder</p>
                  <h3 id="bug-report-title" className="text-lg font-bold text-mc-navy">Report an issue</h3>
                  <p className="mt-0.5 text-sm text-mc-ink-soft">
                    Opened from this screen — route is filled in for the developer.
                  </p>
                </div>
                <button type="button" onClick={close} className="rounded-lg p-1.5 text-slate-500 hover:bg-[#f3f5f8]" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-mc-ink-soft">
                    Page name
                    <input
                      required
                      className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                      value={form.pageName}
                      onChange={(e) => setForm({ ...form, pageName: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-mc-ink-soft">
                    Page route (auto)
                    <input
                      required
                      readOnly
                      className="mt-1 w-full rounded-lg border border-mc-line bg-[#f7f9fc] px-3 py-2 text-sm font-normal text-mc-navy"
                      value={form.pageRoute}
                    />
                  </label>
                </div>

                <label className="block text-xs font-semibold text-mc-ink-soft">
                  Issue title
                  <input
                    ref={titleRef}
                    required
                    className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                    placeholder="Zoom email still shows Jitsi link"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-semibold text-mc-ink-soft">
                  Describe the issue
                  <textarea
                    required
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                    placeholder="What happened, and on which click or step?"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-semibold text-mc-ink-soft">
                  What should happen instead
                  <textarea
                    required
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                    placeholder="The expected result after you click…"
                    value={form.expected}
                    onChange={(e) => setForm({ ...form, expected: e.target.value })}
                  />
                </label>

                <label className="block text-xs font-semibold text-mc-ink-soft">
                  Steps to reproduce (optional)
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                    placeholder="1. Open Appointments  2. Book a video visit  3. Check email"
                    value={form.steps}
                    onChange={(e) => setForm({ ...form, steps: e.target.value })}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-mc-ink-soft">
                    Severity
                    <select
                      className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                      value={form.severity}
                      onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    >
                      <option value="blocker">Blocker — cannot work</option>
                      <option value="major">Major — wrong result</option>
                      <option value="minor">Minor — annoying</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-mc-ink-soft">
                    How often
                    <select
                      className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm font-normal text-mc-ink"
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    >
                      <option value="always">Every time</option>
                      <option value="sometimes">Sometimes</option>
                      <option value="once">Once</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-xl border border-dashed border-mc-line bg-[#faf8f4] p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-mc-ink">
                    <Camera className="h-3.5 w-3.5" /> Screenshot
                  </p>
                  {screenshot ? (
                    <div className="relative">
                      <img src={screenshot} alt="Bug screenshot preview" className="max-h-40 w-full rounded-lg object-contain bg-white" />
                      <button
                        type="button"
                        onClick={() => { setScreenshot(''); setFileName(''); }}
                        className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-mc-navy"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-mc-line bg-white py-3 text-sm font-semibold text-mc-navy"
                    >
                      <ImagePlus className="h-4 w-4" /> Add screenshot or paste (Ctrl+V)
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                </div>

                <p className="text-[11px] text-mc-ink-soft">
                  Reporter: <strong>{user?.name}</strong> ({user?.role}) · {user?.email || 'signed in'}
                </p>

                {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              </div>

              <div className="flex shrink-0 gap-2 border-t border-mc-line bg-white px-5 py-3">
                <button type="button" onClick={close} className="flex-1 rounded-xl border border-mc-line py-2.5 text-sm font-semibold">
                  Cancel
                </button>
                <button disabled={saving} className="flex-1 rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {saving ? 'Sending…' : 'Send to developers'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        className="mc-bug-btn relative rounded-xl border border-[#e8ecf1] p-2.5 text-mc-navy hover:bg-mc-gold-soft"
        aria-label="Report a bug"
        title="Report a bug on this page"
      >
        <span className="mc-bug-ping" aria-hidden />
        <Bug className="mc-bug-icon h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>
      {modal}
    </>
  );
}
