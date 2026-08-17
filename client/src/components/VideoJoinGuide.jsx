import { Copy, ExternalLink, Video, CheckCircle2, AlertTriangle, ListOrdered } from 'lucide-react';
import { copyText, isZoomUrl, launchVideo } from '../lib/videoLaunch';
import { detectProvider, joinStepsFor } from '../lib/videoJoinSteps';

/**
 * Join modal with role-specific Zoom steps (doctor account vs patient account).
 */
export default function VideoJoinGuide({
  open,
  onClose,
  role = 'host',
  provider: providerProp,
  link,
  hostUrl,
  joinUrl,
  title,
  subtitle,
  waitingMessage,
  checklist,
  checks,
  onCheckChange,
  onJoined,
  mode,
}) {
  if (!open) return null;

  const provider = providerProp || detectProvider(link || joinUrl || hostUrl);
  const steps = joinStepsFor(provider, role);
  const allChecked = checklist.every((c) => checks[c.key]);
  const isZoom = provider === 'zoom';

  // Doctor opens host/start URL; patient opens join URL
  const launchUrl = role === 'host'
    ? (hostUrl || link || joinUrl)
    : (joinUrl || link || hostUrl);
  const shareUrl = joinUrl || link;

  if (!launchUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/45 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-mc-navy">Video not ready</h3>
          <p className="mt-2 text-sm text-mc-ink-soft">
            {isZoom
              ? 'Zoom could not start. Open Video Visits, enter the doctor Zoom login email, choose Zoom as provider, and Save. Then Join as host again.'
              : 'Could not create a meeting room. Try again from Video Visits.'}
          </p>
          <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white">Close</button>
        </div>
      </div>
    );
  }

  async function handleJoin() {
    launchVideo(launchUrl);
    if (role === 'host' && shareUrl) await copyText(shareUrl);
    onJoined?.();
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-mc-ink/45 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-join-title"
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isZoom ? 'bg-[#e8f0fe] text-[#0b5cff]' : 'bg-mc-gold-soft text-mc-gold-deep'}`}>
            {isZoom ? 'Zoom' : 'Jitsi'} · {role === 'host' ? 'Doctor account (host)' : 'Patient account (join)'}
          </span>
          {mode === 'api' && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Unique meeting</span>
          )}
          {mode === 'pmi' && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Personal room</span>
          )}
        </div>
        <h3 id="video-join-title" className="text-xl font-bold text-mc-navy">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-mc-ink-soft">{subtitle}</p>}

        {isZoom && (
          <p className="mt-3 rounded-xl border border-[#0b5cff]/25 bg-[#e8f0fe] px-3 py-2 text-xs text-mc-ink">
            {role === 'host'
              ? 'Use your doctor Zoom login to start. The patient uses a different join link with their own Zoom login (or as guest).'
              : 'Use your own Zoom login (or guest). Do not use the doctor’s Zoom account.'}
          </p>
        )}

        {waitingMessage && (
          <p className="mt-3 rounded-xl bg-[#faf7f1] px-3 py-2 text-sm text-mc-ink">{waitingMessage}</p>
        )}

        <div className="mt-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mc-navy">
            <ListOrdered className="h-4 w-4" /> Steps to join & conduct
          </h4>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-xl border border-[#e5dcc8] bg-[#faf8f4] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mc-navy text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-mc-navy">{s.title}</p>
                  <p className="text-xs text-mc-ink-soft">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <ul className="mt-4 space-y-2">
          {checklist.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-mc-line px-3 py-2 text-sm hover:bg-[#faf7f1]"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(checks[c.key])}
                onChange={(e) => onCheckChange?.(c.key, e.target.checked)}
              />
              <span className="flex-1">{c.label}</span>
              {checks[c.key] && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
            </label>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          {role === 'host' && shareUrl && (
            <button
              type="button"
              onClick={async () => { await copyText(shareUrl); }}
              className="inline-flex items-center gap-1 rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold"
            >
              <Copy className="h-4 w-4" /> Copy patient join link
            </button>
          )}
          {role === 'patient' && (
            <button
              type="button"
              onClick={async () => { await copyText(launchUrl); }}
              className="inline-flex items-center gap-1 rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold"
            >
              <Copy className="h-4 w-4" /> Copy my join link
            </button>
          )}
          <a
            href={launchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold text-mc-navy"
          >
            <ExternalLink className="h-4 w-4" /> Open in browser
          </a>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-mc-line py-2.5 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!allChecked}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Video className="h-4 w-4" />
            {isZoom
              ? (role === 'host' ? 'Start Zoom as host' : 'Join Zoom now')
              : 'Join session'}
          </button>
        </div>

        {!allChecked && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-mc-ink-soft">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Check each item above, then join.
          </p>
        )}
      </div>
    </div>
  );
}

export const HOST_CHECKLIST = [
  { key: 'quiet', label: 'Quiet space ready (door closed, notifications silenced)' },
  { key: 'private', label: 'Private — no one else can overhear the session' },
  { key: 'device', label: 'I will sign in with the doctor Zoom account / allow camera & mic' },
  { key: 'consent', label: 'Client will join with their own Zoom (or guest) — not my login' },
];

export const PATIENT_CHECKLIST = [
  { key: 'quiet', label: 'I am in a quiet space' },
  { key: 'private', label: 'I have privacy for this visit' },
  { key: 'device', label: 'I will use my Zoom account (or guest) — camera / mic ready' },
];
