import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { getLastAssessment } from '../../assessment/AssessmentContext';
import { PageHero } from '../../components/PageBits';
import {
  dateIsoInZone,
  formatDualTime,
  getClinicTimeZone,
  tzShortLabel,
} from '../../lib/timezones';

export default function BookPage() {
  const clinicTz = getClinicTimeZone();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    payerType: 'self-pay',
    preferredDate: '',
    preferredTime: '10:00',
    service: params.get('service') || 'Anxiety & Stress',
    sessionType: params.get('sessionType') === 'in-person' ? 'in-person' : 'video',
    notes: '',
    preferredTherapist: params.get('therapist') || '',
  });

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = dateIsoInZone(tomorrow, clinicTz);
    setForm((f) => ({ ...f, preferredDate: f.preferredDate || iso }));
    setAssessment(getLastAssessment());
  }, [clinicTz]);

  useEffect(() => {
    const service = params.get('service');
    const sessionType = params.get('sessionType');
    const therapist = params.get('therapist');
    setForm((f) => ({
      ...f,
      ...(service ? { service } : {}),
      ...(sessionType === 'video' || sessionType === 'in-person' ? { sessionType } : {}),
      ...(therapist ? { preferredTherapist: therapist } : {}),
    }));
  }, [params]);

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          sessionPref: form.sessionType,
          matchCompleted: Boolean(form.preferredTherapist || assessment),
          preferredTherapist: form.preferredTherapist,
          assessment: assessment || null,
          match: assessment
            ? { service: form.service, sessionType: form.sessionType, preferredTherapist: form.preferredTherapist }
            : null,
        }),
      });
      setStatus(`Thanks, ${form.name}. Your ${form.sessionType === 'in-person' ? 'in-person' : 'virtual'} request was received.`);
      setForm((f) => ({ ...f, name: '', email: '', phone: '', notes: '' }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHero
        kicker="Book"
        title="Request an appointment"
        lead="Tell us virtual or in-person. We’ll confirm within 1–2 business days — nothing is locked until staff reviews it."
      />
      <section className="mx-auto max-w-xl px-6 py-12">
        {assessment && (
          <div className="mb-4 rounded-xl border border-mc-line bg-mc-navy-soft/50 p-4 text-sm">
            <strong className="text-mc-navy">Attached reflection:</strong>{' '}
            {assessment.name} — {assessment.level} ({assessment.total}/{assessment.max})
            <div className="mt-1">
              <Link to="/assessments" className="text-xs font-semibold text-mc-gold-deep">Take another test</Link>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="rounded-2xl border border-mc-line bg-white p-6 shadow-md">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-mc-ink-soft">Full name
              <input required name="name" value={form.name} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-mc-ink-soft">Email
              <input required type="email" name="email" value={form.email} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-mc-ink-soft">Phone
              <input required name="phone" value={form.phone} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-mc-ink-soft">Session type
              <select name="sessionType" value={form.sessionType} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm">
                <option value="video">Virtual (Zoom)</option>
                <option value="in-person">In-person</option>
              </select>
            </label>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-mc-ink-soft">Preferred date ({tzShortLabel(clinicTz)})
              <input required type="date" name="preferredDate" value={form.preferredDate} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-mc-ink-soft">Preferred time ({tzShortLabel(clinicTz)})
              <input required type="time" name="preferredTime" value={form.preferredTime} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
            </label>
          </div>
          {form.preferredDate && form.preferredTime && (
            <p className="mb-3 rounded-lg bg-mc-navy-soft/60 px-3 py-2 text-xs text-mc-navy">
              Clinic time: <strong>{formatDualTime(form.preferredDate, form.preferredTime, clinicTz)}</strong>
              {' '}— USA sessions use clinic timezone; India viewers see IST automatically.
            </p>
          )}
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-mc-ink-soft">Focus area
              <select name="service" value={form.service} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm">
                {['Anxiety & Stress', 'Depression & Mood', 'Relationships', 'Trauma & Recovery', 'Life Transitions', 'Personal Growth', 'General / Not sure yet'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-mc-ink-soft">Payer type
              <select name="payerType" value={form.payerType} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm">
                <option value="self-pay">Self-pay</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <label className="mb-3 block text-xs font-semibold text-mc-ink-soft">Preferred therapist (optional)
            <input name="preferredTherapist" value={form.preferredTherapist} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" placeholder="Leave blank for clinic match" />
          </label>
          <label className="mb-4 block text-xs font-semibold text-mc-ink-soft">Anything we should know?
            <textarea name="notes" rows={3} value={form.notes} onChange={update} className="mt-1 w-full rounded-lg border border-mc-line px-3 py-2 text-sm" />
          </label>
          {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
          {status && <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{status}</p>}
          <button type="submit" className="w-full rounded-full bg-mc-gold py-3 text-sm font-bold text-mc-ink">Submit request</button>
          <p className="mt-3 text-center text-xs text-mc-ink-soft">
            Or <Link to="/assessments" className="font-semibold text-mc-navy underline">take a 2-min test</Link> first
          </p>
        </form>
      </section>
    </div>
  );
}
