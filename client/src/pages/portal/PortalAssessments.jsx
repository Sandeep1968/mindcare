import { useOutletContext } from 'react-router-dom';
import { assignedAssessmentsFor } from './portalData';

export default function PortalAssessments() {
  const { me, user } = useOutletContext();
  const rows = me?.assessments || assignedAssessmentsFor(user?.patientId);

  return (
    <div className="rounded-2xl border border-mc-line bg-white p-5 shadow-sm">
      <h2 className="font-bold text-mc-navy">Assigned assessments</h2>
      <p className="mt-1 text-sm text-mc-ink-soft">
        Only check-ins your therapist assigned to you. You can view status here; completing is done with your clinician.
      </p>
      {!rows.length ? (
        <p className="mt-4 text-sm text-mc-ink-soft">No assessments assigned yet.</p>
      ) : (
        <div className="mt-4 divide-y divide-mc-line">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-semibold text-mc-ink">{a.name}</div>
                <div className="text-xs text-mc-ink-soft">
                  {a.cat} · assigned {a.assignedAt}
                  {a.assignedBy ? ` · ${a.assignedBy}` : ''}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                a.status === 'completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-mc-gold-soft text-mc-gold-deep'
              }`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
