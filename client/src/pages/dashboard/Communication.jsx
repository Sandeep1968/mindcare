import { useState } from 'react';
import { ModuleHeader } from './ModuleBits';

const KEY = 'mindcare.demo.messages';
const SEED = [
  { id: '1', from: 'Alex Rivera', subject: 'Running 5 minutes late', preview: 'Traffic on the bridge — still coming.', unread: true, at: 'Today 9:40' },
  { id: '2', from: 'Jordan Blake', subject: 'Insurance card upload', preview: 'Attached the front and back of my card.', unread: true, at: 'Yesterday' },
  { id: '3', from: 'Clinic system', subject: 'Website booking received', preview: 'Sam Ortiz requested a virtual intake.', unread: false, at: 'Mon' },
];

export default function Communication() {
  const [rows, setRows] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : SEED;
    } catch {
      return SEED;
    }
  });
  const [selected, setSelected] = useState(null);

  function open(msg) {
    setSelected(msg);
    const next = rows.map((r) => (r.id === msg.id ? { ...r, unread: false } : r));
    setRows(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  const unread = rows.filter((r) => r.unread).length;

  return (
    <div>
      <ModuleHeader
        title="Communication"
        lead={`Secure clinic inbox — ${unread} unread. Website booking alerts and patient messages land here.`}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-xl border border-mc-line bg-white shadow-sm">
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => open(m)}
              className={`flex w-full flex-col border-b border-mc-line px-4 py-3 text-left last:border-0 hover:bg-[#f7f1e6] ${selected?.id === m.id ? 'bg-mc-gold-soft' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm ${m.unread ? 'font-bold text-mc-navy' : 'font-semibold text-mc-ink'}`}>{m.from}</span>
                <span className="text-[11px] text-mc-ink-soft">{m.at}</span>
              </div>
              <div className="text-sm text-mc-ink">{m.subject}</div>
              <div className="truncate text-xs text-mc-ink-soft">{m.preview}</div>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-mc-line bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-mc-ink-soft">Select a message to read.</p>
          ) : (
            <>
              <h3 className="text-lg font-bold text-mc-navy">{selected.subject}</h3>
              <p className="mt-1 text-xs text-mc-ink-soft">From {selected.from} · {selected.at}</p>
              <p className="mt-4 text-sm leading-relaxed text-mc-ink">{selected.preview}</p>
              <textarea className="mt-5 min-h-24 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" placeholder="Write a reply (demo)…" />
              <button type="button" className="mt-3 rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">Send reply</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
