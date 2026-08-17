/** Client-side video launch — Zoom host start vs patient join (separate accounts). */

export function isZoomUrl(url) {
  return /^https:\/\/([\w-]+\.)*zoom\.us\//i.test(String(url || ''));
}

/**
 * Always open the HTTPS Zoom URL in a new tab.
 * zoommtg:// deep-links steal this page and often never start the meeting
 * (no desktop app / blocked protocol). start_url with zak must stay HTTPS.
 */
export function launchVideo(url) {
  if (!url) return false;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(url);
  }
  return true;
}

export async function copyText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  window.prompt('Copy this link:', text);
  return true;
}

export function minutesUntil(dateIso, timeHm) {
  if (!dateIso || !timeHm) return null;
  const [h, m] = String(timeHm).slice(0, 5).split(':').map(Number);
  const when = new Date(`${dateIso}T00:00:00`);
  when.setHours(h, m, 0, 0);
  return Math.round((when.getTime() - Date.now()) / 60000);
}

export function joinWindowLabel(mins) {
  if (mins == null) return '';
  if (mins < -30) return 'Session window passed';
  if (mins < 0) return 'In progress / join now';
  if (mins <= 15) return 'Starting soon — join window open';
  if (mins <= 60) return `Starts in ${mins} min`;
  if (mins < 24 * 60) return `Starts in ${Math.round(mins / 60)} hr`;
  return `Starts in ${Math.round(mins / (24 * 60))} day(s)`;
}
