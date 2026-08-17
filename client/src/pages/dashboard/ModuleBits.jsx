import { Link } from 'react-router-dom';

/** Shared shell for clinical / ops modules */
export function ModuleHeader({ title, lead, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-mc-navy">{title}</h2>
        {lead && <p className="mt-1 max-w-2xl text-sm text-mc-ink-soft">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyHint({ title, body, to, cta }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8cdb8] bg-white px-6 py-10 text-center">
      <h3 className="text-lg font-bold text-mc-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-mc-ink-soft">{body}</p>
      {to && (
        <Link to={to} className="mt-4 inline-flex rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">
          {cta}
        </Link>
      )}
    </div>
  );
}
