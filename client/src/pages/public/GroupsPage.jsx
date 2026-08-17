import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GROUPS } from '../../data/catalog';
import { PageHero, GroupCard } from '../../components/PageBits';
import Reveal from '../../components/Reveal';

export default function GroupsPage() {
  const [params] = useSearchParams();
  const concern = params.get('concern');
  const list = useMemo(() => {
    if (!concern) return GROUPS;
    return GROUPS.filter((g) => g.concern === concern || g.id === concern || g.tags.some((t) => t.toLowerCase().includes(concern)));
  }, [concern]);

  return (
    <div>
      <PageHero
        kicker="Support groups"
        title="Therapist-led small groups"
        lead="Weekly rooms built around one life stress — not an endless feed. Virtual and some in-person options."
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/groups" className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!concern ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white text-mc-navy'}`}>All</Link>
          {['anxiety', 'depression', 'grief', 'trauma', 'adhd', 'burnout', 'couples', 'women'].map((c) => (
            <Link key={c} to={`/groups?concern=${c}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${concern === c ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white text-mc-navy'}`}>
              {c}
            </Link>
          ))}
        </div>
      </PageHero>
      <section className="mx-auto max-w-6xl px-6 py-12">
        {!list.length ? (
          <p className="text-mc-ink-soft">No groups match that filter. <Link to="/groups" className="font-semibold text-mc-navy underline">View all</Link></p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((g, i) => (
              <Reveal key={g.id} delay={i * 55}>
                <GroupCard g={g} />
              </Reveal>
            ))}
          </div>
        )}
        <div className="mt-10 rounded-2xl border border-mc-line bg-mc-gold-soft p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-mc-navy">Not sure which group fits?</h2>
          <p className="mb-4 text-sm text-mc-ink/80">Take a 2-minute reflection or request a match with our clinic team.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/assessments" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-mc-navy border border-mc-line">Take a test</Link>
            <Link to="/book" className="rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">Get matched</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
