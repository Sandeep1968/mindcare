import { readLocal, writeLocal, ensureClientDemoStores } from '../dashboard/clients/clientData';

export const ASSIGNED_KEY = 'mindcare.demo.assignedAssessments';
export const ALEX_ID = 'a2000002-0000-4000-8000-000000000001';

export function seedPortalStores(patientId) {
  ensureClientDemoStores([{ id: patientId, name: 'Alex Rivera' }]);

  const assigned = readLocal(ASSIGNED_KEY, []);
  const hasMine = assigned.some((a) => a.patientId === patientId);
  if (!hasMine && patientId === ALEX_ID) {
    writeLocal(ASSIGNED_KEY, [
      {
        id: 'as-seed-1',
        assessmentId: 'anxiety',
        name: 'Anxiety check-in',
        cat: 'Mental health',
        status: 'pending',
        assignedAt: '2026-08-12',
        patientId,
        patientName: 'Alex Rivera',
        assignedBy: 'Dr. Sarah Williams',
      },
      {
        id: 'as-seed-2',
        assessmentId: 'mood',
        name: 'Mood & energy check-in',
        cat: 'Mental health',
        status: 'completed',
        assignedAt: '2026-07-20',
        completedAt: '2026-07-22',
        patientId,
        patientName: 'Alex Rivera',
        assignedBy: 'Dr. Sarah Williams',
      },
      ...assigned,
    ]);
  }
}

export function assignedAssessmentsFor(patientId) {
  return readLocal(ASSIGNED_KEY, []).filter((a) => a.patientId === patientId);
}

export function medicationsFor(patientId) {
  return readLocal('mindcare.demo.medications', []).filter((m) => m.patientId === patientId);
}

export function formsFor(patientId) {
  return readLocal('mindcare.demo.clientForms', []).filter((f) => f.patientId === patientId);
}

export function plansFor(patientId, patientName) {
  return readLocal('mindcare.demo.plans', []).filter(
    (p) => p.patientId === patientId || p.client === patientName,
  );
}

export function formatWhen(date, time) {
  if (!date) return '—';
  const d = new Date(`${date}T12:00:00`);
  const day = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return time ? `${day} · ${time}` : day;
}
