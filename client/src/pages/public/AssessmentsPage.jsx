import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ASSESSMENTS } from '../../data/catalog';
import { PageHero, AssessCard } from '../../components/PageBits';
import Reveal from '../../components/Reveal';
import { useAssessment } from '../../assessment/AssessmentContext';

export default function AssessmentsPage() {
  const { id } = useParams();
  const { open } = useAssessment();
  const cats = [...new Set(ASSESSMENTS.map((a) => a.cat))];

  useEffect(() => {
    if (id) open(id);
  }, [id, open]);

  return (
    <div>
      <PageHero
        kicker="Self-check-ins"
        title="Take a short reflection"
        lead="Honest tools to name what hurts — not a diagnosis. Results can flow into your booking request for the clinic team."
      />
      <section className="mx-auto max-w-6xl px-6 py-12">
        {cats.map((cat) => (
          <div key={cat} className="mb-10">
            <Reveal>
              <h2 className="mb-4 text-xl font-bold text-mc-navy">{cat}</h2>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ASSESSMENTS.filter((a) => a.cat === cat).map((a, i) => (
                <Reveal key={a.id} delay={i * 55}>
                  <AssessCard a={a} onStart={open} />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
        <p className="text-center text-sm text-mc-ink-soft">
          Prefer to talk first? <Link to="/book" className="font-semibold text-mc-navy underline">Request an appointment</Link>
        </p>
      </section>
    </div>
  );
}
