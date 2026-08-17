/** Shared Zoom / Jitsi join steps — doctor account vs patient account. */

export const ZOOM_HOST_STEPS = [
  {
    title: 'Sign in to YOUR Zoom account (doctor)',
    detail: 'Open the Zoom app or zoom.us and log in with the clinic doctor Zoom email — not the patient’s.',
  },
  {
    title: 'Start the meeting as host',
    detail: 'Use “Start Zoom as host”. Waiting Room stays on so the client cannot enter until you admit them.',
  },
  {
    title: 'Turn on camera & mic',
    detail: 'Allow permissions. Confirm you see Host controls (Admit, Mute, End).',
  },
  {
    title: 'Admit the client',
    detail: 'When the patient joins with their Zoom account (or as guest), click Admit from Waiting Room.',
  },
  {
    title: 'Conduct & end',
    detail: 'When finished, End meeting for all. MindCare does not record the session.',
  },
];

export const ZOOM_PATIENT_STEPS = [
  {
    title: 'Sign in to YOUR Zoom account (optional but recommended)',
    detail: 'Use your personal Zoom login, or join as guest. This is not the doctor’s account.',
  },
  {
    title: 'Join 5 minutes early',
    detail: 'Private room, headphones if possible, stable Wi‑Fi.',
  },
  {
    title: 'Open Join Zoom now',
    detail: 'You enter the Waiting Room — you are not the host. Wait for your therapist to admit you.',
  },
  {
    title: 'Allow camera & microphone',
    detail: 'Choose Allow when Zoom asks.',
  },
  {
    title: 'Start your visit',
    detail: 'After Admit, speak normally. This is a live therapy session.',
  },
];

export const JITSI_HOST_STEPS = [
  {
    title: 'Join the room first',
    detail: 'Open the MindCare Jitsi link so the room is ready before your client arrives.',
  },
  {
    title: 'Allow camera & mic',
    detail: 'Grant browser permissions.',
  },
  {
    title: 'Share join link if needed',
    detail: 'Copy the client link — same room URL for both of you.',
  },
  {
    title: 'Conduct and leave',
    detail: 'When finished, leave the meeting. MindCare does not record.',
  },
];

export const JITSI_PATIENT_STEPS = [
  {
    title: 'Find a private space',
    detail: 'Closed door, headphones preferred, join a few minutes early.',
  },
  {
    title: 'Open Join session',
    detail: 'Opens in your browser — no Zoom account needed.',
  },
  {
    title: 'Allow camera & microphone',
    detail: 'Click Allow when the browser asks.',
  },
  {
    title: 'Wait for your therapist',
    detail: 'Stay in the room until they join, then begin.',
  },
];

export function joinStepsFor(provider, role) {
  const p = provider === 'zoom' ? 'zoom' : 'jitsi';
  if (p === 'zoom') return role === 'host' ? ZOOM_HOST_STEPS : ZOOM_PATIENT_STEPS;
  return role === 'host' ? JITSI_HOST_STEPS : JITSI_PATIENT_STEPS;
}

export function detectProvider(link, settingsProvider) {
  if (settingsProvider === 'zoom' || /^https:\/\/([\w-]+\.)*zoom\.us\//i.test(String(link || ''))) return 'zoom';
  return 'jitsi';
}
