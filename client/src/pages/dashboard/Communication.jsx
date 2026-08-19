import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ModuleHeader } from './ModuleBits';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

const STATUS_OPTIONS = ['all', 'unread', 'open', 'follow_up', 'resolved', 'archived'];
const CHANNEL_OPTIONS = ['all', 'portal', 'email', 'sms', 'call'];
const CATEGORIES = ['general', 'scheduling', 'billing', 'forms'];

export default function Communication() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const focusPatient = params.get('patient') || '';
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(Boolean(focusPatient));
  const [draft, setDraft] = useState({
    patientId: focusPatient,
    subject: '',
    category: 'general',
    priority: 'routine',
    body: '',
  });

  const load = useCallback(async () => {
    try {
      const list = await api('/messages');
      setRows(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load messages');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/patients').then(setPatients).catch(() => setPatients([]));
  }, []);
  useEffect(() => {
    if (focusPatient) setDraft((d) => ({ ...d, patientId: focusPatient }));
  }, [focusPatient]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((m) => (focusPatient ? m.patientId === focusPatient : true))
      .filter((m) => (statusFilter === 'all' ? true : m.status === statusFilter))
      .filter((m) => (channelFilter === 'all' ? true : m.channel === channelFilter))
      .filter((m) => {
        if (!q) return true;
        const hay = [
          m.patientName,
          m.subject,
          m.category,
          m.thread?.[m.thread.length - 1]?.text,
          m.contact?.email,
          m.contact?.phone,
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
  }, [rows, statusFilter, channelFilter, query, focusPatient]);

  const selected = filtered.find((m) => m.id === selectedId) || filtered[0] || null;

  const unread = rows.filter((r) => r.status === 'unread').length;
  const needsFollowUp = rows.filter((r) => r.status === 'follow_up' || (r.priority === 'high' && r.status !== 'resolved')).length;

  async function open(msg) {
    setSelectedId(msg.id);
    if (msg.status !== 'unread') return;
    try {
      const next = await api(`/messages/${msg.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'open' }) });
      setRows((cur) => cur.map((r) => (r.id === next.id ? next : r)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      const next = await api(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setRows((cur) => cur.map((r) => (r.id === next.id ? next : r)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      const next = await api(`/messages/${selected.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: reply.trim() }),
      });
      setRows((cur) => cur.map((r) => (r.id === next.id ? next : r)));
      setReply('');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendNew(e) {
    e.preventDefault();
    if (!draft.patientId || !draft.subject.trim() || !draft.body.trim()) return;
    setBusy(true);
    try {
      const created = await api('/messages', {
        method: 'POST',
        body: JSON.stringify({
          patientId: draft.patientId,
          subject: draft.subject.trim(),
          body: draft.body.trim(),
          category: draft.category,
          priority: draft.priority,
        }),
      });
      setRows((cur) => [created, ...cur.filter((r) => r.id !== created.id)]);
      setSelectedId(created.id);
      setCompose(false);
      setDraft({ patientId: focusPatient, subject: '', category: 'general', priority: 'routine', body: '' });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ModuleHeader
        title="Communication"
        lead={`Secure portal inbox — ${unread} unread and ${needsFollowUp} needing follow-up. Replies appear in the patient portal. Email only notifies them that a message is waiting.`}
        action={(
          <button
            type="button"
            onClick={() => setCompose(true)}
            className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink"
          >
            New message
          </button>
        )}
      />

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by patient, subject, phone, email..."
          className="min-w-56 flex-1 rounded-lg border border-mc-line bg-white px-3 py-2 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold">
          {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-mc-line bg-white shadow-sm">
          {!filtered.length && (
            <p className="px-4 py-6 text-sm text-mc-ink-soft">No messages yet. Send one, or wait for a patient to write from the portal.</p>
          )}
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => open(m)}
              className={`flex w-full flex-col border-b border-mc-line px-4 py-3 text-left last:border-0 hover:bg-[#f7f1e6] ${selected?.id === m.id ? 'bg-mc-gold-soft' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm ${m.status === 'unread' ? 'font-bold text-mc-navy' : 'font-semibold text-mc-ink'}`}>{m.patientName}</span>
                <span className="text-[11px] text-mc-ink-soft">{formatAt(m.lastAt)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <div className="text-sm text-mc-ink">{m.subject}</div>
                <StatusPill status={m.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-mc-ink-soft">
                <span className="rounded-full border border-mc-line px-1.5 py-0.5">{channelLabel(m.channel)}</span>
                <span>·</span>
                <span>{categoryLabel(m.category)}</span>
                {m.priority === 'high' && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">High priority</span>}
              </div>
              <div className="mt-1 truncate text-xs text-mc-ink-soft">{m.thread?.[m.thread.length - 1]?.text || ''}</div>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-mc-line bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-mc-ink-soft">Select a patient message to read.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-mc-navy">{selected.subject}</h3>
                  <p className="mt-1 text-xs text-mc-ink-soft">
                    {selected.patientName} · {selected.contact?.phone || 'No phone'} · {selected.contact?.email || 'No email'}
                  </p>
                </div>
                {selected.patientId ? (
                  <Link to={`/dashboard/patients/${selected.patientId}?tab=communication`} className="rounded-lg border border-mc-line px-3 py-1.5 text-xs font-semibold">
                    Open Patient Record
                  </Link>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => updateStatus(selected.id, 'follow_up')} className="rounded-lg border border-mc-line px-2.5 py-1.5 text-xs font-semibold">Mark follow-up</button>
                <button type="button" onClick={() => updateStatus(selected.id, 'resolved')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">Resolve</button>
                <button type="button" onClick={() => updateStatus(selected.id, 'archived')} className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Archive</button>
              </div>

              <div className="mt-5 space-y-2 rounded-lg border border-mc-line bg-[#faf7f1] p-3">
                {(selected.thread || []).map((e) => (
                  <div key={e.id} className={`rounded-lg px-3 py-2 text-sm ${e.direction === 'outbound' ? 'bg-mc-navy text-white' : 'bg-white text-mc-ink'}`}>
                    <div className={`mb-1 text-[11px] ${e.direction === 'outbound' ? 'text-white/80' : 'text-mc-ink-soft'}`}>
                      {e.author} · {channelLabel(e.channel)} · {formatAt(e.at)}
                    </div>
                    <div>{e.text}</div>
                  </div>
                ))}
              </div>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="mt-4 min-h-24 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
                placeholder="Write a secure reply for the patient..."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => setReply('Thanks for the update. We have noted this in your chart.')} className="rounded-lg border border-mc-line px-2.5 py-1.5 text-xs font-semibold">
                  Insert template
                </button>
                <button type="button" disabled={busy} onClick={sendReply} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink disabled:opacity-60">
                  Send reply
                </button>
              </div>
              <p className="mt-2 text-[11px] text-mc-ink-soft">
                Signed in as {user?.name}. The patient will see this in My messages.
              </p>
            </>
          )}
        </div>
      </div>

      {compose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-mc-ink/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCompose(false); }}
        >
          <form onSubmit={sendNew} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-mc-navy">New portal message</h3>
            <p className="mt-1 text-xs text-mc-ink-soft">The patient reads this in their portal. Email, if configured, only says a message is waiting.</p>
            <label className="mt-3 block text-xs font-semibold text-mc-ink-soft">Patient
              <select
                required
                className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
                value={draft.patientId}
                onChange={(e) => setDraft({ ...draft, patientId: e.target.value })}
              >
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-mc-ink-soft">Subject
              <input required className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-mc-ink-soft">Topic
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-mc-ink-soft">Priority
                <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                  <option value="routine">Routine</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <textarea
              required
              className="mt-3 min-h-28 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
              placeholder="Message for the patient…"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setCompose(false)} className="flex-1 rounded-xl border border-mc-line py-2 text-sm font-semibold">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-mc-navy py-2 text-sm font-bold text-white disabled:opacity-60">Send</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function formatAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusLabel(s) {
  return {
    all: 'All statuses',
    unread: 'Unread',
    open: 'Open',
    follow_up: 'Follow-up',
    resolved: 'Resolved',
    archived: 'Archived',
  }[s] || s;
}

function channelLabel(c) {
  return { all: 'All channels', email: 'Email', sms: 'SMS', portal: 'Portal', call: 'Call note' }[c] || c;
}

function categoryLabel(c) {
  return {
    scheduling: 'Scheduling',
    billing: 'Billing',
    forms: 'Forms/consent',
    general: 'General',
  }[c] || c;
}

function StatusPill({ status }) {
  const cls = {
    unread: 'border-sky-200 bg-sky-50 text-sky-700',
    open: 'border-amber-200 bg-amber-50 text-amber-700',
    follow_up: 'border-rose-200 bg-rose-50 text-rose-700',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    archived: 'border-slate-200 bg-slate-100 text-slate-600',
  }[status] || 'border-slate-200 bg-slate-100 text-slate-600';
  return <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{statusLabel(status)}</span>;
}
