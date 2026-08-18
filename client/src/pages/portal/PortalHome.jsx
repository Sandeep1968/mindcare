import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Copy, Headphones, Shield, Video } from 'lucide-react';
import { api } from '../../lib/api';
import { copyText, joinWindowLabel, minutesUntil } from '../../lib/videoLaunch';
import VideoJoinGuide, { PATIENT_CHECKLIST } from '../../components/VideoJoinGuide';
import { assignedAssessmentsFor, formatWhen, medicationsFor } from './portalData';
import { balanceDue, money } from '../dashboard/clients/billingStore';

export default function PortalHome() {
  const { me, user } = useOutletContext();
  const patient = me?.patient;
  const [videos, setVideos] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [precheck, setPrecheck] = useState(null);
  const [checks, setChecks] = useState({ quiet: false, private: false, device: false });
  const [toast, setToast] = useState('');

  useEffect(() => {
    api('/video/mine').then(setVideos).catch(() => setVideos([]));
    api('/billing/mine').then(setInvoices).catch(() => setInvoices([]));
  }, []);

  const nextSession = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (me?.appointments || [])
      .filter((a) => a.date >= today && !['cancelled', 'declined', 'completed', 'no-show'].includes(a.status))
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0] || null;
  }, [me]);

  const pendingAssessments = assignedAssessmentsFor(user?.patientId).filter((a) => a.status === 'pending').length;
  const currentMeds = medicationsFor(user?.patientId).filter((m) => m.status === 'current').length;
  const balance = invoices.reduce((s, i) => s + balanceDue(i), 0);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  if (!me) return <p className="text-sm text-mc-ink-soft">Loading your care…</p>;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-mc-ink px-4 py-2 text-sm font-semibold text-white">{toast}</div>
      )}
      <section className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">My care</p>
        <h2 className="mt-1 text-2xl font-bold text-mc-navy">Hi, {patient?.name || user.name}</h2>
        <p className="mt-1 text-sm text-mc-ink-soft">
          Therapist: <strong className="text-mc-ink">{patient?.therapist || '—'}</strong>
          {patient?.primary_concern ? ` · ${patient.primary_concern}` : ''}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Balance due" value={money(balance)} to="/dashboard/portal/billing" />
          <Stat label="Assessments to complete" value={String(pendingAssessments)} to="/dashboard/portal/assessments" />
          <Stat label="Current prescriptions" value={String(currentMeds)} to="/dashboard/portal/prescriptions" />
        </div>
      </section>

      <section className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-bold text-mc-navy"><Video className="h-5 w-5" /> Next session</h3>
        {!nextSession ? (
          <p className="mt-2 text-sm text-mc-ink-soft">No upcoming session on your schedule.</p>
        ) : (
          <div className="mt-3 rounded-xl border border-mc-line px-4 py-3">
            <div className="font-semibold text-mc-ink">{nextSession.reason}</div>
            <div className="text-sm text-mc-ink-soft">
              {formatWhen(nextSession.date, nextSession.time)} · {nextSession.duration} min · {nextSession.type === 'video' ? 'Video' : 'In-person'} · {nextSession.therapist}
            </div>
          </div>
        )}

        <h4 className="mt-5 text-sm font-bold text-mc-navy">Join video visit</h4>
        <p className="mt-1 text-sm text-mc-ink-soft">Only your upcoming video sessions appear here.</p>
        {!videos.length ? (
          <p className="mt-3 text-sm text-mc-ink-soft">No upcoming video visits.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {videos.map((v) => {
              const mins = minutesUntil(v.date, v.time);
              return (
                <div key={v.id} className="rounded-xl border border-mc-line px-4 py-3">
                  <div className="font-semibold">{v.reason}</div>
                  <div className="text-sm text-mc-ink-soft">{v.date} · {v.time} · {v.therapist}</div>
                  <div className="mt-1 text-xs font-semibold text-mc-navy">{joinWindowLabel(mins)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setChecks({ quiet: false, private: false, device: false }); setPrecheck(v); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-mc-navy px-3 py-1.5 text-sm font-bold text-white"
                    >
                      <Video className="h-4 w-4" /> Join session
                    </button>
                    <button
                      type="button"
                      onClick={async () => { await copyText(v.link); flash('Link copied'); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-mc-line px-3 py-1.5 text-sm font-semibold"
                    >
                      <Copy className="h-4 w-4" /> Copy link
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 grid gap-2 text-sm text-mc-ink-soft sm:grid-cols-2">
          <p className="flex gap-2"><Headphones className="mt-0.5 h-4 w-4 shrink-0 text-mc-gold-deep" /> Headphones help privacy and sound.</p>
          <p className="flex gap-2"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-mc-gold-deep" /> Use a private room for your visit.</p>
        </div>
      </section>

      <VideoJoinGuide
        open={Boolean(precheck)}
        onClose={() => setPrecheck(null)}
        role="patient"
        provider={precheck?.provider}
        link={precheck?.joinUrl || precheck?.link}
        hostUrl={precheck?.hostUrl}
        joinUrl={precheck?.joinUrl || precheck?.link}
        mode={precheck?.mode}
        title="Join your video visit"
        subtitle={precheck ? `${precheck.date} · ${precheck.time} · ${precheck.therapist}` : ''}
        waitingMessage={precheck?.waitingMessage || 'Your therapist will admit you shortly.'}
        checklist={PATIENT_CHECKLIST}
        checks={checks}
        onCheckChange={(key, val) => setChecks((c) => ({ ...c, [key]: val }))}
        onJoined={() => flash('Opening your session…')}
      />

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    if (newPassword !== confirm) {
      setMsg('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrent('');
      setNew('');
      setConfirm('');
      setMsg('Password updated.');
    } catch (err) {
      setMsg(err.message || 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm">
      <h3 className="font-bold text-mc-navy">Portal password</h3>
      <p className="mt-1 text-sm text-mc-ink-soft">Change the password you use to sign in to this portal.</p>
      <form onSubmit={onSubmit} className="mt-4 grid max-w-md gap-3">
        <label className="block text-xs font-semibold text-mc-ink-soft">Current password
          <input required type="password" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-mc-ink-soft">New password
          <input required minLength={6} type="password" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-mc-ink-soft">Confirm new password
          <input required minLength={6} type="password" className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {msg && <p className={`text-sm ${msg === 'Password updated.' ? 'text-emerald-800' : 'text-red-700'}`}>{msg}</p>}
        <button disabled={busy} className="w-fit rounded-lg bg-mc-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          Update password
        </button>
      </form>
    </section>
  );
}

function Stat({ label, value, to }) {
  return (
    <Link to={to} className="rounded-xl border border-mc-line bg-[#faf7f1] px-4 py-3">
      <div className="text-2xl font-bold text-mc-navy">{value}</div>
      <div className="text-sm font-semibold text-mc-ink">{label}</div>
    </Link>
  );
}
