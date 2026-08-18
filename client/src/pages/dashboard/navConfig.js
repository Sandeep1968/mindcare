/** Sidebar IA — matches therapist dashboard mockup */
export const NAV = [
  { id: 'dashboard', to: '/dashboard', end: true, label: 'Dashboard', icon: 'home' },
  { id: 'bookings', to: '/dashboard/appointments', label: 'Appointments', icon: 'inbox', badgeKey: 'newRequests' },
  { id: 'patients', to: '/dashboard/patients', label: 'Patients', icon: 'users' },
  {
    id: 'clinical',
    label: 'Clinical Care',
    icon: 'clinical',
    children: [
      { id: 'notes', to: '/dashboard/clinical/notes', label: 'Clinical Notes' },
      { id: 'assessments', to: '/dashboard/clinical/assessments', label: 'Assessments' },
      { id: 'plans', to: '/dashboard/clinical/plans', label: 'Treatment Plans' },
      { id: 'forms', to: '/dashboard/clinical/forms', label: 'Forms & Documents' },
    ],
  },
  { id: 'communication', to: '/dashboard/communication', label: 'Communication', icon: 'message' },
  { id: 'video', to: '/dashboard/video', label: 'Video Visits', icon: 'video' },
  { id: 'billing', to: '/dashboard/billing', label: 'Billing', icon: 'billing' },
  { id: 'reports', to: '/dashboard/reports', label: 'Reports', icon: 'reports', doctorOnly: true },
  { id: 'settings', to: '/dashboard/settings', label: 'Settings', icon: 'settings', doctorOnly: true },
];

export function canSeeNavItem(item, role) {
  if (role === 'patient') return false;
  if (item.doctorOnly && role !== 'admin' && role !== 'practitioner') return false;
  return true;
}

export function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'practitioner') return 'Therapist';
  if (role === 'staff') return 'Help desk';
  return role;
}

export function pageMetaFromPath(pathname) {
  if (TITLES[pathname]) return { name: TITLES[pathname], route: pathname };
  if (pathname.startsWith('/dashboard/patients/')) return { name: 'Patient chart', route: pathname };
  if (pathname.startsWith('/dashboard/clinical')) return { name: 'Clinical Care', route: pathname };
  if (pathname.startsWith('/assessments/')) return { name: 'Assessment', route: pathname };
  if (pathname.startsWith('/guides/')) return { name: 'Guide', route: pathname };
  const last = pathname.split('/').filter(Boolean).pop() || 'home';
  const name = last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, route: pathname };
}

export const TITLES = {
  '/': 'Home',
  '/book': 'Book appointment',
  '/therapy': 'Therapy',
  '/groups': 'Support groups',
  '/assessments': 'Assessments',
  '/guides': 'Guides',
  '/resources': 'Free resources',
  '/community': 'Community',
  '/partners': 'Partnerships',
  '/dashboard': 'Dashboard',
  '/dashboard/appointments': 'Appointments',
  '/dashboard/bookings': 'Website requests',
  '/dashboard/patients': 'Patients',
  '/dashboard/clinical/notes': 'Clinical Notes',
  '/dashboard/clinical/assessments': 'Assessments',
  '/dashboard/clinical/plans': 'Treatment Plans',
  '/dashboard/clinical/forms': 'Forms & Documents',
  '/dashboard/communication': 'Communication',
  '/dashboard/video': 'Video Visits',
  '/dashboard/billing': 'Billing',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
  '/dashboard/login': 'Sign in',
  '/dashboard/portal': 'Patient portal',
};
