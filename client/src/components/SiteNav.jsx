import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NAV_LINKS, NAV_MENUS } from '../data/catalog';
import { useAssessment } from '../assessment/AssessmentContext';

function MegaMenu({ menu, open, onClose, onOpenMatch }) {
  if (!open) return null;
  return (
    <div className="absolute left-0 top-full z-50 mt-1 min-w-[280px] rounded-2xl border border-mc-line bg-white p-4 shadow-lg md:min-w-[520px]">
      <div className={`grid gap-4 ${menu.columns.length > 1 ? (menu.cta ? 'md:grid-cols-[1fr_1fr_auto]' : 'md:grid-cols-2') : 'md:grid-cols-1'}`}>
        {menu.columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-mc-gold-deep">{col.title}</h4>
            <ul className="space-y-0.5">
              {col.links.map((link) => {
                const isTest = link.to.startsWith('/assessments/') && link.to !== '/assessments';
                const id = isTest ? link.to.split('/').pop() : null;
                return (
                  <li key={link.to + link.label}>
                    {isTest ? (
                      <button
                        type="button"
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-mc-navy hover:bg-mc-navy-soft"
                        onClick={() => {
                          onClose();
                          window.dispatchEvent(new CustomEvent('mc-open-assess', { detail: id }));
                        }}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link to={link.to} onClick={onClose} className="block rounded-lg px-2 py-1.5 text-sm text-mc-navy hover:bg-mc-navy-soft">
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {menu.cta && (
          <div className="rounded-xl bg-mc-gold-soft p-3 md:max-w-[180px]">
            <p className="mb-2 text-sm font-semibold text-mc-navy">{menu.cta.title}</p>
            {menu.cta.action === 'match' && (
              <button type="button" onClick={() => { onClose(); onOpenMatch(); }} className="mb-2 w-full rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink">
                Get matched
              </button>
            )}
            {menu.cta.link && (
              <Link to={menu.cta.link.to} onClick={onClose} className="text-sm font-semibold text-mc-gold-deep hover:underline">
                {menu.cta.link.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SiteNav() {
  const [openId, setOpenId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpand, setMobileExpand] = useState(null);
  const navRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openAssess } = useAssessment();

  useEffect(() => {
    setOpenId(null);
    setMobileOpen(false);
    setMobileExpand(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!navRef.current?.contains(e.target)) setOpenId(null);
    };
    const onAssess = (e) => openAssess(e.detail);
    document.addEventListener('click', onDoc);
    window.addEventListener('mc-open-assess', onAssess);
    return () => {
      document.removeEventListener('click', onDoc);
      window.removeEventListener('mc-open-assess', onAssess);
    };
  }, [openAssess]);

  return (
    <>
      <nav ref={navRef} className="mx-auto hidden flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Website">
        {NAV_MENUS.map((menu) => (
          <div key={menu.id} className="relative">
            <button
              type="button"
              aria-expanded={openId === menu.id}
              aria-haspopup="true"
              onClick={() => setOpenId((cur) => (cur === menu.id ? null : menu.id))}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-mc-navy hover:bg-mc-navy-soft ${openId === menu.id ? 'bg-mc-navy-soft' : ''}`}
            >
              {menu.label}
              <svg className={`h-3.5 w-3.5 opacity-60 transition ${openId === menu.id ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.2 7.5 10 12.3l4.8-4.8" /></svg>
            </button>
            <MegaMenu
              menu={menu}
              open={openId === menu.id}
              onClose={() => setOpenId(null)}
              onOpenMatch={() => navigate('/book')}
            />
          </div>
        ))}
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold ${isActive ? 'bg-mc-navy-soft text-mc-navy' : 'text-mc-navy hover:bg-mc-navy-soft'}`
            }
          >
            {link.label}
            {link.badge && <span className="rounded-full bg-[#2f7d4a] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">{link.badge}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="ml-auto rounded-lg border border-mc-line px-2.5 py-1.5 text-lg text-mc-navy lg:hidden"
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        ☰
      </button>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-[80vh] overflow-y-auto border-b border-mc-line bg-white px-4 py-3 shadow-md lg:hidden">
          {NAV_MENUS.map((menu) => (
            <div key={menu.id} className="border-b border-mc-line/70 py-1">
              <button
                type="button"
                className="flex w-full items-center justify-between py-2 text-left text-sm font-bold text-mc-navy"
                onClick={() => setMobileExpand((c) => (c === menu.id ? null : menu.id))}
              >
                {menu.label}
                <span>{mobileExpand === menu.id ? '−' : '+'}</span>
              </button>
              {mobileExpand === menu.id && (
                <div className="space-y-3 pb-3 pl-2">
                  {menu.columns.map((col) => (
                    <div key={col.title}>
                      <p className="mb-1 text-[11px] font-bold uppercase text-mc-gold-deep">{col.title}</p>
                      {col.links.map((link) => {
                        const isTest = link.to.startsWith('/assessments/') && link.to !== '/assessments';
                        const id = isTest ? link.to.split('/').pop() : null;
                        return isTest ? (
                          <button
                            key={link.label}
                            type="button"
                            className="block w-full py-1.5 text-left text-sm text-mc-navy"
                            onClick={() => {
                              setMobileOpen(false);
                              openAssess(id);
                            }}
                          >
                            {link.label}
                          </button>
                        ) : (
                          <Link key={link.label} to={link.to} className="block py-1.5 text-sm text-mc-navy" onClick={() => setMobileOpen(false)}>
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                  {menu.cta?.action === 'match' && (
                    <button type="button" className="rounded-lg bg-mc-gold px-3 py-2 text-sm font-bold text-mc-ink" onClick={() => { setMobileOpen(false); navigate('/book'); }}>
                      Get matched
                    </button>
                  )}
                  {menu.cta?.link && (
                    <Link to={menu.cta.link.to} className="block text-sm font-semibold text-mc-gold-deep" onClick={() => setMobileOpen(false)}>
                      {menu.cta.link.label}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="block border-b border-mc-line/70 py-2.5 text-sm font-bold text-mc-navy" onClick={() => setMobileOpen(false)}>
              {link.label} {link.badge && <span className="ml-1 text-[10px] text-[#2f7d4a]">{link.badge}</span>}
            </Link>
          ))}
          <div className="flex gap-2 pt-3">
            <Link to="/book" className="flex-1 rounded-lg border border-mc-line py-2 text-center text-sm font-semibold" onClick={() => setMobileOpen(false)}>Book now</Link>
            <Link to="/book" className="flex-1 rounded-full bg-mc-gold py-2 text-center text-sm font-bold text-mc-ink" onClick={() => setMobileOpen(false)}>Find support</Link>
          </div>
        </div>
      )}
    </>
  );
}
