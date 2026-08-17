import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Copy,
  Settings2,
  Clock,
  Headphones,
  Shield,
  Wifi,
  User,
} from 'lucide-react';
import { api } from '../../lib/api';
import { copyText, joinWindowLabel, minutesUntil } from '../../lib/videoLaunch';
import { dateIsoInZone, getClinicTimeZone } from '../../lib/timezones';
import VideoJoinGuide, { HOST_CHECKLIST } from '../../components/VideoJoinGuide';

const todayIso = () => dateIsoInZone(new Date(), getClinicTimeZone());

export default function VideoVisits() {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState({
    provider: 'zoom',
    zoomLink: '',
    zoomHostEmail: '',
    zoomApiReady: false,
    clinicName: 'MindCare Practice',
    waitingMessage: '',
  });
  const [form, setForm] = useState({ provider: 'zoom', zoomLink: '', zoomHostEmail: '', waitingMessage: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState('');
  const [saving, setSaving] = useState(false);
  const [precheck, setPrecheck] = useState(null);
  const [checks, setChecks] = useState({ quiet: false, private: false, device: false, consent: false });

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const load = useCallback(async () => {
    try {
      const [appts, s] = await Promise.all([
        api('/appointments?filter=upcoming&kind=video'),
        api('/video/settings'),
      ]);
      setRows((appts || []).filter((a) => a.type === 'video' && !['cancelled', 'declined'].includes(a.status)));
      setSettings(s);
      setForm({
        provider: s.provider || 'zoom',
        zoomLink: s.zoomLink || '',
        zoomHostEmail: s.zoomHostEmail || '',
        waitingMessage: s.waitingMessage || '',
      });
      setError('');
    } catch (e) {
      setError(e.message || 'Unable to load video visits');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayIso();
  const stats = useMemo(() => {
    const todayRows = rows.filter((a) => a.date === today);
    const soon = rows.filter((a) => {
      const m = minutesUntil(a.date, a.time);
      return m != null && m >= -15 && m <= 60;
    });
    const missing = rows.filter((a) => !a.link && form.provider === 'zoom' && !form.zoomLink && !settings.zoomApiReady);
    return {
      today: todayRows.length,
      soon: soon.length,
      upcoming: rows.length,
      missing: missing.length,
    };
  }, [rows, today, form.provider, form.zoomLink, settings.zoomApiReady]);

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api('/video/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          provider: form.provider,
          zoomLink: form.zoomLink.trim(),
          zoomHostEmail: form.zoomHostEmail.trim(),
          waitingMessage: form.waitingMessage,
          applyToUpcoming: true,
        }),
      });
      setSettings(res);
      flash(res.message || 'Video settings saved');
      await load();
    } catch (err) {
      flash(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  async function openPrecheck(appt) {
    try {
      const data = await api(`/video/appointments/${appt.id}/join`);
      setChecks({ quiet: false, private: false, device: false, consent: false });
      setPrecheck({
        mode: data.mode || 'join',
        role: 'host',
        appt: { ...appt, link: data.joinUrl || data.link },
        link: data.hostUrl || data.link,
        hostUrl: data.hostUrl,
        joinUrl: data.joinUrl,
        provider: data.provider || settings.provider,
        waitingMessage: data.waitingMessage || settings.waitingMessage,
      });
    } catch (err) {
      flash(err.message || 'Could not prepare session');
    }
  }

  async function startInstant() {
    try {
      const data = await api('/video/instant', { method: 'POST', body: '{}' });
      if (data.joinUrl) await copyText(data.joinUrl);
      setChecks({ quiet: false, private: false, device: false, consent: true });
      setPrecheck({
        mode: data.mode || 'instant',
        role: 'host',
        link: data.hostUrl || data.link,
        hostUrl: data.hostUrl,
        joinUrl: data.joinUrl,
        provider: data.provider || settings.provider,
        waitingMessage: data.waitingMessage || settings.waitingMessage,
      });
      flash(data.message || 'Session ready');
    } catch (err) {
      flash(err.message || 'Configure Zoom link or API keys first');
    }
  }

  async function copyLink(apptOrLink) {
    const link = typeof apptOrLink === 'string' ? apptOrLink : apptOrLink.link;
    const id = typeof apptOrLink === 'string' ? 'x' : apptOrLink.id;
    if (!link) {
      flash('No meeting link yet — save video settings or open Join once');
      return;
    }
    await copyText(link);
    setCopied(id);
    setTimeout(() => setCopied(''), 1600);
    flash('Video link copied — share it with your client');
  }

  const statusHint =
    form.provider === 'zoom' && settings.zoomApiReady && !form.zoomHostEmail
      ? 'Enter the doctor Zoom login email below and Save — meetings cannot start without it.'
      : form.provider === 'zoom' && !form.zoomLink && !settings.zoomApiReady
      ? 'Zoom needs an invite link OR ZOOM_* API keys in server/.env (doctor host account).'
      : form.provider === 'zoom' && settings.zoomApiReady
        ? 'Zoom API active — each visit gets a unique meeting (doctor start + patient join).'
        : form.provider === 'zoom'
          ? 'Zoom PMI — doctor starts with their login; patient joins with theirs.'
          : 'Jitsi active — free browser rooms, no Zoom account needed.';

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-mc-navy">Video Visits</h2>
          <p className="mt-1 max-w-xl text-sm text-mc-ink-soft">
            <strong>Zoom</strong> is the default for virtual visits. Confirmation emails send the patient a Zoom join link and the doctor a host start link.
          </p>
        </div>
        <button
          type="button"
          onClick={startInstant}
          className="inline-flex items-center gap-2 rounded-lg bg-mc-gold px-4 py-2.5 text-sm font-bold text-mc-ink shadow-sm"
        >
          <Video className="h-4 w-4" /> Start session now
        </button>
      </header>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-mc-ink px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}
      {error && (
        <div className="mb-4 flex justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-bold underline">Try Again</button>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat value={String(stats.today)} label="Virtual today" />
        <Stat value={String(stats.soon)} label="Starting within 1 hr" />
        <Stat value={String(stats.upcoming)} label="Upcoming video" />
        <Stat
          value={form.provider === 'jitsi' ? 'Jitsi' : String(stats.missing)}
          label={form.provider === 'jitsi' ? 'Provider ready' : 'Need Zoom link'}
          warn={form.provider === 'zoom' && stats.missing > 0}
        />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-mc-navy/20 bg-mc-navy-soft/50 p-4">
          <h3 className="font-bold text-mc-navy">Doctor — Video Visits</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-mc-ink">
            <li>Keep provider on <strong>Zoom</strong>. Enter the doctor Zoom login email, then Save</li>
            <li>Open the visit → <strong>Join as host</strong> (your doctor Zoom login)</li>
            <li>Patient joins from portal with <strong>their</strong> Zoom login</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-mc-gold/40 bg-mc-gold-soft p-4">
          <h3 className="font-bold text-mc-navy">Patient — portal</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-mc-ink">
            <li>Sign in to the <strong>patient portal</strong></li>
            <li><strong>My video visits</strong> → Join session</li>
            <li>Sign in with <strong>patient Zoom</strong> (or guest) — not the doctor’s</li>
            <li>Wait in Waiting Room until the doctor admits them</li>
          </ol>
        </div>
      </div>

      <form onSubmit={saveSettings} className="mb-5 rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-mc-navy" />
          <h3 className="font-bold text-mc-navy">Video settings</h3>
        </div>
        <p className="mb-4 text-sm text-mc-ink-soft">
          {form.provider === 'jitsi' ? (
            <>
              <strong>Jitsi Meet</strong> — unique browser room per visit. No Zoom accounts needed.
            </>
          ) : (
            <>
              <strong>Zoom (two accounts):</strong> Doctor starts as <em>host</em> with the clinic Zoom login;
              patient joins with <em>their</em> Zoom login (or guest) via a separate join link.
              Best: configure Zoom Server-to-Server OAuth so each visit is a unique meeting.
              Fallback: paste your Personal Meeting <strong>invite</strong> link (<code className="text-xs">zoom.us/j/…</code>).
            </>
          )}
        </p>
        {form.provider === 'zoom' && (
          <p className={`mb-3 rounded-lg px-3 py-2 text-xs font-semibold ${settings.zoomApiReady ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
            {settings.zoomApiReady
              ? 'Zoom API is connected. Enter the doctor Zoom login email below (the email used to sign in to Zoom), then Save. Join as host opens a unique start link; the patient gets a separate join link.'
              : 'Zoom API not configured — using Personal Meeting Room mode. Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET in server/.env, then enter the doctor Zoom email here.'}
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-mc-ink">
            Provider
            <select
              className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            >
              <option value="zoom">Zoom (default — doctor host + patient join)</option>
              <option value="jitsi">Jitsi Meet (browser room, no Zoom account)</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-mc-ink">
            Zoom invite / PMI link (optional fallback)
            <input
              className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal"
              placeholder="https://zoom.us/j/123…?pwd=…"
              value={form.zoomLink}
              onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
              disabled={form.provider !== 'zoom'}
            />
          </label>
        </div>
        {form.provider === 'zoom' && (
          <label className="mt-3 block text-sm font-semibold text-mc-ink">
            Doctor Zoom login email (host) — required to start meetings
            <input
              type="email"
              className="mt-1.5 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal"
              placeholder="doctor@clinic.com"
              value={form.zoomHostEmail}
              onChange={(e) => setForm({ ...form, zoomHostEmail: e.target.value })}
              autoComplete="off"
            />
            <span className="mt-1 block text-xs font-normal text-mc-ink-soft">
              Must match a Zoom user on the same Marketplace account as the API keys. The patient uses a different Zoom login.
            </span>
          </label>
        )}
        <label className="mt-3 block text-sm font-semibold text-mc-ink">
          Waiting-room message (shown to clients before join)
          <textarea
            className="mt-1.5 min-h-16 w-full rounded-lg border border-mc-line px-3 py-2.5 text-sm font-normal"
            value={form.waitingMessage}
            onChange={(e) => setForm({ ...form, waitingMessage: e.target.value })}
            placeholder="Your therapist will admit you shortly…"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={saving} className="rounded-lg bg-mc-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {saving ? 'Saving…' : 'Save video settings'}
          </button>
          <span className={`text-sm ${form.provider === 'zoom' && settings.zoomApiReady && !form.zoomHostEmail ? 'text-amber-700' : 'text-mc-ink-soft'}`}>
            {statusHint}
          </span>
        </div>
      </form>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Tip icon={Headphones} title="Quiet & private" body="Ask clients to use headphones and a closed door — reduces background noise and protects privacy." />
        <Tip icon={Wifi} title="Stable connection" body="Join 5 minutes early. Wired or strong Wi‑Fi beats cellular when possible." />
        <Tip icon={Shield} title="No recording in V1" body="MindCare does not record sessions. Share only the join link — never put PHI in the meeting title." />
      </div>

      <div className="rounded-2xl border border-mc-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mc-line px-5 py-3">
          <h3 className="font-bold text-mc-navy">Upcoming video appointments</h3>
          <Link to="/dashboard/appointments" className="text-sm font-bold text-mc-navy underline">Open Appointments</Link>
        </div>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-mc-ink-soft">
            No upcoming video visits. Schedule a virtual appointment or confirm a website booking as virtual.
          </p>
        ) : (
          rows.map((a) => {
            const mins = minutesUntil(a.date, a.time);
            const window = joinWindowLabel(mins);
            const soon = mins != null && mins <= 15 && mins >= -30;
            return (
              <article key={a.id} className={`flex flex-wrap items-center justify-between gap-3 border-b border-mc-line px-5 py-4 last:border-0 ${soon ? 'bg-mc-gold-soft/40' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-mc-navy">{a.patientName}</span>
                    <span className="rounded-full bg-mc-navy-soft px-2 py-0.5 text-[11px] font-bold text-mc-navy">Virtual</span>
                    {soon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-mc-gold px-2 py-0.5 text-[11px] font-bold text-mc-ink">
                        <Clock className="h-3 w-3" /> Join window
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-mc-ink-soft">
                    {a.date} · {a.time} · {a.duration || 50} min · {a.reason || 'Session'}
                    {a.therapist ? ` · ${a.therapist}` : ''}
                  </div>
                  {window && <div className="mt-0.5 text-xs font-semibold text-mc-ink">{window}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/dashboard/patients/${a.patientId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-mc-line px-3 py-1.5 text-xs font-semibold text-mc-navy"
                  >
                    <User className="h-3.5 w-3.5" /> Client
                  </Link>
                  <button
                    type="button"
                    onClick={() => copyLink(a)}
                    className="inline-flex items-center gap-1 rounded-lg border border-mc-line px-3 py-1.5 text-xs font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied === a.id ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPrecheck(a)}
                    className="inline-flex items-center gap-1 rounded-lg bg-mc-navy px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Video className="h-3.5 w-3.5" /> Join as host
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <VideoJoinGuide
        open={Boolean(precheck)}
        onClose={() => setPrecheck(null)}
        role="host"
        provider={precheck?.provider}
        link={precheck?.link}
        hostUrl={precheck?.hostUrl}
        joinUrl={precheck?.joinUrl}
        mode={precheck?.mode}
        title={precheck?.provider === 'zoom' ? 'Start Zoom as doctor (host)' : 'Join as therapist (host)'}
        subtitle={
          precheck?.appt
            ? `${precheck.appt.patientName} · ${precheck.appt.date} · ${precheck.appt.time}`
            : 'Ad-hoc session — copy patient join link after you start'
        }
        waitingMessage={precheck?.waitingMessage}
        checklist={HOST_CHECKLIST}
        checks={checks}
        onCheckChange={(key, val) => setChecks((c) => ({ ...c, [key]: val }))}
        onJoined={() => flash(
          precheck?.provider === 'zoom'
            ? 'Starting as host — admit the patient when they join with their Zoom account'
            : 'Session launching',
        )}
      />
    </div>
  );
}

function Stat({ value, label, warn }) {
  return (
    <div className="rounded-2xl border border-mc-line bg-white px-4 py-3 shadow-sm">
      <div className={`text-2xl font-bold ${warn ? 'text-amber-700' : 'text-mc-navy'}`}>{value}</div>
      <div className="text-sm font-semibold text-mc-ink-soft">{label}</div>
    </div>
  );
}

function Tip({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-mc-line bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-mc-navy">
        <Icon className="h-4 w-4 text-mc-gold-deep" /> {title}
      </div>
      <p className="mt-1 text-sm text-mc-ink-soft">{body}</p>
    </div>
  );
}
