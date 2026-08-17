import { Link } from 'react-router-dom';
import { GROUPS } from '../data/catalog';
import Reveal from './Reveal';

export function PageHero({ kicker, title, lead, children }) {
  return (
    <header className="border-b border-mc-line bg-[radial-gradient(700px_280px_at_10%_0%,rgba(255,232,140,.4),transparent_55%)] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Reveal y={12}>
          {kicker && (
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-mc-gold-deep">
              {kicker}
            </p>
          )}
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-mc-navy md:text-4xl">{title}</h1>
          {lead && <p className="max-w-2xl text-mc-ink/80">{lead}</p>}
          {children}
        </Reveal>
      </div>
    </header>
  );
}

export function GroupCard({ g }) {
  return (
    <article className="mc-card-lift flex h-full flex-col rounded-2xl border border-mc-line bg-white p-5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-mc-gold-deep">{g.format}</div>
      <h3 className="mb-1 font-bold text-mc-navy">{g.name}</h3>
      <p className="mb-2 flex-1 text-sm text-mc-ink/75">{g.blurb}</p>
      <p className="mb-3 text-xs text-mc-ink-soft">{g.when}</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {g.tags.map((t) => (
          <span key={t} className="rounded-full bg-mc-navy-soft px-2 py-0.5 text-[11px] text-mc-navy">
            {t}
          </span>
        ))}
      </div>
      <Link
        to="/book"
        className="rounded-full bg-mc-gold px-3 py-2.5 text-center text-sm font-bold text-mc-ink transition hover:bg-[#f0ae12] active:scale-[0.98]"
      >
        Join waitlist
      </Link>
    </article>
  );
}

export function AssessCard({ a, onStart }) {
  return (
    <article className="mc-card-lift flex h-full flex-col rounded-2xl border border-mc-line bg-white p-5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-mc-gold-deep">{a.cat}</div>
      <h3 className="mb-1 font-bold text-mc-navy">{a.name}</h3>
      <p className="mb-4 flex-1 text-sm text-mc-ink/75">{a.blurb}</p>
      <button
        type="button"
        onClick={() => onStart(a.id)}
        className="rounded-full bg-mc-gold px-3 py-2.5 text-sm font-bold text-mc-ink transition hover:bg-[#f0ae12] active:scale-[0.98]"
      >
        Take the test
      </button>
    </article>
  );
}

export function FeaturedGroups({ limit = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {GROUPS.slice(0, limit).map((g, i) => (
        <Reveal key={g.id} delay={i * 55}>
          <GroupCard g={g} />
        </Reveal>
      ))}
    </div>
  );
}
