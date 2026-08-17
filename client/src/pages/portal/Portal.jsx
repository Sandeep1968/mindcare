import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Video, Copy, Headphones, Shield } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { copyText, joinWindowLabel, minutesUntil } from '../../lib/videoLaunch';
import VideoJoinGuide, { PATIENT_CHECKLIST } from '../../components/VideoJoinGuide';
import {
  balanceDue,
  fetchMyInvoices,
  fmtDate,
  invoiceStatus,
  money,
  paidAmount,
  printSuperbill,
  statusLabel,
} from '../dashboard/clients/billingStore';

export default function Portal() {
  const { user, loading, logout } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [precheck, setPrecheck] = useState(null);
  const [checks, setChecks] = useState({ quiet: false, private: false, device: false });

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  useEffect(() => {
    if (!user || user.role !== 'patient') return;
    Promise.all([
      fetchMyInvoices().catch((e) => { setError(e.message); return []; }),
      api('/video/mine').catch(() => []),
    ]).then(([inv, vid]) => {
      setInvoices(inv);
      setVideos(vid);
    });
  }, [user]);

  const outstanding = useMemo(() => invoices.reduce((s, i) => s + balanceDue(i), 0), [invoices]);
  const collected = useMemo(() => invoices.reduce((s, i) => s + paidAmount(i), 0), [invoices]);

  if (loading) return <div className="grid min-h-screen place-items-center">Loading…</div>;
  if (!user) return <Navigate to="/dashboard/login?intent=patient" replace />;
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-mc-cream p-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-mc-ink px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BrandLogo className="h-12" />
          <button type="button" onClick={logout} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold text-mc-navy">
            Sign out
          </button>
        </div>

        <div className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">Patient portal</p>
          <h1 className="mt-1 text-xl font-bold text-mc-navy">Hi, {user.name}</h1>
          <p className="mt-2 text-sm text-mc-ink-soft">Your visits and billing with this practice.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-mc-line bg-[#faf7f1] px-4 py-3">
              <div className="text-2xl font-bold text-mc-gold">{money(outstanding)}</div>
              <div className="text-sm font-semibold text-mc-ink">Balance due</div>
            </div>
            <div className="rounded-xl border border-mc-line bg-[#faf7f1] px-4 py-3">
              <div className="text-2xl font-bold text-mc-gold">{money(collected)}</div>
              <div className="text-sm font-semibold text-mc-ink">Paid to date</div>
            </div>
          </div>
        </div>

        <section className="mt-5 rounded-2xl border border-mc-line bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-mc-navy">
            <Video className="h-5 w-5" /> My video visits
          </h2>
          <p className="mt-1 text-sm text-mc-ink-soft">
            Join from a private space in your browser (Jitsi Meet — no Zoom account needed). MindCare does not record your session.
          </p>
          {!videos.length ? (
            <p className="mt-4 text-sm text-mc-ink-soft">No upcoming video visits.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {videos.map((v) => {
                const mins = minutesUntil(v.date, v.time);
                return (
                  <div key={v.id} className="rounded-xl border border-mc-line px-4 py-3">
                    <div className="font-semibold text-mc-ink">{v.reason}</div>
                    <div className="text-sm text-mc-ink-soft">
                      {v.date} · {v.time} · {v.duration} min · {v.therapist}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-mc-navy">{joinWindowLabel(mins)}</div>
                    {v.provider === 'zoom' ? (
                      <p className="mt-1 text-[11px] text-mc-ink-soft">Zoom visit — wait in the Waiting Room until your therapist admits you.</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-mc-ink-soft">Jitsi Meet — opens in your browser. Join the same room as your therapist.</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setChecks({ quiet: false, private: false, device: false });
                          setPrecheck(v);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-mc-navy px-3 py-1.5 text-sm font-bold text-white"
                      >
                        <Video className="h-4 w-4" /> Join session
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyText(v.link);
                          flash('Link copied');
                        }}
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
            <p className="flex gap-2"><Headphones className="mt-0.5 h-4 w-4 shrink-0 text-mc-gold-deep" /> Headphones help privacy and sound quality.</p>
            <p className="flex gap-2"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-mc-gold-deep" /> Use a closed door — this is a clinical visit.</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-mc-line bg-white p-6 shadow-sm" id="portal-billing">
          <h2 className="text-lg font-bold text-mc-navy">My billing</h2>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          {!invoices.length && !error ? (
            <p className="mt-3 text-sm text-mc-ink-soft">No invoices on file yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-mc-line">
              {invoices.map((inv) => {
                const st = invoiceStatus(inv);
                return (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-semibold text-mc-ink">
                        {money(inv.amount)}{' '}
                        <span className={`text-xs font-bold ${st === 'paid' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {statusLabel(st)}
                        </span>
                      </div>
                      <div className="text-xs text-mc-ink-soft">{fmtDate(inv.date)} · {inv.number} · {inv.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => printSuperbill(inv, { name: user.name, id: user.patientId })}
                      className="rounded-lg border border-mc-navy/25 px-3 py-1.5 text-sm font-semibold text-mc-navy"
                    >
                      Print statement
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

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
    </div>
  );
}
