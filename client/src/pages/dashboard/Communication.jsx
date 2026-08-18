import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ModuleHeader } from './ModuleBits';

const KEY = 'mindcare.demo.messages.v2';
const LEGACY_KEY = 'mindcare.demo.messages';

const SEED = [
  {
    id: 'msg-1',
    patientId: 'a2000002-0000-4000-8000-000000000001',
    patientName: 'Alex Rivera',
    contact: { email: 'alex.rivera@example.com', phone: '(415) 555-0126' },
    subject: 'Running 5 minutes late',
    category: 'scheduling',
    channel: 'sms',
    priority: 'routine',
    status: 'unread',
    assignedTo: 'Maya Chen',
    lastAt: '2026-08-18T09:40:00',
    thread: [
      { id: 'e1', direction: 'inbound', channel: 'sms', at: '2026-08-18T09:40:00', author: 'Alex Rivera', text: 'Traffic on the bridge — still coming. I should be there in 5 minutes.' },
    ],
  },
  {
    id: 'msg-2',
    patientId: 'a2000002-0000-4000-8000-000000000002',
    patientName: 'Jordan Blake',
    contact: { email: 'jordan.blake@example.com', phone: '(415) 555-0179' },
    subject: 'Insurance card upload',
    category: 'billing',
    channel: 'portal',
    priority: 'high',
    status: 'follow_up',
    assignedTo: 'Maya Chen',
    lastAt: '2026-08-17T15:20:00',
    thread: [
      { id: 'e2', direction: 'inbound', channel: 'portal', at: '2026-08-17T15:20:00', author: 'Jordan Blake', text: 'Uploaded front/back of insurance card. Please confirm if anything else is needed.' },
      { id: 'e3', direction: 'outbound', channel: 'portal', at: '2026-08-17T16:05:00', author: 'Maya Chen', text: 'Received. We are verifying benefits and will update you by tomorrow.' },
    ],
  },
  {
    id: 'msg-3',
    patientId: 'a2000002-0000-4000-8000-000000000003',
    patientName: 'Sam Ortiz',
    contact: { email: 'sam.ortiz@example.com', phone: '(415) 555-0135' },
    subject: 'Intake consent form pending signature',
    category: 'forms',
    channel: 'email',
    priority: 'high',
    status: 'open',
    assignedTo: 'Maya Chen',
    lastAt: '2026-08-16T11:05:00',
    thread: [
      { id: 'e4', direction: 'outbound', channel: 'email', at: '2026-08-16T11:05:00', author: 'MindCare Intake', text: 'Hi Sam, your intake consent packet is ready. Please sign before your first appointment.' },
    ],
  },
];

const STATUS_OPTIONS = ['all', 'unread', 'open', 'follow_up', 'resolved', 'archived'];
const CHANNEL_OPTIONS = ['all', 'email', 'sms', 'portal', 'call'];

export default function Communication() {
  const [rows, setRows] = useState(() => {
    try {
      const v2 = localStorage.getItem(KEY);
      if (v2) return JSON.parse(v2);
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const old = JSON.parse(legacy);
        return old.map((m) => ({
          id: `legacy-${m.id}`,
          patientId: '',
          patientName: m.from || 'Patient',
          contact: { email: '', phone: '' },
          subject: m.subject || 'Patient message',
          category: 'general',
          channel: 'portal',
          priority: 'routine',
          status: m.unread ? 'unread' : 'open',
          assignedTo: 'Front Desk',
          lastAt: new Date().toISOString(),
          thread: [
            {
              id: `legacy-event-${m.id}`,
              direction: 'inbound',
              channel: 'portal',
              at: new Date().toISOString(),
              author: m.from || 'Patient',
              text: m.preview || '',
            },
          ],
        }));
      }
      return SEED;
    } catch {
      return SEED;
    }
  });
  const [selectedId, setSelectedId] = useState(rows[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');

  function persist(next) {
    setRows(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
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
  }, [rows, statusFilter, channelFilter, query]);

  const selected = filtered.find((m) => m.id === selectedId) || filtered[0] || null;

  const unread = rows.filter((r) => r.status === 'unread').length;
  const needsFollowUp = rows.filter((r) => r.status === 'follow_up' || (r.priority === 'high' && r.status !== 'resolved')).length;

  function open(msg) {
    setSelectedId(msg.id);
    if (msg.status !== 'unread') return;
    const next = rows.map((r) => (r.id === msg.id ? { ...r, status: 'open' } : r));
    persist(next);
  }

  function updateStatus(id, status) {
    const next = rows.map((r) => (r.id === id ? { ...r, status, lastAt: new Date().toISOString() } : r));
    persist(next);
  }

  function sendReply() {
    if (!selected || !reply.trim()) return;
    const event = {
      id: crypto.randomUUID(),
      direction: 'outbound',
      channel: selected.channel,
      at: new Date().toISOString(),
      author: 'Front Desk',
      text: reply.trim(),
    };
    const next = rows.map((r) => (
      r.id === selected.id
        ? {
          ...r,
          status: 'resolved',
          lastAt: event.at,
          thread: [...(r.thread || []), event],
        }
        : r
    ));
    persist(next);
    setReply('');
  }

  return (
    <div>
      <ModuleHeader
        title="Communication"
        lead={`Patient communication inbox — ${unread} unread and ${needsFollowUp} needing follow-up.`}
      />

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
            <p className="px-4 py-6 text-sm text-mc-ink-soft">No messages for current filters.</p>
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
                <button type="button" onClick={sendReply} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">
                  Send reply
                </button>
              </div>
            </>
          )}
        </div>
      </div>
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
