import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'billing', label: 'Billing' },
  { id: 'forms', label: 'Forms / consent' },
];

export default function PortalMessages() {
  const { user } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ subject: '', category: 'general', body: '' });

  const load = useCallback(async () => {
    try {
      const list = await api('/portal/messages');
      setRows(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load messages');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = rows.find((m) => m.id === selectedId) || rows[0] || null;

  async function sendReply(e) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      const next = await api(`/portal/messages/${selected.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: reply.trim() }),
      });
      setRows((cur) => cur.map((r) => (r.id === next.id ? next : r)));
      setSelectedId(next.id);
      setReply('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendNew(e) {
    e.preventDefault();
    if (!draft.subject.trim() || !draft.body.trim()) return;
    setBusy(true);
    try {
      const created = await api('/portal/messages', {
        method: 'POST',
        body: JSON.stringify({
          subject: draft.subject.trim(),
          body: draft.body.trim(),
          category: draft.category,
        }),
      });
      setRows((cur) => [created, ...cur.filter((r) => r.id !== created.id)]);
      setSelectedId(created.id);
      setCompose(false);
      setDraft({ subject: '', category: 'general', body: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        If this is an emergency, call <strong>911</strong> or <strong>988</strong> (Suicide &amp; Crisis Lifeline). Do not use this inbox for crisis or after-hours medical emergencies.
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-mc-navy">My messages</h2>
          <p className="mt-1 text-sm text-mc-ink-soft">Write your care team about scheduling, billing, or forms. They reply here — not by public email.</p>
        </div>
        <button type="button" onClick={() => setCompose(true)} className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">
          New message
        </button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-mc-line bg-white shadow-sm">
          {!rows.length && (
            <p className="px-4 py-6 text-sm text-mc-ink-soft">No messages yet. Send one if you need the front desk or your therapist.</p>
          )}
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={`flex w-full flex-col border-b border-mc-line px-4 py-3 text-left last:border-0 hover:bg-[#f7f1e6] ${selected?.id === m.id ? 'bg-mc-gold-soft' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm ${m.fromCareTeam ? 'font-bold text-mc-navy' : 'font-semibold text-mc-ink'}`}>{m.subject}</span>
                <span className="text-[11px] text-mc-ink-soft">{formatAt(m.lastAt)}</span>
              </div>
              <div className="mt-1 truncate text-xs text-mc-ink-soft">{m.thread?.[m.thread.length - 1]?.text || ''}</div>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-mc-line bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-mc-ink-soft">Select a conversation, or start a new one.</p>
          ) : (
            <>
              <h3 className="text-lg font-bold text-mc-navy">{selected.subject}</h3>
              <div className="mt-4 space-y-2 rounded-lg border border-mc-line bg-[#faf7f1] p-3">
                {(selected.thread || []).map((e) => (
                  <div key={e.id} className={`rounded-lg px-3 py-2 text-sm ${e.direction === 'inbound' ? 'bg-mc-navy text-white ml-6' : 'bg-white text-mc-ink mr-6'}`}>
                    <div className={`mb-1 text-[11px] ${e.direction === 'inbound' ? 'text-white/80' : 'text-mc-ink-soft'}`}>
                      {e.author === user?.name ? 'You' : e.author} · {formatAt(e.at)}
                    </div>
                    <div>{e.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="mt-4 min-h-24 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
                  placeholder="Reply to your care team…"
                />
                <button disabled={busy} className="mt-2 rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink disabled:opacity-60">
                  Send reply
                </button>
              </form>
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
            <h3 className="text-lg font-bold text-mc-navy">Message your care team</h3>
            <label className="mt-3 block text-xs font-semibold text-mc-ink-soft">Topic
              <select className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-mc-ink-soft">Subject
              <input required className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </label>
            <textarea
              required
              className="mt-3 min-h-28 w-full rounded-lg border border-mc-line px-3 py-2 text-sm"
              placeholder="How can we help?"
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
