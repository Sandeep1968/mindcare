import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-triggered reveal for calm clinic motion.
 * Respects prefers-reduced-motion.
 */
export default function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  delay = 0,
  y = 18,
  once = true,
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={`mc-reveal ${shown ? 'mc-reveal-in' : ''} ${className}`}
      style={{
        '--mc-reveal-delay': `${delay}ms`,
        '--mc-reveal-y': `${y}px`,
      }}
    >
      {children}
    </Tag>
  );
}
