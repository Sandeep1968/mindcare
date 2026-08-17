import { Link } from 'react-router-dom';
import { useAssessment } from '../assessment/AssessmentContext';

export default function AssessmentModal() {
  const { activeId, assessment, questions, step, result, scale, levelCopy, answer, back, close, goMatch } = useAssessment();
  if (!activeId || !assessment) return null;

  const progress = result ? 100 : Math.round((step / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-mc-ink/55 p-4 animate-hero-in" role="dialog" aria-modal="true" aria-labelledby="assess-title" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-hero-in [animation-delay:40ms]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-mc-gold-deep">{assessment.cat}</p>
            <h2 id="assess-title" className="text-lg font-bold text-mc-navy">{assessment.name}</h2>
            <p className="mt-1 text-sm text-mc-ink-soft">{assessment.blurb} This is a self-reflection tool, not a diagnosis.</p>
          </div>
          <button type="button" onClick={close} className="rounded-lg px-2 py-1 text-mc-ink-soft hover:bg-mc-cream" aria-label="Close">✕</button>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-mc-line">
          <div className="h-full bg-mc-gold transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {result ? (
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-mc-gold-deep">Your reflection</p>
            <h3 className="mb-2 text-xl font-bold text-mc-navy">A {result.level} level of strain in this area</h3>
            <p className="mb-2 text-sm text-mc-ink/80">{levelCopy[result.level]}</p>
            <p className="mb-4 text-xs text-mc-ink-soft">Score {result.total} / {result.max}. Not a medical diagnosis. If you are in crisis, call 911 or 988.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={goMatch} className="rounded-full bg-mc-gold px-4 py-2.5 text-sm font-bold text-mc-ink">Get matched</button>
              <Link to="/groups" onClick={close} className="rounded-full border border-mc-line px-4 py-2.5 text-sm font-semibold text-mc-navy">See support groups</Link>
              <button type="button" onClick={close} className="rounded-full border border-mc-line px-4 py-2.5 text-sm font-semibold">Close</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-1 text-base font-semibold text-mc-navy">{questions[step]}</p>
            <p className="mb-4 text-xs text-mc-ink-soft">Question {step + 1} of {questions.length}</p>
            <div className="grid gap-2">
              {scale.map((label, i) => (
                <button key={label} type="button" onClick={() => answer(i)} className="rounded-xl border border-mc-line bg-white px-4 py-3 text-left text-sm font-semibold text-mc-navy transition hover:border-mc-navy hover:bg-mc-navy-soft hover:translate-x-0.5 active:scale-[0.99]">
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-between">
              <button type="button" disabled={step === 0} onClick={back} className="rounded-lg border border-mc-line px-3 py-2 text-sm font-semibold disabled:opacity-40">Back</button>
              <button type="button" onClick={close} className="rounded-lg px-3 py-2 text-sm font-semibold text-mc-ink-soft">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
