export function seedPortalStores() {
  /* Clinical chart now loads from the API. */
}

export function assignedAssessmentsFor() {
  return [];
}

export function medicationsFor() {
  return [];
}

export function formsFor() {
  return [];
}

export function plansFor() {
  return [];
}

export function formatWhen(date, time) {
  if (!date) return '—';
  const d = new Date(`${date}T12:00:00`);
  const day = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return time ? `${day} · ${time}` : day;
}
