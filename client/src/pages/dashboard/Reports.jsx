import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ModuleHeader } from './ModuleBits';

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [patients, setPatients] = useState(0);

  useEffect(() => {
    api('/dashboard/overview').then(setOverview).catch(() => {});
    api('/patients').then((r) => setPatients(r.length)).catch(() => {});
  }, []);

  return (
    <div>
      <ModuleHeader
        title="Reports"
        lead="Operational snapshot for clinic leadership — counts pulled from live schedule and bookings."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Patients on file', patients],
          ["Today's sessions", overview?.todayCount ?? '—'],
          ['Open website requests', overview?.newRequests ?? '—'],
          ['Virtual today', overview?.videoToday ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-mc-line bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-mc-navy">{value}</div>
            <div className="text-sm font-semibold text-mc-ink">{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-mc-line bg-white p-5">
        <h3 className="mb-2 font-bold text-mc-navy">Quick links</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/appointments" className="rounded-full border border-mc-line px-3 py-1.5 text-sm font-semibold">Appointments</Link>
          <Link to="/dashboard/bookings" className="rounded-full border border-mc-line px-3 py-1.5 text-sm font-semibold">Website bookings</Link>
          <Link to="/dashboard/billing" className="rounded-full border border-mc-line px-3 py-1.5 text-sm font-semibold">Billing</Link>
        </div>
      </div>
    </div>
  );
}
