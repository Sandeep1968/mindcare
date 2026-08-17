import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAssessment } from '../assessment/AssessmentContext';

const PATHS = [
  {
    id: 'self',
    label: 'Myself',
    full: 'For myself',
    hint: 'Individual therapy',
    detail: 'One-to-one sessions with a clinician at this clinic — virtual or in the office.',
    cta: 'Continue to match',
    to: '/book',
    scene: 0,
    icon: 'person',
  },
  {
    id: 'us',
    label: 'Us',
    full: 'For us',
    hint: 'Couples / partners',
    detail: 'Relationship-focused care for two people who want tools, not a marketplace waitlist.',
    cta: 'Book for us',
    to: '/book?service=Relationships',
    scene: 1,
    icon: 'pair',
  },
  {
    id: 'teen',
    label: 'Teen',
    full: 'For my teen',
    hint: 'Parent or guardian books',
    detail: 'A parent or guardian starts the request. We match carefully and confirm timing with you.',
    cta: 'Start for my teen',
    to: '/book?service=Life%20Transitions',
    scene: 2,
    icon: 'family',
  },
  {
    id: 'test',
    label: 'Test',
    full: '2-min test',
    hint: 'Name what hurts first',
    detail: 'A short reflection — not a diagnosis. Your result can travel with a booking request.',
    cta: 'Take the test',
    assess: 'anxiety',
    scene: 3,
    icon: 'check',
  },
];

function PathIcon({ name, className = 'h-5 w-5' }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' };
  if (name === 'pair') {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="16" cy="9" r="2.5" />
        <path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" />
        <path d="M14.5 19c.2-2.2 1.6-3.8 3.7-4.2" />
      </svg>
    );
  }
  if (name === 'family') {
    return (
      <svg {...common}>
        <circle cx="12" cy="6.5" r="2.5" />
        <circle cx="7" cy="10" r="2" />
        <circle cx="17" cy="10" r="2" />
        <path d="M12 10.5v3.5M8.5 18c.8-2.2 2.2-3.5 3.5-3.5s2.7 1.3 3.5 3.5" />
        <path d="M5.5 18c.4-1.4 1.2-2.3 2.2-2.6M18.5 18c-.4-1.4-1.2-2.3-2.2-2.6" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg {...common}>
        <path d="M8 5h8a2 2 0 0 1 2 2v12l-3-1.5L12 19l-3-1.5L6 19V7a2 2 0 0 1 2-2z" />
        <path d="M9.5 11.5h5M9.5 14.5h3.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

const SCENES = [
  { src: '/hero-journal.jpg', alt: 'Fountain pen journaling — reflection before therapy', caption: 'Honest self-check-ins', badge: 'Reflection' },
  { src: '/hero-couple.jpg', alt: 'Partners in supportive conversation', caption: 'Care for relationships', badge: 'Couples' },
  { src: '/hero-listen.jpg', alt: 'Attentive clinician in session', caption: 'Someone who listens well', badge: '1-on-1' },
  { src: '/hero-room.jpg', alt: 'Calm therapy room', caption: 'A quiet room to begin', badge: 'In-person' },
  { src: '/hero-group.jpg', alt: 'Small supportive group', caption: 'Therapist-led small groups', badge: 'Groups' },
  { src: '/hero-calm.jpg', alt: 'Calm restorative moment', caption: 'Rest is part of the work', badge: 'Pace' },
];

const ROTATE = ['right support', 'right group', 'right clinician', 'right pace'];

const CALLOUTS = [
  { title: 'Next step', body: 'Match in a few questions', to: '/book', pos: 'right-[-4%] top-[6%]' },
  { title: '12 groups', body: 'Therapist-led, small rooms', to: '/groups', pos: 'left-[-8%] top-[38%]' },
  { title: 'Virtual or clinic', body: 'Same clinicians, your format', to: '/therapy', pos: 'right-[-2%] bottom-[22%]' },
];

export default function InteractiveHero() {
  const [wordIdx, setWordIdx] = useState(0);
  const [scene, setScene] = useState(0);
  const [path, setPath] = useState('self');
  const [paused, setPaused] = useState(false);
  const [fade, setFade] = useState(true);
  const navigate = useNavigate();
  const { open } = useAssessment();

  const selected = PATHS.find((p) => p.id === path) || PATHS[0];
  const current = SCENES[scene];

  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % ROTATE.length), 2800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        setScene((s) => (s + 1) % SCENES.length);
        setFade(true);
      }, 200);
    }, 4800);
    return () => clearInterval(id);
  }, [paused]);

  function goScene(i) {
    setPaused(true);
    setFade(false);
    window.setTimeout(() => {
      setScene(i);
      setFade(true);
    }, 160);
  }

  function selectPath(p) {
    setPath(p.id);
    goScene(p.scene % SCENES.length);
  }

  function primaryAction() {
    if (selected.assess) open(selected.assess);
    else navigate(selected.to);
  }

  return (
    <section
      className="relative overflow-hidden bg-mc-cream"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* soft professional atmosphere — light, not busy */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_15%_20%,rgba(255,232,140,.28),transparent_55%),radial-gradient(50%_45%_at_90%_10%,rgba(0,62,126,.06),transparent_50%)]" />
      {/* atmosphere photo only on the right, faded — never under copy */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] bg-cover bg-center opacity-[0.12] md:block"
        style={{
          backgroundImage: "url('/scene-window.jpg')",
          maskImage: 'linear-gradient(90deg, transparent 0%, black 45%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 45%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mc-cream to-transparent" />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-20">
        {/* Copy column — icon rail + morphing path panel */}
        <div className="relative max-w-[34rem]">
          {/* solid backing so copy never washes out */}
          <div
            className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-[1.75rem] bg-mc-cream/90 md:-inset-x-6"
            aria-hidden
          />
          <p className="mb-5 inline-flex items-center rounded-full border border-mc-line bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mc-navy">
            MindCare clinic · USA
          </p>

          <h1 className="mb-3 text-[2.05rem] font-bold leading-[1.18] tracking-[-0.028em] text-mc-navy sm:text-[2.35rem] md:text-[2.65rem]">
            A calmer mind starts with the{' '}
            <span className="whitespace-nowrap text-mc-navy">
              <span key={ROTATE[wordIdx]} className="relative inline-block animate-hero-in">
                <span
                  className="pointer-events-none absolute inset-x-[-3px] bottom-[0.1em] z-0 h-[0.36em] rounded-[3px] bg-[#ffe08a]"
                  aria-hidden
                />
                <span className="relative z-10">{ROTATE[wordIdx]}</span>
              </span>
            </span>
            .
          </h1>

          <p className="mb-8 max-w-[38ch] text-[15.5px] leading-[1.55] text-[#3d5a78]">
            Therapy, small groups, and honest self-check-ins — choose how you want to begin.
          </p>

          {/* Creative presenter: step label + icon rail */}
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-mc-navy text-[11px] font-bold text-white">
              1
            </span>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-mc-ink-soft">
              Choose a starting path
            </p>
            <span className="h-px flex-1 bg-[#e5dcc8]" aria-hidden />
          </div>

          <div
            className="mb-3 grid grid-cols-4 gap-2"
            role="tablist"
            aria-label="Starting path"
          >
            {PATHS.map((p) => {
              const active = path === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectPath(p)}
                  onMouseEnter={() => goScene(p.scene % SCENES.length)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3 transition duration-200 ${
                    active
                      ? 'border-mc-navy bg-mc-navy text-white shadow-[0_8px_20px_rgba(0,62,126,.18)]'
                      : 'border-[#e5dcc8] bg-white text-mc-navy hover:border-[#c5d3e3] hover:bg-[#f8fafc]'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      active ? 'bg-white/15' : 'bg-mc-navy-soft'
                    }`}
                  >
                    <PathIcon name={p.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-[11px] font-bold leading-none">{p.label}</span>
                  {active && (
                    <span className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-mc-gold" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>

          {/* Morphing detail stage */}
          <div
            key={selected.id}
            role="tabpanel"
            className="mb-5 animate-hero-in overflow-hidden rounded-2xl border border-[#e5dcc8] bg-white shadow-[0_1px_0_rgba(11,37,64,.04)]"
          >
            <div className="flex items-stretch">
              <div className="w-1.5 shrink-0 bg-gradient-to-b from-mc-gold to-[#ffe68c]" aria-hidden />
              <div className="flex-1 p-4 sm:p-5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-bold text-mc-navy">{selected.full}</p>
                  <span className="rounded-full bg-mc-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mc-gold-deep">
                    {selected.hint}
                  </span>
                </div>
                <p className="mb-4 max-w-[40ch] text-[13.5px] leading-relaxed text-[#4a6a88]">
                  {selected.detail}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={primaryAction}
                    className="inline-flex h-10 items-center rounded-full bg-mc-gold px-4 text-[13.5px] font-bold text-mc-ink transition hover:bg-[#f0ae12]"
                  >
                    {selected.cta} →
                  </button>
                  <Link
                    to="/groups"
                    className="text-[13px] font-semibold text-mc-navy underline-offset-2 hover:underline"
                  >
                    Or browse groups
                  </Link>
                  {!selected.assess && (
                    <button
                      type="button"
                      onClick={() => open('anxiety')}
                      className="text-[13px] font-semibold text-mc-ink-soft underline-offset-2 hover:text-mc-navy hover:underline"
                    >
                      Prefer a quick test?
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 + trust — solid panel so it never fades into the photo */}
          <div className="rounded-2xl border border-[#e5dcc8] bg-white px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mc-navy text-[11px] font-bold text-white">
                2
              </span>
              <p className="text-[13px] leading-snug text-mc-navy">
                We’ll confirm your preferred time within{' '}
                <strong className="font-bold">1–2 business days</strong>
              </p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ebe4d6] pt-3 text-[12.5px] font-semibold text-mc-navy">
              {['In-person rooms', 'Private video', 'Human review — not auto-book'].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-mc-gold" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Visual column — clean circle composition */}
        <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center pb-2 pt-4">
          <div className="relative aspect-square w-full max-w-[400px]">
            {/* soft gold ring */}
            <div className="absolute inset-[-3%] rounded-full bg-gradient-to-br from-[#ffe68c] via-mc-gold to-[#f0a800] opacity-90" />
            <div className="absolute inset-[2%] rounded-full bg-mc-cream" />

            <button
              type="button"
              onClick={() => goScene((scene + 1) % SCENES.length)}
              className="absolute inset-[4%] overflow-hidden rounded-full shadow-[0_18px_40px_rgba(11,37,64,.16)] ring-4 ring-white focus:outline-none focus-visible:ring-mc-navy/40"
              aria-label={`${current.caption}. Show next image.`}
            >
              <img
                src={current.src}
                alt={current.alt}
                className={`h-full w-full object-cover transition duration-500 ease-out ${
                  fade ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-50'
                }`}
              />
            </button>

            {/* neat floating callouts */}
            {CALLOUTS.map((c, i) => (
              <Link
                key={c.title}
                to={c.to}
                className={`absolute z-10 hidden max-w-[168px] rounded-2xl border border-mc-line/80 bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(11,37,64,.10)] transition hover:-translate-y-0.5 hover:border-mc-gold md:block animate-hero-float ${c.pos}`}
                style={{ animationDelay: `${i * 0.55}s` }}
              >
                <span className="block text-[12.5px] font-bold leading-tight text-mc-navy">{c.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-mc-ink-soft">{c.body}</span>
              </Link>
            ))}

            {/* clinician portraits on the ring */}
            <img src="/therapist-1.jpg" alt="" className="absolute left-[2%] top-[12%] z-10 h-12 w-12 rounded-full border-[3px] border-white object-cover shadow-md animate-hero-float sm:h-14 sm:w-14" />
            <img src="/therapist-2.jpg" alt="" className="absolute right-[0%] top-[40%] z-10 h-12 w-12 rounded-full border-[3px] border-white object-cover shadow-md animate-hero-float [animation-delay:.8s] sm:h-14 sm:w-14" />
            <img src="/therapist-3.jpg" alt="" className="absolute bottom-[10%] left-[18%] z-10 h-11 w-11 rounded-full border-[3px] border-white object-cover shadow-md animate-hero-float [animation-delay:1.4s] sm:h-12 sm:w-12" />
          </div>

          {/* scene caption + thumbs — tidy row */}
          <div className="mt-5 w-full text-center">
            <p className="mb-3 text-sm font-semibold text-mc-navy">
              {current.caption}
              <span className="ml-2 text-xs font-medium text-mc-ink-soft">
                {scene + 1}/{SCENES.length}
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SCENES.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => goScene(i)}
                  aria-label={s.caption}
                  aria-current={i === scene}
                  className={`h-10 w-10 overflow-hidden rounded-full border-[2.5px] transition ${
                    i === scene
                      ? 'border-mc-navy shadow-md scale-105'
                      : 'border-white opacity-75 ring-1 ring-mc-line hover:opacity-100'
                  }`}
                >
                  <img src={s.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
