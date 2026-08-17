import { Link, useSearchParams } from 'react-router-dom';
import { THERAPISTS } from '../../data/catalog';
import { PageHero } from '../../components/PageBits';
import Reveal from '../../components/Reveal';

export default function TherapyPage() {
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const list = focus
    ? THERAPISTS.filter((t) => t.focus.includes(focus))
    : THERAPISTS;

  return (
    <div>
      <PageHero
        kicker="1-on-1 therapy"
        title="Clinicians in this clinic"
        lead="Matched inside MindCare — not a national waitlist. Virtual or in-person with the same team."
      />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link to="/therapy" className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${!focus ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white hover:border-mc-navy/30'}`}>All</Link>
          {['anxiety', 'trauma', 'couples', 'teen'].map((f) => (
            <Link key={f} to={`/therapy?focus=${f}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize transition ${focus === f ? 'bg-mc-navy text-white' : 'border border-mc-line bg-white hover:border-mc-navy/30'}`}>{f}</Link>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {list.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <article className="mc-card-lift group rounded-2xl border border-mc-line bg-white p-6 text-center">
                <img src={t.img} alt="" className="mx-auto mb-3 h-24 w-24 rounded-full object-cover ring-2 ring-mc-line transition duration-300 group-hover:ring-mc-gold" />
                <h3 className="font-bold text-mc-navy">{t.name}</h3>
                <p className="text-sm text-mc-ink-soft">{t.title}</p>
                <p className="mt-1 text-sm text-mc-ink/70">{t.specs}</p>
                <Link to={`/book?therapist=${encodeURIComponent(t.name)}`} className="mt-4 inline-block rounded-full bg-mc-gold px-4 py-2 text-sm font-bold text-mc-ink transition hover:bg-[#f0ae12] active:scale-[0.98]">
                  Match with {t.name.split(' ')[0]}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>

        <div id="formats" className="mt-14 grid gap-6 md:grid-cols-2">
          <Reveal>
            <article className="mc-card-lift group overflow-hidden rounded-2xl border border-mc-line bg-white">
              <div className="overflow-hidden">
                <img src="/care-virtual.jpg" alt="" className="mc-img-zoom h-44 w-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-mc-navy">Virtual sessions</h3>
                <p className="mt-1 text-sm text-mc-ink/75">Secure video from home. Same clinicians as the office.</p>
                <Link to="/book?sessionType=video" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-gold-deep transition group-hover:gap-2">Book virtual →</Link>
              </div>
            </article>
          </Reveal>
          <Reveal delay={90}>
            <article className="mc-card-lift group overflow-hidden rounded-2xl border border-mc-line bg-white">
              <div className="overflow-hidden">
                <img src="/care-inperson.jpg" alt="" className="mc-img-zoom h-44 w-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-mc-navy">In-person visits</h3>
                <p className="mt-1 text-sm text-mc-ink/75">Quiet rooms in clinic — soft light, time that isn’t rushed.</p>
                <Link to="/book?sessionType=in-person" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-gold-deep transition group-hover:gap-2">Book in person →</Link>
              </div>
            </article>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
