import { Link } from 'react-router-dom';
import { RESOURCES } from '../../data/catalog';
import { PageHero } from '../../components/PageBits';

export default function ResourcesPage() {
  return (
    <div>
      <PageHero kicker="Free resources" title="Practical handouts" lead="Downloadable-style guides you can use before your first visit. New materials added as the clinic grows." />
      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-2">
        {RESOURCES.map((r) => (
          <article key={r.title} className="rounded-2xl border border-mc-line bg-white p-6 shadow-sm">
            <span className="mb-2 inline-block rounded-full bg-[#2f7d4a] px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">New</span>
            <h3 className="font-bold text-mc-navy">{r.title}</h3>
            <p className="mt-1 text-sm text-mc-ink/75">{r.blurb}</p>
            <Link to="/book" className="mt-3 inline-block text-sm font-bold text-mc-gold-deep">Use this before booking →</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
