import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import SiteNav from '../../components/SiteNav';
import BugReportButton from '../../components/BugReportButton';
import AssessmentModal from '../../components/AssessmentModal';
import { AssessmentProvider } from '../../assessment/AssessmentContext';

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AssessmentProvider>
      <div className="relative min-h-screen bg-mc-cream text-mc-ink">
        <div className="flex flex-wrap items-center justify-center gap-3 bg-mc-ink px-4 py-2 text-sm text-white">
          <span>Talk with a therapist · We’ll confirm a time within 1–2 business days</span>
          <Link to="/book" className="rounded-full bg-mc-gold px-3 py-1 text-sm font-semibold text-mc-ink transition hover:bg-[#f0ae12]">
            Book now
          </Link>
        </div>

        <header
          className={`relative sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-mc-line bg-white/95 px-3 py-3 backdrop-blur-md transition-shadow duration-300 md:px-6 ${
            scrolled ? 'shadow-[0_8px_24px_rgba(11,37,64,.08)]' : 'shadow-none'
          }`}
        >
          <Link to="/" className="shrink-0 transition hover:opacity-90">
            <BrandLogo className="h-11 max-w-[190px] md:h-12 md:max-w-[210px]" />
          </Link>
          <SiteNav />
          <div className="ml-auto flex items-center gap-2">
            <BugReportButton />
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/book"
                className="rounded-lg border border-mc-line bg-white px-3 py-2 text-sm font-semibold text-mc-navy transition hover:border-mc-navy/30"
              >
                Book now
              </Link>
              <Link
                to="/book"
                className="mc-btn-pulse rounded-full bg-mc-gold px-4 py-2 text-sm font-semibold text-mc-ink transition hover:bg-[#f0ae12]"
              >
                Find support
              </Link>
            </div>
          </div>
        </header>

        <Outlet />
        <AssessmentModal />

        <footer className="bg-mc-ink px-6 py-10 text-[#c5d8ec]">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="mb-3 inline-flex rounded-xl bg-[#fffdf8] p-2">
                <BrandLogo className="h-12 max-w-[200px]" />
              </div>
              <p className="text-sm">Compassionate therapy for individuals and families.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/book" className="rounded-full bg-mc-gold px-3 py-1.5 text-sm font-bold text-mc-ink">
                  Book now
                </Link>
                <Link to="/assessments" className="rounded-full border border-white/25 px-3 py-1.5 text-sm font-semibold text-white">
                  Take a test
                </Link>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-gold">Care</h4>
              <Link to="/groups" className="mb-1 block text-sm hover:text-white">Support groups</Link>
              <Link to="/therapy" className="mb-1 block text-sm hover:text-white">Therapy</Link>
              <Link to="/assessments" className="mb-1 block text-sm hover:text-white">Take a test</Link>
              <Link to="/book" className="mb-1 block text-sm hover:text-white">Book</Link>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-gold">Explore</h4>
              <Link to="/guides" className="mb-1 block text-sm hover:text-white">Guides</Link>
              <Link to="/resources" className="mb-1 block text-sm hover:text-white">Free resources</Link>
              <Link to="/community" className="mb-1 block text-sm hover:text-white">Community</Link>
              <Link to="/partners" className="mb-1 block text-sm hover:text-white">Partnerships</Link>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-mc-gold">Contact</h4>
              <p className="text-sm">(555) 010-2040</p>
              <p className="text-sm">hello@mindcare.example</p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-4 text-xs text-[#8fb0d4]">
            © {new Date().getFullYear()} MindCare. Compassion. Clarity. Care.
          </p>
        </footer>
      </div>
    </AssessmentProvider>
  );
}
