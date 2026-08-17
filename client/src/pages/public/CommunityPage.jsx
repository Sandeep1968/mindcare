import { Link } from 'react-router-dom';
import { PageHero } from '../../components/PageBits';

export default function CommunityPage() {
  return (
    <div>
      <PageHero
        kicker="Community"
        title="Connection beyond the hour"
        lead="Optional peer-style spaces and alumni check-ins — always facilitated with clinic boundaries, never a free-for-all forum."
      />
      <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        {[
          ['Monthly open circle', 'A low-commitment evening for people already in care who want company between sessions.'],
          ['Alumni skills night', 'Refresh CBT and communication tools after a group ends.'],
          ['Caregiver coffee hour', 'Virtual drop-in for people holding someone else’s care.'],
        ].map(([t, p]) => (
          <article key={t} className="rounded-2xl border border-mc-line bg-white p-5">
            <h3 className="font-bold text-mc-navy">{t}</h3>
            <p className="mt-1 text-sm text-mc-ink/75">{p}</p>
          </article>
        ))}
        <Link to="/book" className="inline-block rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">Ask about community options</Link>
      </section>
    </div>
  );
}
