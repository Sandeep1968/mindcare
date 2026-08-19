import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CalendarCheck2,
  FileText,
  Users,
  ShieldCheck,
  Mail,
  Video,
  MapPin,
  Bell,
  MessageSquare,
  ChevronRight,
  Sun,
  Moon,
  StickyNote,
  UserPlus,
  CalendarPlus,
  Contact,
  Send,
  BarChart3,
  MoreVertical,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { balanceDue, invoiceStatus, loadInvoices, loadInvoicesFromApi, money } from './clients/billingStore';
import { avatarColor, initials } from './clients/clientData';

function formatDateLabel(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function messageWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatCard({ icon: Icon, label, value, hint, tone }) {
  const tones = {
    amber: { wrap: 'from-[#fff6e8] to-[#ffe8c8] border-[#f0d6a0]', icon: 'bg-[#ffb81c]/25 text-[#9a6b00]' },
    blue: { wrap: 'from-[#eef5fc] to-[#dceaf8] border-[#c5d9ef]', icon: 'bg-[#003e7e]/12 text-mc-navy' },
    yellow: { wrap: 'from-[#fffbeb] to-[#fef3c7] border-[#f5e6a8]', icon: 'bg-[#fde68a] text-[#92400e]' },
    sky: { wrap: 'from-[#f0f7ff] to-[#e0effc] border-[#bdd8f3]', icon: 'bg-[#93c5fd]/40 text-[#1e3a8a]' },
    peach: { wrap: 'from-[#fff4ec] to-[#ffe4d1] border-[#f5c9a8]', icon: 'bg-[#fdba74]/35 text-[#9a3412]' },
  };
  const t = tones[tone] || tones.blue;
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${t.wrap}`}>
      <div className="mb-3 flex items-start justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
      </div>
      <div className="text-[1.75rem] font-bold leading-none tracking-tight text-mc-navy">{value}</div>
      <div className="mt-2 text-[13px] font-bold text-mc-ink">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-mc-ink-soft">{hint}</div>}
    </div>
  );
}

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = new Date(`${value}T12:00:00`);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const days = useMemo(() => {
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    const startPad = (start.getDay() + 6) % 7; // Mon-first
    const grid = [];
    for (let i = 0; i < startPad; i += 1) grid.push(null);
    const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= dim; d += 1) {
      const iso = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push(iso);
    }
    return grid;
  }, [view]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2.5 rounded-2xl border border-[#e5dcc8] bg-white px-4 py-3 shadow-sm transition hover:border-mc-navy/30"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mc-navy-soft text-mc-navy">
          <CalendarDays className="h-[18px] w-[18px]" />
        </span>
        <div className="text-left">
          <div className="text-[13px] font-bold text-mc-navy">{formatDateLabel(value)}</div>
          <div className="text-[11px] text-mc-ink-soft">Tap to change date</div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-[110%] z-40 w-[300px] rounded-2xl border border-[#e5dcc8] bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="rounded-lg px-2 py-1 text-sm font-bold text-mc-navy hover:bg-[#f3f5f8]" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>‹</button>
            <div className="text-sm font-bold text-mc-navy">
              {view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" className="rounded-lg px-2 py-1 text-sm font-bold text-mc-navy hover:bg-[#f3f5f8]" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-mc-ink-soft">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((iso, i) => {
              if (!iso) return <div key={`e-${i}`} />;
              const active = iso === value;
              const isToday = iso === new Date().toISOString().slice(0, 10);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`rounded-lg py-2 text-[12px] font-semibold ${
                    active ? 'bg-mc-navy text-white' : isToday ? 'bg-mc-gold-soft text-mc-gold-deep' : 'text-mc-ink hover:bg-[#f3f5f8]'
                  }`}
                >
                  {Number(iso.slice(-2))}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-[#e5dcc8] py-1.5 text-xs font-bold text-mc-navy"
            onClick={() => { onChange(new Date().toISOString().slice(0, 10)); setOpen(false); }}
          >
            Jump to today
          </button>
        </div>
      )}
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [week, setWeek] = useState([]);
  const [error, setError] = useState('');

  const [localData, setLocalData] = useState({ notes: [], plans: [] });
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    api('/clinical/bundle')
      .then((b) => setLocalData({ notes: b.notes || [], plans: b.plans || [] }))
      .catch(() => {});
    api('/messages')
      .then((rows) => setMessages(Array.isArray(rows) ? rows : []))
      .catch(() => setMessages([]));
  }, []);
  const { notes, plans } = localData;

  const load = useCallback(() => {
    api(`/dashboard/overview?date=${selectedDate}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api('/appointments?filter=upcoming')
      .then((rows) => {
        const map = {};
        rows.forEach((a) => { map[a.date] = (map[a.date] || 0) + 1; });
        const days = [];
        for (let i = 1; i <= 4; i += 1) {
          const d = new Date(`${selectedDate}T12:00:00`);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          days.push({
            key,
            label: d.toLocaleDateString(undefined, { weekday: 'short' }),
            dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            count: map[key] || 0,
          });
        }
        setWeek(days);
      })
      .catch(() => {});
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadInvoicesFromApi().catch(() => {}); }, []);

  const pendingNotes = notes.length;
  const followUps = 3;
  const treatmentReviews = plans.filter((p) => p.status === 'active').length;
  const unread = messages.filter((m) => m.status === 'unread').length;

  const attention = useMemo(() => {
    const items = [];
    if (pendingNotes) items.push({ to: '/dashboard/clinical/notes', title: `${pendingNotes} clinical notes pending`, Icon: FileText });
    if (treatmentReviews) items.push({ to: '/dashboard/clinical/plans', title: `${treatmentReviews} treatment plan review due`, Icon: ShieldCheck });
    if (data?.newRequests) items.push({ to: '/dashboard/bookings', title: `${data.newRequests} website booking${data.newRequests === 1 ? '' : 's'} to review`, Icon: CalendarCheck2 });
    if (unread) items.push({ to: '/dashboard/communication', title: `${unread} unread client messages`, Icon: Mail });
    /* loadInvoices reads localStorage — only called when attention recomputes (data/unread changes) */
    const unpaid = loadInvoices().filter((i) => invoiceStatus(i) !== 'paid');
    unpaid.slice(0, 3).forEach((inv) => {
      items.push({
        to: '/dashboard/billing',
        title: `Payment due — ${inv.patient} (${money(balanceDue(inv))})`,
        Icon: BarChart3,
      });
    });
    return items;
  }, [pendingNotes, treatmentReviews, data, unread]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-mc-ink-soft">Loading dashboard…</p>;

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = user.name.replace(/^Dr\.\s*/i, '').split(' ')[0];
  const scheduleRows = data.today || [];
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-[1.65rem] font-bold tracking-tight text-mc-navy">
            {hello}, {user.role === 'practitioner' || user.role === 'admin' ? `Dr. ${first}` : first}
            {hour < 18 ? <Sun className="h-6 w-6 text-mc-gold" /> : <Moon className="h-5 w-5 text-mc-navy" />}
          </h2>
          <p className="mt-1 text-[14px] text-mc-ink-soft">
            {isToday ? "Here’s what’s happening in your practice today." : `Appointments for ${formatDateLabel(selectedDate)}.`}
          </p>
        </div>
        <DatePicker value={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CalendarCheck2} label="Today's Sessions" value={data.todayCount} hint={`${data.videoToday} virtual · ${data.inPersonToday} in-person`} tone="amber" />
        <StatCard icon={FileText} label="Pending Notes" value={pendingNotes} hint="Needs your attention" tone="blue" />
        <StatCard icon={Users} label="Follow-ups" value={followUps} hint="Due this week" tone="yellow" />
        <StatCard icon={ShieldCheck} label="Treatment Reviews" value={treatmentReviews} hint="Due this week" tone="sky" />
        <StatCard icon={Mail} label="Unread Messages" value={unread} hint="From clients" tone="peach" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-[#e5dcc8] bg-white shadow-sm">
          <div className="flex items-center justify-between bg-mc-navy px-5 py-3.5 text-white">
            <h3 className="inline-flex items-center gap-2 text-[15px] font-bold">
              <CalendarDays className="h-4 w-4" />
              {isToday ? "Today’s Schedule" : 'Selected day schedule'}
            </h3>
            <Link to="/dashboard/appointments" className="text-[12px] font-bold text-white/90 hover:underline">
              Open Appointments →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {!scheduleRows.length ? (
              <p className="p-6 text-sm text-mc-ink-soft">No appointments on this date. Add one from Appointments.</p>
            ) : (
              <table className="w-full min-w-[680px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#f0e8d8] text-[11px] uppercase tracking-wide text-mc-ink-soft">
                    <th className="px-5 py-3 font-bold">Time</th>
                    <th className="px-3 py-3 font-bold">Client</th>
                    <th className="px-3 py-3 font-bold">Type</th>
                    <th className="px-3 py-3 font-bold">Location</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((a) => (
                    <tr key={a.id} className="border-b border-[#f3ece0] last:border-0">
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-mc-navy">{a.time}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: avatarColor(a.patientName) }}>
                            {initials(a.patientName)}
                          </span>
                          <span className="font-semibold text-mc-ink">{a.patientName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-mc-ink-soft">{a.reason || 'Session'}</td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-mc-ink">
                          {a.type === 'video' ? <Video className="h-3.5 w-3.5 text-mc-navy" /> : <MapPin className="h-3.5 w-3.5 text-mc-gold-deep" />}
                          {a.type === 'video' ? 'Virtual' : 'In-person'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${(a.status || 'confirmed') === 'pending' ? 'bg-[#fff3d6] text-mc-gold-deep' : 'bg-[#e4eef8] text-mc-navy'}`}>
                          {(a.status || 'confirmed').charAt(0).toUpperCase() + (a.status || 'confirmed').slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {a.type === 'video' ? (
                            <Link to="/dashboard/video" className="rounded-lg bg-mc-navy px-3 py-1.5 text-[12px] font-bold text-white">Join Session</Link>
                          ) : (
                            <Link to="/dashboard/patients" className="rounded-lg border border-[#d8cdb8] px-3 py-1.5 text-[12px] font-bold text-mc-navy">View Client</Link>
                          )}
                          <button type="button" className="rounded-lg p-1 text-mc-ink-soft hover:bg-[#f7f1e6]" aria-label="More"><MoreVertical className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="border-t border-[#eee6d8] px-5 py-3 text-center">
            <Link to="/dashboard/appointments" className="text-[13px] font-bold text-mc-navy hover:underline">View all appointments →</Link>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-[15px] font-bold text-mc-navy">
                <Bell className="h-4 w-4" /> Needs Your Attention
              </h3>
              <span className="rounded-full bg-mc-navy-soft px-2 py-0.5 text-[11px] font-bold text-mc-navy">{attention.length} items</span>
            </div>
            <ul className="space-y-2">
              {attention.map((item) => (
                <li key={item.title}>
                  <Link to={item.to} className="flex items-center gap-3 rounded-xl border border-[#eee6d8] bg-[#fffdf8] px-3 py-3 transition hover:border-mc-navy/25 hover:bg-mc-navy-soft/40">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-mc-navy shadow-sm">
                      <item.Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-mc-ink">{item.title}</span>
                    <ChevronRight className="h-4 w-4 text-mc-navy" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/dashboard/clinical/notes" className="mt-3 inline-block text-[12px] font-bold text-mc-navy hover:underline">View all tasks →</Link>
          </section>

          <section className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-[15px] font-bold text-mc-navy">
                <MessageSquare className="h-4 w-4" /> Recent Messages
              </h3>
              <Link to="/dashboard/communication" className="text-[12px] font-bold text-mc-navy hover:underline">View all</Link>
            </div>
            <ul className="space-y-3">
              {messages.slice(0, 4).map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: avatarColor(m.patientName) }}>
                    {initials(m.patientName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-[13px] ${m.status === 'unread' ? 'font-bold text-mc-navy' : 'font-semibold text-mc-ink'}`}>{m.patientName}</span>
                      <span className="shrink-0 text-[11px] text-mc-ink-soft">{messageWhen(m.lastAt)}</span>
                    </div>
                    <p className="truncate text-[12px] text-mc-ink-soft">{m.thread?.[m.thread.length - 1]?.text || m.subject}</p>
                  </div>
                  {m.status === 'unread' && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-mc-navy" />}
                </li>
              ))}
              {!messages.length && (
                <li className="text-sm text-mc-ink-soft">No portal messages yet.</li>
              )}
            </ul>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[15px] font-bold text-mc-navy">Upcoming This Week</h3>
          <ul className="space-y-2">
            {week.map((d) => (
              <li key={d.key}>
                <button type="button" onClick={() => setSelectedDate(d.key)} className="flex w-full items-center justify-between rounded-xl bg-[#f7f1e6]/70 px-3 py-2.5 text-left hover:bg-mc-navy-soft/50">
                  <div>
                    <span className="font-bold text-mc-navy">{d.label}</span>
                    <span className="ml-2 text-[12px] text-mc-ink-soft">{d.dateLabel}</span>
                  </div>
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-mc-navy-soft px-2.5 py-1 text-[12px] font-bold text-mc-navy">{d.count} sessions</span>
                    <ChevronRight className="h-4 w-4 text-mc-navy" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[15px] font-bold text-mc-navy">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['New Clinical Note', '/dashboard/clinical/notes', StickyNote],
              ['Add Client', '/dashboard/patients', UserPlus],
              ['Schedule Appointment', '/dashboard/appointments', CalendarPlus],
              ['Client List', '/dashboard/patients', Contact],
              ['Send Message', '/dashboard/communication', Send],
              ['View Reports', '/dashboard/reports', BarChart3],
            ].map(([label, to, Icon]) => (
              <Link key={label} to={to} className="flex flex-col items-center gap-2 rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-3 text-center text-[12px] font-bold text-mc-navy transition hover:border-mc-navy/30 hover:bg-mc-navy-soft/50">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
