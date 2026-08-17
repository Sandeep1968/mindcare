import { Link } from 'react-router-dom';
import { PageHero } from '../../components/PageBits';

export default function PartnersPage() {
  return (
    <div>
      <PageHero
        kicker="Partnerships"
        title="Working with employers & schools"
        lead="MindCare partners with USA workplaces and campus counseling offices for short groups and clear referral pathways — not a generic EAP marketplace."
      />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-6 space-y-3 text-sm text-mc-ink/80">
          <p>We can run time-limited groups, lunch-and-learns, and warm handoffs into individual therapy.</p>
          <p>Partnerships stay clinician-led. Outcomes and privacy expectations are written into a simple agreement before anyone is referred.</p>
        </div>
        <Link to="/book" className="rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink">Talk partnerships</Link>
      </section>
    </div>
  );
}
