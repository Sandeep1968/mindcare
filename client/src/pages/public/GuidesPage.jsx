import { Link, useParams } from 'react-router-dom';
import { GUIDES } from '../../data/catalog';
import { PageHero } from '../../components/PageBits';

export default function GuidesPage() {
  const { slug } = useParams();
  const guide = slug ? GUIDES.find((g) => g.id === slug) : null;

  if (guide) {
    return (
      <div>
        <PageHero kicker="Guide" title={guide.title} lead={guide.blurb} />
        <article className="mx-auto max-w-3xl px-6 py-12 prose-mc">
          <p className="mb-4 text-mc-ink/85">
            MindCare shares plain-language guides so you can decide whether therapy or a group is the next step.
            This page is educational — not a diagnosis or a crisis service.
          </p>
          <ul className="mb-6 list-disc space-y-2 pl-5 text-sm text-mc-ink/80">
            <li>What people often notice first in daily life</li>
            <li>When a short self-check-in can help clarify</li>
            <li>How our clinic matches virtual vs in-person care</li>
            <li>What the first few sessions usually focus on</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link to="/assessments" className="rounded-full border border-mc-line bg-white px-4 py-2 text-sm font-semibold text-mc-navy">Take a related test</Link>
            <Link to="/book" className="rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">Talk with us</Link>
            <Link to="/guides" className="rounded-full px-4 py-2 text-sm font-semibold text-mc-ink-soft">← All guides</Link>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div>
      <PageHero kicker="Guides" title="Learn at your own pace" lead="Short, clinic-written articles on common concerns — then take a test or book if you want support." />
      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <Link key={g.id} to={`/guides/${g.id}`} className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm hover:border-mc-gold">
            <h3 className="font-bold text-mc-navy">{g.title}</h3>
            <p className="mt-1 text-sm text-mc-ink/75">{g.blurb}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
