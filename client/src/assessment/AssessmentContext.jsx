import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ASSESSMENTS, ASSESS_Q, ASSESS_SCALE, LEVEL_COPY, scoreAssessment } from '../data/catalog';

const AssessmentContext = createContext(null);

const LAST_KEY = 'mc.lastAssessment';

export function getLastAssessment() {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AssessmentProvider({ children }) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null);

  const assessment = ASSESSMENTS.find((a) => a.id === activeId) || null;
  const questions = activeId ? ASSESS_Q[activeId] || [] : [];

  const open = useCallback((id) => {
    if (!ASSESSMENTS.some((a) => a.id === id)) return;
    setActiveId(id);
    setStep(0);
    setScores([]);
    setResult(null);
    document.body.style.overflow = 'hidden';
  }, []);

  const close = useCallback(() => {
    setActiveId(null);
    setResult(null);
    document.body.style.overflow = '';
  }, []);

  const answer = useCallback((score) => {
    setScores((prev) => {
      const next = [...prev.slice(0, step), score];
      const qs = ASSESS_Q[activeId] || [];
      if (step + 1 >= qs.length) {
        const scored = scoreAssessment(next);
        const tool = ASSESSMENTS.find((a) => a.id === activeId);
        const payload = {
          id: activeId,
          name: tool?.name || activeId,
          service: tool?.service,
          ...scored,
          at: new Date().toISOString(),
        };
        try {
          sessionStorage.setItem(LAST_KEY, JSON.stringify(payload));
        } catch {
          /* ignore */
        }
        setResult(payload);
      } else {
        setStep(step + 1);
      }
      return next;
    });
  }, [activeId, step]);

  const back = useCallback(() => {
    if (result) {
      setResult(null);
      setStep(Math.max(0, questions.length - 1));
      setScores((s) => s.slice(0, -1));
      return;
    }
    if (step === 0) return;
    setStep(step - 1);
    setScores((s) => s.slice(0, -1));
  }, [result, step, questions.length]);

  const goMatch = useCallback(() => {
    const service = result?.service || assessment?.service || 'Anxiety & Stress';
    close();
    navigate(`/book?service=${encodeURIComponent(service)}`);
  }, [result, assessment, close, navigate]);

  const value = useMemo(
    () => ({ open, close, answer, back, goMatch, activeId, assessment, questions, step, scores, result, scale: ASSESS_SCALE, levelCopy: LEVEL_COPY }),
    [open, close, answer, back, goMatch, activeId, assessment, questions, step, scores, result]
  );

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error('useAssessment requires AssessmentProvider');
  return ctx;
}
