import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  MapPin,
  Globe,
  List,
  Search,
  X,
  Clock,
  User,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Download,
  CalendarPlus,
  Ban,
  Phone,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { api } from '../../lib/api';
import { copyText } from '../../lib/videoLaunch';
import { appointmentGoogleLinks, busyFeedUrl } from '../../lib/calendarLinks';
import { formatClock, formatDualTime, getClinicTimeZone, INDIA_TZ, tzShortLabel } from '../../lib/timezones';
import VideoJoinGuide, { HOST_CHECKLIST } from '../../components/VideoJoinGuide';

const VIEW_KEY = 'mindcare.appt.view';
const DATE_KEY = 'mindcare.appt.date';

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIso(iso) {
  return new Date(`${iso}T12:00:00`);
}

function formatDayTitle(iso) {
  return parseIso(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function avatarColor(name = '') {
  const colors = ['#003e7e', '#c48900', '#2f5d8c', '#8a6a1a', '#4279b0'];
  let n = 0;
  for (let i = 0; i < name.length; i += 1) n += name.charCodeAt(i);
  return colors[n % colors.length];
}

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function statusTone(status) {
  switch (status) {
    case 'pending': return 'bg-[#fff3d6] text-mc-gold-deep';
    case 'declined':
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'no-show': return 'bg-orange-100 text-orange-800';
    case 'completed': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-[#e4eef8] text-mc-navy';
  }
}

function labelStatus(s) {
  if (!s) return 'Confirmed';
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function toMinutes(t) {
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

const EMPTY_FORM = {
  patientId: '',
  patientName: '',
  patientEmail: '',
  date: '',
  time: '10:00',
  duration: 50,
  type: 'video',
  reason: '',
  status: 'confirmed',
  therapist: 'Dr. Sarah Williams',
  adminNote: '',
  force: false,
};

export default function Appointments() {
  const today = toIso(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'month');
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem(DATE_KEY) || today);
  const [cursor, setCursor] = useState(() => {
    const d = parseIso(localStorage.getItem(DATE_KEY) || today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, date: today });
  const [busySlots, setBusySlots] = useState([]);
  const [calendarDone, setCalendarDone] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reschedule, setReschedule] = useState(null);
  const [cancelFlow, setCancelFlow] = useState(null);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(DATE_KEY, selectedDate); }, [selectedDate]);

  const load = useCallback(async () => {
    try {
      const [filtered, all, bookings, pts] = await Promise.all([
        api(`/appointments?filter=all&kind=${kind}&status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
        api('/appointments?filter=all'),
        api('/bookings?status=new&kind=all').catch(() => []),
        api('/patients').catch(() => []),
      ]);
      setRows(filtered);
      setAllRows(all);
      setPendingRequests(bookings.length || 0);
      setPatients(pts);
      setError('');
      setSelected((prev) => {
        if (!prev) return null;
        return filtered.find((a) => a.id === prev.id) || all.find((a) => a.id === prev.id) || null;
      });
    } catch (e) {
      setError(e.message);
    }
  }, [kind, status, q]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showAdd || !form.date || !form.therapist) {
      setBusySlots([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api(`/notifications/busy?therapist=${encodeURIComponent(form.therapist)}&from=${form.date}&to=${form.date}`);
        if (!cancelled) setBusySlots(data.slots || []);
      } catch {
        if (!cancelled) setBusySlots([]);
      }
    })();
    return () => { cancelled = true; };
  }, [showAdd, form.date, form.therapist]);

  useEffect(() => {
    const client = searchParams.get('client') || searchParams.get('patient');
    const book = searchParams.get('book');
    if (!client || book !== '1') return;
    if (!patients.length) return;
    const match = patients.find((p) => p.id === client);
    setForm({
      ...EMPTY_FORM,
      date: selectedDate,
      patientId: client,
      therapist: match?.therapist || EMPTY_FORM.therapist,
    });
    setConflict(null);
    setShowAdd(true);
    const next = new URLSearchParams(searchParams);
    next.delete('book');
    next.delete('client');
    next.delete('patient');
    setSearchParams(next, { replace: true });
  }, [patients, searchParams, selectedDate, setSearchParams]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  function describeNotify(notify) {
    if (!notify) return 'Appointment created';
    const bits = [];
    if (notify.notified?.patient) bits.push('client emailed');
    else if (notify.emails?.patient?.reason) bits.push('no client email on file');
    if (notify.notified?.therapist) bits.push('therapist emailed + calendar hold');
    const mode = notify.mode === 'smtp' ? '' : ' (demo outbox)';
    return bits.length ? `Booked — ${bits.join('; ')}${mode}` : `Appointment created${mode}`;
  }

  const insights = useMemo(() => {
    const todays = allRows.filter((a) => a.date === today && !['cancelled', 'declined'].includes(a.status));
    const confirmed = todays.filter((a) => a.status === 'confirmed' || a.status === 'completed').length;
    const pending = allRows.filter((a) => a.status === 'pending').length + pendingRequests;
    const weekStart = parseIso(today);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const ws = toIso(weekStart);
    const we = toIso(weekEnd);
    const weekCount = allRows.filter((a) => a.date >= ws && a.date <= we && !['cancelled', 'declined'].includes(a.status)).length;
    const needs = allRows.filter((a) => a.status === 'pending').length + pendingRequests;
    return {
      todayCount: todays.length,
      confirmed,
      pendingAppts: todays.filter((a) => a.status === 'pending').length,
      declined: todays.filter((a) => a.status === 'declined').length,
      weekCount,
      needs,
      pendingTotal: pending,
    };
  }, [allRows, today, pendingRequests]);

  const dayRows = useMemo(
    () => rows.filter((a) => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [rows, selectedDate],
  );

  const countsByDate = useMemo(() => {
    const map = {};
    rows.forEach((a) => { map[a.date] = (map[a.date] || 0) + 1; });
    return map;
  }, [rows]);

  const calendarDays = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = (start.getDay() + 6) % 7;
    const grid = [];
    for (let i = 0; i < startPad; i += 1) grid.push(null);
    const dim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= dim; d += 1) {
      grid.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return grid;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const base = parseIso(selectedDate);
    const pad = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - pad);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return toIso(d);
    });
  }, [selectedDate]);

  const nextUpcoming = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return allRows
      .filter((a) => a.date >= today && !['cancelled', 'declined', 'no-show'].includes(a.status))
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .find((a) => a.date > today || toMinutes(a.time) >= nowMin) || null;
  }, [allRows, today]);

  function shiftDate(delta) {
    const d = parseIso(selectedDate);
    d.setDate(d.getDate() + delta);
    const iso = toIso(d);
    setSelectedDate(iso);
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  async function createAppointment(force = false) {
    setBusy(true);
    setError('');
    setConflict(null);
    try {
      const payload = {
        ...form,
        force,
        patientId: form.patientId || undefined,
        patientName: form.patientId ? undefined : form.patientName.trim(),
        patientEmail: form.patientId ? undefined : (form.patientEmail || undefined),
      };
      const created = await api('/appointments', { method: 'POST', body: JSON.stringify(payload) });
      setShowAdd(false);
      setForm({ ...EMPTY_FORM, date: form.date });
      setSelectedDate(form.date);
      flash(describeNotify(created.notify));
      setCalendarDone({
        appt: created,
        googleCalendar: created.notify?.googleCalendar || appointmentGoogleLinks(created),
        mode: created.notify?.mode,
      });
      await load();
    } catch (err) {
      if (err.status === 409 && err.data?.conflicts) {
        setConflict(err.data);
      } else {
        try {
          const c = await api(`/appointments/conflicts?date=${form.date}&time=${form.time}&duration=${form.duration}&therapist=${encodeURIComponent(form.therapist || '')}`);
          if (!c.available) setConflict(c);
          else setError(err.message);
        } catch {
          setError(err.message);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function onAddSubmit(e) {
    e.preventDefault();
    await createAppointment(false);
  }

  async function setStatusOf(id, next, extra = {}) {
    setBusy(true);
    try {
      await api(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next, ...extra }) });
      flash(`Marked ${labelStatus(next).toLowerCase()}`);
      setCancelFlow(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveReschedule(e) {
    e.preventDefault();
    setBusy(true);
    setConflict(null);
    try {
      const updated = await api(`/appointments/${reschedule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date: reschedule.date, time: reschedule.time, status: 'confirmed' }),
      });
      flash(updated.notify ? describeNotify(updated.notify).replace('Booked', 'Rescheduled') : 'Appointment rescheduled');
      if (updated.notify?.googleCalendar) {
        setCalendarDone({
          appt: updated,
          googleCalendar: updated.notify.googleCalendar,
          mode: updated.notify.mode,
        });
      }
      setReschedule(null);
      setSelectedDate(reschedule.date);
      await load();
    } catch (err) {
      try {
        const c = await api(`/appointments/conflicts?date=${reschedule.date}&time=${reschedule.time}&excludeId=${reschedule.id}`);
        if (!c.available) setConflict(c);
        else setError(err.message);
      } catch {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setKind('all');
    setStatus('all');
    setQ('');
  }

  const titleRange = view === 'week'
    ? `${parseIso(weekDays[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${parseIso(weekDays[6]).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : view === 'day'
      ? formatDayTitle(selectedDate)
      : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const calendarMode = view === 'list' ? 'list' : 'calendar';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-mc-navy">Appointments</h2>
          <p className="mt-1 text-sm text-mc-ink-soft">Manage visits, website requests, and changes. Times use clinic timezone (US Eastern by default); India IST is shown with each slot.</p>
          <p className="mt-1 text-xs font-semibold text-mc-navy">
            Clinic {tzShortLabel(getClinicTimeZone())}: {formatClock(new Date(), getClinicTimeZone())}
            {' · '}
            IST: {formatClock(new Date(), INDIA_TZ)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/bookings" className="inline-flex items-center gap-2 rounded-xl border border-[#e5dcc8] bg-white px-3 py-2 text-sm font-semibold text-mc-navy">
            <Globe className="h-4 w-4" />
            Website requests
            {pendingRequests > 0 && (
              <span className="rounded-full bg-mc-navy px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingRequests}</span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => { setForm({ ...EMPTY_FORM, date: selectedDate }); setConflict(null); setShowAdd(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink"
          >
            <Plus className="h-4 w-4" /> Add appointment
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today's appointments", value: insights.todayCount, hint: insights.confirmed ? `${insights.confirmed} confirmed` : 'No confirmations yet', onClick: () => { setSelectedDate(today); setStatus('all'); setView('day'); } },
          { label: 'Confirmed', value: insights.confirmed, hint: insights.todayCount ? `${Math.round((insights.confirmed / Math.max(insights.todayCount, 1)) * 100)}% of today` : '—', onClick: () => { setSelectedDate(today); setStatus('confirmed'); } },
          { label: 'Pending', value: insights.pendingTotal, hint: pendingRequests ? `${pendingRequests} website` : 'Needs review', onClick: () => setStatus('pending') },
          { label: 'Needs attention', value: insights.needs, hint: `${insights.weekCount} this week`, onClick: () => setStatus('pending') },
        ].map((m) => (
          <button key={m.label} type="button" onClick={m.onClick} className="rounded-2xl border border-[#e5dcc8] bg-white px-4 py-3 text-left shadow-sm transition hover:border-mc-navy/30">
            <div className="text-[11px] font-bold uppercase tracking-wide text-mc-ink-soft">{m.label}</div>
            <div className="mt-1 text-2xl font-bold text-mc-navy">{m.value}</div>
            <div className="text-[11px] text-mc-ink-soft">{m.hint}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e5dcc8] bg-white p-3">
        <div className="inline-flex rounded-xl bg-[#f3f5f8] p-1">
          <button type="button" onClick={() => setView(view === 'list' ? 'month' : view)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${calendarMode === 'calendar' ? 'bg-mc-navy text-white' : 'text-mc-ink-soft'}`}>
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
          <button type="button" onClick={() => setView('list')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${view === 'list' ? 'bg-mc-navy text-white' : 'text-mc-ink-soft'}`}>
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
        {view !== 'list' && (
          <div className="inline-flex rounded-xl border border-[#e5dcc8] p-1">
            {['day', 'week', 'month'].map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${view === v ? 'bg-mc-gold-soft text-mc-gold-deep' : 'text-mc-ink-soft'}`}>
                {v}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => shiftDate(view === 'week' ? -7 : -1)} className="rounded-lg border border-[#e5dcc8] p-2" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => { setSelectedDate(today); setCursor(new Date()); }} className="rounded-lg border border-[#e5dcc8] px-3 py-1.5 text-sm font-semibold">Today</button>
        <button type="button" onClick={() => shiftDate(view === 'week' ? 7 : 1)} className="rounded-lg border border-[#e5dcc8] p-2" aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
        <span className="px-2 text-sm font-bold text-mc-navy">{titleRange}</span>

        <select value={kind} onChange={(e) => setKind(e.target.value)} className="ml-auto rounded-xl border border-[#e5dcc8] bg-white px-3 py-2 text-sm font-semibold" aria-label="Visit type">
          <option value="all">All types</option>
          <option value="video">Virtual</option>
          <option value="in-person">In-person</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[#e5dcc8] bg-white px-3 py-2 text-sm font-semibold" aria-label="Status">
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="declined">Declined</option>
          <option value="no-show">No-show</option>
        </select>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mc-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients, service…" className="w-full rounded-xl border border-[#e5dcc8] py-2 pl-9 pr-8 text-sm" />
          {q && <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-mc-ink-soft" onClick={() => setQ('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </div>
        {(kind !== 'all' || status !== 'all' || q) && (
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-mc-navy underline">Clear filters</button>
        )}
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
      {toast && <p className="rounded-xl border border-mc-navy/20 bg-mc-navy-soft px-3 py-2 text-sm font-semibold text-mc-navy" aria-live="polite">{toast}</p>}

      {calendarDone && (
        <div className="rounded-2xl border border-mc-gold/50 bg-mc-gold-soft px-4 py-3 text-sm text-mc-ink">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-mc-navy">Calendar + email sent</p>
              <p className="mt-0.5 text-mc-ink-soft">
                Client and therapist received confirmation{calendarDone.mode === 'demo' ? ' (saved to demo outbox until real email is connected)' : ''}.
                Therapist invite marks the slot <strong>busy</strong> so overlapping bookings are avoided.
              </p>
            </div>
            <button type="button" className="text-xs font-bold text-mc-navy" onClick={() => setCalendarDone(null)}>Dismiss</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={calendarDone.googleCalendar.therapist} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-mc-navy px-3 py-2 text-xs font-bold text-white">
              <CalendarPlus className="h-3.5 w-3.5" /> Block on Google Calendar
            </a>
            <a href={calendarDone.googleCalendar.patient} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#e5dcc8] bg-white px-3 py-2 text-xs font-bold text-mc-navy">
              Client Google Calendar link
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-[#e5dcc8] bg-white px-3 py-2 text-xs font-bold text-mc-navy"
              onClick={async () => {
                const url = busyFeedUrl(calendarDone.appt?.therapist || form.therapist);
                await copyText(url);
                flash('Busy-feed URL copied — paste in Google Calendar → Other calendars → From URL');
              }}
            >
              Copy therapist busy feed
            </button>
          </div>
        </div>
      )}

      {view === 'list' ? (
        <section className="rounded-2xl border border-[#e5dcc8] bg-white shadow-sm">
          <DayList rows={rows} onOpen={setSelected} q={q} />
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[240px_1fr_260px]">
          <section className="rounded-2xl border border-[#e5dcc8] bg-white p-3 shadow-sm">
            {view === 'month' && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <button type="button" className="rounded-lg p-1.5 hover:bg-[#f3f5f8]" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
                  <div className="text-sm font-bold text-mc-navy">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
                  <button type="button" className="rounded-lg p-1.5 hover:bg-[#f3f5f8]" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
                </div>
                <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold text-mc-ink-soft">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <div key={d}>{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((iso, i) => {
                    if (!iso) return <div key={`e-${i}`} className="aspect-square" />;
                    const count = countsByDate[iso] || 0;
                    const active = iso === selectedDate;
                    return (
                      <button key={iso} type="button" onClick={() => setSelectedDate(iso)} className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[12px] font-semibold ${active ? 'bg-mc-navy text-white' : iso === today ? 'bg-mc-gold-soft text-mc-gold-deep' : 'hover:bg-[#f3f5f8]'}`}>
                        {Number(iso.slice(-2))}
                        {count > 0 && <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? 'bg-mc-gold' : 'bg-mc-navy'}`} />}
                      </button>
                    );
                  })}
                </div>
                <ul className="mt-3 space-y-1 text-[11px] text-mc-ink-soft">
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mc-navy" /> Confirmed</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-mc-gold" /> In-person</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-teal-500" /> Virtual</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" /> Pending</li>
                </ul>
              </>
            )}
            {(view === 'week' || view === 'day') && (
              <div className="space-y-1">
                <p className="mb-2 text-xs font-bold uppercase text-mc-ink-soft">Jump to day</p>
                {(view === 'week' ? weekDays : [selectedDate]).map((iso) => (
                  <button key={iso} type="button" onClick={() => setSelectedDate(iso)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${iso === selectedDate ? 'bg-mc-navy text-white' : 'hover:bg-[#f3f5f8]'}`}>
                    <span>{parseIso(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className={`text-xs ${iso === selectedDate ? 'text-white/80' : 'text-mc-ink-soft'}`}>{countsByDate[iso] || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#e5dcc8] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee6d8] px-4 py-3">
              <div>
                <h3 className="text-[15px] font-bold text-mc-navy">{formatDayTitle(selectedDate)}</h3>
                <p className="text-[12px] text-mc-ink-soft">{dayRows.length} appointment{dayRows.length === 1 ? '' : 's'} · {rows.length} matching filters</p>
              </div>
              <button type="button" onClick={() => { setForm({ ...EMPTY_FORM, date: selectedDate }); setShowAdd(true); }} className="rounded-lg bg-mc-navy px-3 py-1.5 text-xs font-bold text-white">+ Add for this day</button>
            </div>
            {view === 'week' ? (
              <WeekGrid days={weekDays} rows={rows} selectedDate={selectedDate} onSelectDate={setSelectedDate} onOpen={setSelected} />
            ) : view === 'day' ? (
              <DayTimeline rows={dayRows} onOpen={setSelected} />
            ) : (
              <DayList rows={dayRows} onOpen={setSelected} q={q} />
            )}
          </section>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-bold text-mc-navy">Next upcoming</h4>
              {!nextUpcoming ? (
                <p className="text-sm text-mc-ink-soft">No upcoming appointments.</p>
              ) : (
                <button type="button" onClick={() => setSelected(nextUpcoming)} className="w-full rounded-xl bg-[#f7f1e6] p-3 text-left">
                  <div className="text-xs font-bold text-mc-gold-deep">{nextUpcoming.date} · {nextUpcoming.time}</div>
                  <div className="font-bold text-mc-navy">{nextUpcoming.patientName}</div>
                  <div className="text-xs text-mc-ink-soft">{nextUpcoming.reason || 'Session'} · {nextUpcoming.type === 'video' ? 'Virtual' : 'In-person'}</div>
                </button>
              )}
            </div>
            <div className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-bold text-mc-navy">Upcoming reminders</h4>
              <ul className="space-y-2 text-sm">
                {pendingRequests > 0 && (
                  <li className="flex justify-between gap-2 rounded-lg bg-[#fff8e8] px-2 py-2">
                    <span>New appointment request</span>
                    <span className="text-xs text-mc-ink-soft">Now</span>
                  </li>
                )}
                <li className="flex justify-between gap-2 rounded-lg bg-[#f3f5f8] px-2 py-2">
                  <span>Session reminders scheduled</span>
                  <span className="text-xs text-mc-ink-soft">Today</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-bold text-mc-navy">Quick actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setForm({ ...EMPTY_FORM, date: selectedDate }); setShowAdd(true); }} className="flex flex-col items-center gap-1 rounded-xl border border-[#e5dcc8] px-2 py-3 text-center text-[11px] font-bold text-mc-navy hover:bg-[#f3f5f8]">
                  <CalendarPlus className="h-4 w-4" /> New appointment
                </button>
                <Link to="/dashboard/bookings" className="flex flex-col items-center gap-1 rounded-xl border border-[#e5dcc8] px-2 py-3 text-center text-[11px] font-bold text-mc-navy hover:bg-[#f3f5f8]">
                  <Globe className="h-4 w-4" /> Website requests
                </Link>
                <Link to="/dashboard/video" className="flex flex-col items-center gap-1 rounded-xl border border-[#e5dcc8] px-2 py-3 text-center text-[11px] font-bold text-mc-navy hover:bg-[#f3f5f8]">
                  <Video className="h-4 w-4" /> Video visits
                </Link>
                <Link to="/dashboard/patients" className="flex flex-col items-center gap-1 rounded-xl border border-[#e5dcc8] px-2 py-3 text-center text-[11px] font-bold text-mc-navy hover:bg-[#f3f5f8]">
                  <User className="h-4 w-4" /> Clients
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
              <h4 className="mb-2 text-sm font-bold text-mc-navy">Download schedule</h4>
              <div className="flex gap-2">
                <button type="button" onClick={() => exportCsv(dayRows, selectedDate)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e5dcc8] py-2 text-xs font-bold"><Download className="h-3.5 w-3.5" /> CSV</button>
                <button type="button" onClick={() => window.print()} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e5dcc8] py-2 text-xs font-bold"><Download className="h-3.5 w-3.5" /> PDF</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl border border-mc-gold/40 bg-mc-gold-soft px-4 py-3 text-sm text-mc-ink">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-mc-gold-deep" />
        <span>
          Booking emails the client and therapist with an .ics invite that blocks the therapist&apos;s Google Calendar.
          Staff also see busy slots while adding appointments — pick another time if the doctor is already booked.
        </span>
      </div>

      {selected && (
        <DetailDrawer
          appt={selected}
          onClose={() => setSelected(null)}
          onStatus={setStatusOf}
          onReschedule={() => setReschedule({ id: selected.id, date: selected.date, time: selected.time, oldDate: selected.date, oldTime: selected.time })}
          onCancel={() => setCancelFlow({ id: selected.id, reason: 'Patient request' })}
          busy={busy}
          flash={flash}
        />
      )}

      {showAdd && (
        <Modal title="Add appointment" onClose={() => setShowAdd(false)}>
          <form onSubmit={onAddSubmit} className="space-y-3">
            <p className="text-sm text-mc-ink-soft">Creates a visit and emails the client + therapist with a calendar hold so this time shows busy.</p>
            <label className="block text-xs font-semibold text-mc-ink-soft">Existing client
              <select className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
                <option value="">— Or type a new name —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {!form.patientId && (
              <>
                <label className="block text-xs font-semibold text-mc-ink-soft">Client name
                  <input required className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-mc-ink-soft">Client email (required for Zoom / confirmation)
                  <input required type="email" className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })} placeholder="client@email.com" />
                </label>
              </>
            )}
            <label className="block text-xs font-semibold text-mc-ink-soft">Therapist
              <select className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value })}>
                <option>Dr. Sarah Williams</option>
                <option>Dr. Emily Chen</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-mc-ink-soft">Date
                <input required type="date" className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">Time
                <input required type="time" className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </label>
            </div>
            {busySlots.length > 0 && (
              <div className="rounded-xl border border-mc-navy/15 bg-[#f3f5f8] px-3 py-2 text-xs text-mc-ink">
                <p className="font-bold text-mc-navy">{form.therapist} is busy on this date</p>
                <ul className="mt-1 space-y-0.5 text-mc-ink-soft">
                  {busySlots.map((s) => (
                    <li key={s.id}>{s.start}–{s.end} · {s.label || 'Session'}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-mc-ink-soft">Type
                <select className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="video">Virtual (Zoom)</option>
                  <option value="in-person">In-person</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">Status
                <select className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-mc-ink-soft">Issue / service
              <input className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Anxiety follow-up, Intake…" />
            </label>
            {conflict && !conflict.available && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Scheduling conflict</div>
                <p>{conflict.conflicts?.[0] ? `${conflict.conflicts[0].patientName} already booked at ${conflict.conflicts[0].time}.` : 'Overlapping appointment found.'}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="rounded-lg border border-amber-400 px-2 py-1 text-xs font-bold" onClick={() => setConflict(null)}>Choose another time</button>
                  <button type="button" className="rounded-lg bg-mc-navy px-2 py-1 text-xs font-bold text-white" onClick={() => createAppointment(true)}>Continue anyway</button>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl border border-[#e5dcc8] py-2.5 text-sm font-semibold">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-mc-gold py-2.5 text-sm font-bold text-mc-ink disabled:opacity-60">{busy ? 'Saving…' : 'Create appointment'}</button>
            </div>
          </form>
        </Modal>
      )}

      {reschedule && (
        <Modal title="Reschedule appointment" onClose={() => { setReschedule(null); setConflict(null); }}>
          <form onSubmit={saveReschedule} className="space-y-3">
            <p className="text-sm text-mc-ink-soft">Old: <strong>{reschedule.oldDate} · {reschedule.oldTime}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-mc-ink-soft">New date
                <input required type="date" className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={reschedule.date} onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">New time
                <input required type="time" className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={reschedule.time} onChange={(e) => setReschedule({ ...reschedule, time: e.target.value })} />
              </label>
            </div>
            {conflict && !conflict.available && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Conflict detected — pick another slot.</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setReschedule(null)} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white">Confirm reschedule</button>
            </div>
          </form>
        </Modal>
      )}

      {cancelFlow && (
        <Modal title="Cancel appointment" onClose={() => setCancelFlow(null)}>
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-mc-ink-soft">Reason
              <select className="mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm" value={cancelFlow.reason} onChange={(e) => setCancelFlow({ ...cancelFlow, reason: e.target.value })}>
                <option>Patient request</option>
                <option>Provider unavailable</option>
                <option>Clinic closure</option>
                <option>Scheduling error</option>
                <option>Other</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCancelFlow(null)} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold">Keep</button>
              <button type="button" disabled={busy} onClick={() => setStatusOf(cancelFlow.id, 'cancelled', { cancelReason: cancelFlow.reason })} className="flex-1 rounded-xl bg-red-700 py-2.5 text-sm font-bold text-white">Confirm cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DayList({ rows, onOpen, q }) {
  if (!rows.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold text-mc-navy">{q ? 'No appointments match your search.' : 'No appointments scheduled.'}</p>
        <p className="mt-1 text-sm text-mc-ink-soft">{q ? 'Try clearing filters.' : 'Add an appointment for this day.'}</p>
      </div>
    );
  }
  return (
    <ul>
      {rows.map((a) => (
        <li key={a.id}>
          <button type="button" onClick={() => onOpen(a)} className="flex w-full flex-wrap items-center gap-3 border-b border-[#f0e8d8] px-4 py-3.5 text-left last:border-0 hover:bg-[#faf8f4]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: avatarColor(a.patientName) }}>{initials(a.patientName)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-mc-navy">{a.time}</span>
                <span className="font-semibold text-mc-ink">{a.patientName}</span>
              </div>
              <div className="text-[12px] text-mc-ink-soft">{a.reason || 'Session'} · {a.therapist || 'Therapist'}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-mc-ink">
                {a.type === 'video' ? <Video className="h-3.5 w-3.5 text-teal-700" /> : <MapPin className="h-3.5 w-3.5 text-mc-gold-deep" />}
                {a.type === 'video' ? 'Virtual' : 'In-person'}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(a.status)}`}>{labelStatus(a.status)}</span>
            <MoreVertical className="h-4 w-4 text-mc-ink-soft" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function DayTimeline({ rows, onOpen }) {
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i);
  return (
    <div className="max-h-[520px] overflow-y-auto p-3">
      {hours.map((h) => {
        const label = `${String(h).padStart(2, '0')}:00`;
        const slot = rows.filter((a) => Number(a.time.slice(0, 2)) === h);
        return (
          <div key={h} className="grid grid-cols-[52px_1fr] gap-2 border-b border-[#f0e8d8] py-2">
            <div className="pt-1 text-[11px] font-bold text-mc-ink-soft">{label}</div>
            <div className="min-h-10 space-y-1">
              {slot.map((a) => (
                <button key={a.id} type="button" onClick={() => onOpen(a)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${a.type === 'video' ? 'border-teal-200 bg-teal-50' : 'border-mc-gold/40 bg-mc-gold-soft'}`}>
                  <span className="font-bold text-mc-navy">{a.time}</span> · {a.patientName}
                  <div className="text-[11px] text-mc-ink-soft">{a.reason || 'Session'} · {labelStatus(a.status)}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({ days, rows, selectedDate, onSelectDate, onOpen }) {
  return (
    <div className="grid gap-2 p-3 md:grid-cols-7">
      {days.map((iso) => {
        const list = rows.filter((a) => a.date === iso).slice(0, 3);
        const more = rows.filter((a) => a.date === iso).length - list.length;
        return (
          <button key={iso} type="button" onClick={() => onSelectDate(iso)} className={`rounded-xl border p-2 text-left ${iso === selectedDate ? 'border-mc-navy bg-mc-navy-soft/40' : 'border-[#e5dcc8]'}`}>
            <div className="mb-2 text-[11px] font-bold text-mc-navy">{parseIso(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</div>
            <div className="space-y-1">
              {list.map((a) => (
                <div key={a.id} role="presentation" onClick={(e) => { e.stopPropagation(); onOpen(a); }} className="rounded-lg bg-white px-1.5 py-1 text-[10px] font-semibold shadow-sm">
                  {a.time} {a.patientName.split(' ')[0]}
                </div>
              ))}
              {more > 0 && <div className="text-[10px] font-bold text-mc-ink-soft">+{more} more</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DetailDrawer({ appt, onClose, onStatus, onReschedule, onCancel, busy, flash }) {
  const gcal = appointmentGoogleLinks(appt);
  const [joinGuide, setJoinGuide] = useState(null);
  const [joinChecks, setJoinChecks] = useState({ quiet: false, private: false, device: false, consent: false });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-mc-ink/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog" aria-label="Appointment details">
        <div className="flex items-start justify-between border-b border-[#e5dcc8] px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-mc-gold-deep">Appointment</p>
            <h3 className="text-lg font-bold text-mc-navy">{appt.patientName}</h3>
            <p className="text-sm text-mc-ink-soft">{appt.date} · {appt.time}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[#f3f5f8]" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <dl className="space-y-2 text-sm">
            <InfoRow icon={Clock} label="When" value={formatDualTime(appt.date, appt.time)} />
            <InfoRow icon={Clock} label="Duration" value={`${appt.duration || 50} min`} />
            <InfoRow icon={User} label="Therapist" value={appt.therapist || 'Dr. Sarah Williams'} />
            <InfoRow icon={appt.type === 'video' ? Video : MapPin} label="Visit" value={appt.type === 'video' ? 'Virtual' : `In-person${appt.location ? ` · ${appt.location}` : ''}`} />
            <InfoRow icon={CheckCircle2} label="Status" value={labelStatus(appt.status)} />
            <InfoRow icon={Globe} label="Source" value={appt.source === 'website' ? 'Website request' : 'Clinic'} />
          </dl>
          {appt.reason && <p className="rounded-xl bg-[#f7f1e6] px-3 py-2 text-sm"><strong>Issue / focus:</strong> {appt.reason}</p>}
          <div className="flex flex-wrap gap-2">
            <a href={gcal.therapist} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#e5dcc8] px-3 py-2 text-xs font-bold text-mc-navy">
              <CalendarPlus className="h-3.5 w-3.5" /> Block on Google Calendar
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-[#e5dcc8] px-3 py-2 text-xs font-bold text-mc-navy"
              onClick={async () => {
                await copyText(busyFeedUrl(appt.therapist));
                flash('Busy-feed URL copied for Google Calendar subscribe');
              }}
            >
              Copy busy feed
            </button>
          </div>
          <Link to={`/dashboard/patients/${appt.patientId || ''}`} className="inline-flex items-center gap-2 text-sm font-bold text-mc-navy hover:underline">
            Open client profile <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <p className="text-sm text-mc-ink-soft">On book: client + therapist confirmation with a calendar invite. Real SMTP can be added later — until then, mail is stored in Settings → Email (demo outbox).</p>
        </div>
        <div className="space-y-2 border-t border-[#e5dcc8] p-4">
          {appt.type === 'video' && appt.status === 'confirmed' && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const data = await api(`/video/appointments/${appt.id}/join`);
                  setJoinChecks({ quiet: false, private: false, device: false, consent: false });
                  setJoinGuide({
                    link: data.hostUrl || data.link,
                    hostUrl: data.hostUrl,
                    joinUrl: data.joinUrl,
                    provider: data.provider,
                    mode: data.mode,
                    waitingMessage: data.waitingMessage,
                  });
                } catch (e) {
                  flash(e.message || 'Could not join — set doctor Zoom email in Video Visits');
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-mc-navy py-2.5 text-sm font-bold text-white"
            >
              <Video className="h-4 w-4" /> Join as host (Zoom / video)
            </button>
          )}
          {appt.status === 'pending' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => onStatus(appt.id, 'confirmed')} className="rounded-xl bg-mc-navy py-2 text-sm font-bold text-white">Confirm</button>
              <button type="button" disabled={busy} onClick={() => onStatus(appt.id, 'declined')} className="rounded-xl border py-2 text-sm font-bold">Decline</button>
            </div>
          )}
          {['confirmed', 'pending'].includes(appt.status) && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onReschedule} className="rounded-xl border border-[#e5dcc8] py-2 text-sm font-semibold">Reschedule</button>
              <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-700"><Ban className="h-3.5 w-3.5" /> Cancel</button>
            </div>
          )}
          {appt.status === 'confirmed' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => onStatus(appt.id, 'completed')} className="rounded-xl bg-mc-gold py-2 text-sm font-bold text-mc-ink">Mark completed</button>
              <button type="button" disabled={busy} onClick={() => onStatus(appt.id, 'no-show')} className="inline-flex items-center justify-center gap-1 rounded-xl border py-2 text-sm font-semibold"><Phone className="h-3.5 w-3.5" /> No-show</button>
            </div>
          )}
          {appt.status === 'completed' && (
            <Link to="/dashboard/clinical/notes" className="block rounded-xl border border-[#e5dcc8] py-2.5 text-center text-sm font-bold text-mc-navy">Open clinical note</Link>
          )}
        </div>
      </aside>

      <VideoJoinGuide
        open={Boolean(joinGuide)}
        onClose={() => setJoinGuide(null)}
        role="host"
        provider={joinGuide?.provider}
        link={joinGuide?.link}
        hostUrl={joinGuide?.hostUrl}
        joinUrl={joinGuide?.joinUrl}
        mode={joinGuide?.mode}
        title="Join as therapist (host)"
        subtitle={`${appt.patientName} · ${appt.date} · ${appt.time}`}
        waitingMessage={joinGuide?.waitingMessage}
        checklist={HOST_CHECKLIST}
        checks={joinChecks}
        onCheckChange={(key, val) => setJoinChecks((c) => ({ ...c, [key]: val }))}
        onJoined={() => flash(
          joinGuide?.provider === 'zoom'
            ? 'Start with doctor Zoom login — patient joins with their own account'
            : 'Session launching',
        )}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-mc-ink-soft" />
      <div>
        <div className="text-[11px] font-semibold uppercase text-mc-ink-soft">{label}</div>
        <div className="font-semibold text-mc-ink">{value}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-mc-ink/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-mc-navy">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function exportCsv(rows, date) {
  const header = 'time,patient,reason,type,status,therapist\n';
  const body = rows.map((a) => [a.time, a.patientName, a.reason, a.type, a.status, a.therapist].map((x) => `"${String(x || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindcare-appointments-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
