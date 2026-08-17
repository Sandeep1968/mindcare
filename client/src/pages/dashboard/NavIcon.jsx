function Icon({ name, className = 'h-[18px] w-[18px]' }) {
  const p = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return <svg {...p}><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>;
    case 'calendar':
      return <svg {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></svg>;
    case 'inbox':
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5V3M16 5V3M3 10h18" /></svg>;
    case 'users':
      return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" /><circle cx="17" cy="9" r="2.3" /><path d="M15.8 14.3c2.1.6 3.5 2.7 3.7 5.7" /></svg>;
    case 'clinical':
      return <svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2.3" width="6" height="3" rx="1" /><path d="M9 11h6M9 15h4" /></svg>;
    case 'message':
      return <svg {...p}><path d="M4 5h16v10H8l-4 4z" /></svg>;
    case 'video':
      return <svg {...p}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3z" /></svg>;
    case 'billing':
      return <svg {...p}><path d="M12 2.5v19" /><path d="M8 6.8c0-1.6 1.8-2.8 4-2.8s4 1.2 4 2.6c0 3.4-8 1.6-8 5 0 1.5 1.8 2.7 4 2.7s4-1.1 4-2.6" /></svg>;
    case 'reports':
      return <svg {...p}><path d="M4 20V11M10 20V4M16 20v-7M4 20h16" /></svg>;
    case 'settings':
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.3M12 18.7V21M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M3 12h2.3M18.7 12H21M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" /></svg>;
    default:
      return null;
  }
}

export default Icon;
