import { Link } from 'react-router-dom';
import { ASSESSMENTS, THERAPISTS } from '../../data/catalog';
import { FeaturedGroups } from '../../components/PageBits';
import InteractiveHero from '../../components/InteractiveHero';
import Reveal from '../../components/Reveal';
import { useAssessment } from '../../assessment/AssessmentContext';

const CARE_STORIES = [
  {
    img: '/care-inperson.jpg',
    step: '01',
    label: 'In clinic',
    title: 'In the room',
    body: 'Soft light, a quiet chair, space to speak without rushing.',
    cta: 'See visit formats',
    to: '/therapy#formats',
  },
  {
    img: '/care-virtual.jpg',
    step: '02',
    label: 'Telehealth',
    title: 'From home',
    body: 'Private video with the same clinicians who sit in clinic.',
    cta: 'Request video care',
    to: '/book?sessionType=video',
  },
  {
    img: '/hero-group.jpg',
    step: '03',
    label: 'Groups',
    title: 'In a small group',
    body: 'Therapist-led rooms where you are not the only one holding it.',
    cta: 'Browse groups',
    to: '/groups',
  },
  {
    img: '/hero-journal.jpg',
    step: '04',
    label: 'Reflect',
    title: 'On the page first',
    body: 'Short reflections that name the load before you book.',
    cta: 'Start a short test',
    to: '/assessments',
  },
];

const PROMISES = [
  ['Personalized care', 'Therapy shaped around your unique needs.'],
  ['Flexible sessions', 'Choose virtual or in-person care.'],
  ['Compassionate team', 'Clinicians with different areas of expertise.'],
  ['Private & respectful', 'Your information and experience matter.'],
];

export default function Home() {
  const { open } = useAssessment();

  return (
    <main>
      <InteractiveHero />

      <section className="border-y border-mc-line bg-mc-gold-soft" aria-label="What patients can expect">
        <div className="mx-auto grid max-w-6xl gap-0 md:grid-cols-4">
          {PROMISES.map(([t, p], i) => (
            <Reveal key={t} delay={i * 70} className="border-mc-line/60 px-5 py-6 md:border-r md:last:border-r-0">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
                0{i + 1}
              </p>
              <h3 className="mb-1 text-sm font-bold text-mc-navy">{t}</h3>
              <p className="text-sm leading-snug text-mc-ink/75">{p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Professional care pathways */}
      <section className="relative overflow-hidden px-6 py-16 md:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_0%_0%,rgba(0,62,126,.05),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <Reveal className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
                How care begins
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-mc-navy md:text-[1.85rem]">
                Care you can picture
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-mc-ink/75">
                Four clear doors into the same clinic — choose the setting that feels steady for you.
              </p>
            </div>
            <Link
              to="/therapy"
              className="mc-link-nudge shrink-0 text-sm font-bold text-mc-navy underline-offset-4 hover:underline"
            >
              Explore therapy options →
            </Link>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CARE_STORIES.map((c, i) => (
              <Reveal key={c.title} delay={i * 90} y={22}>
                <Link
                  to={c.to}
                  className="mc-card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-mc-line bg-white"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={c.img}
                      alt=""
                      className="mc-img-zoom h-44 w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b2540]/45 via-transparent to-transparent opacity-80 transition duration-500 group-hover:opacity-95" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-mc-navy shadow-sm">
                      {c.label}
                    </span>
                    <span className="absolute bottom-3 left-3 font-bold tabular-nums text-white/90 text-[13px]">
                      {c.step}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4 pt-3.5">
                    <h3 className="text-[15px] font-bold text-mc-navy mc-gold-underline pb-0.5">
                      {c.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-[13px] leading-snug text-mc-ink/70">{c.body}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-mc-gold-deep transition group-hover:gap-2">
                      {c.cta}
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-8 flex items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
              Self-check-ins
            </p>
            <h2 className="text-2xl font-bold text-mc-navy">Unsure what you’re going through?</h2>
            <p className="mt-1 text-mc-ink/75">Take a short reflection — not a diagnosis — then get matched or join a group.</p>
          </div>
          <Link to="/assessments" className="mc-link-nudge shrink-0 text-sm font-bold text-mc-gold-deep">
            View all tests →
          </Link>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ASSESSMENTS.slice(0, 6).map((a, i) => (
            <Reveal key={a.id} delay={i * 60}>
              <article className="mc-card-lift flex h-full flex-col rounded-2xl border border-mc-line bg-white p-5">
                <div className="mb-2 text-[11px] font-bold uppercase text-mc-gold-deep">{a.cat}</div>
                <h3 className="font-bold text-mc-navy">{a.name}</h3>
                <p className="mt-1 mb-4 flex-1 text-sm text-mc-ink/75">{a.blurb}</p>
                <button
                  type="button"
                  onClick={() => open(a.id)}
                  className="rounded-full bg-mc-gold px-4 py-2.5 text-sm font-bold text-mc-ink transition hover:bg-[#f0ae12] active:scale-[0.98]"
                >
                  Take the test
                </button>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white/50 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
                Together
              </p>
              <h2 className="text-2xl font-bold text-mc-navy">Upcoming support groups</h2>
            </div>
            <Link to="/groups" className="mc-link-nudge text-sm font-bold text-mc-gold-deep">
              All groups →
            </Link>
          </Reveal>
          <FeaturedGroups limit={6} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
              Your clinicians
            </p>
            <h2 className="text-2xl font-bold text-mc-navy">Meet the team</h2>
          </div>
          <Link to="/therapy" className="mc-link-nudge text-sm font-bold text-mc-gold-deep">
            All therapists →
          </Link>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {THERAPISTS.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <article className="mc-card-lift group rounded-2xl border border-mc-line bg-white p-6 text-center">
                <div className="relative mx-auto mb-3 h-20 w-20">
                  <img
                    src={t.img}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-mc-line transition duration-300 group-hover:ring-mc-gold"
                  />
                </div>
                <h3 className="font-bold text-mc-navy">{t.name}</h3>
                <p className="text-sm text-mc-ink-soft">{t.title}</p>
                <Link
                  to={`/book?therapist=${encodeURIComponent(t.name)}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-mc-gold-deep transition group-hover:gap-2"
                >
                  Request a match →
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal y={12}>
        <section className="border-y border-mc-line bg-mc-gold-soft px-6 py-14 text-center">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-mc-gold-deep">
            Next step
          </p>
          <h2 className="mb-2 text-2xl font-bold text-mc-navy">Ready to take the first step?</h2>
          <p className="mb-6 text-mc-ink/80">Take a test, browse groups, or send a booking request — we’ll review it personally.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/assessments"
              className="rounded-full border border-mc-line bg-white px-5 py-3 text-sm font-semibold text-mc-navy transition hover:border-mc-navy/30 hover:bg-[#fffdf8]"
            >
              Take a test
            </Link>
            <Link
              to="/book"
              className="mc-btn-pulse rounded-full bg-mc-gold px-5 py-3 text-sm font-bold text-mc-ink transition hover:bg-[#f0ae12]"
            >
              Book now
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
