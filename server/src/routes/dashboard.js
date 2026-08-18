import { Router } from 'express';
import { sql } from '../db.js';
import { authRequired, requireStaff } from '../middleware/auth.js';
import { hasDatabase, demoState } from '../demo.js';
import { toDateIso, toTimeHm } from '../lib/dates.js';

const router = Router();

router.get('/overview', authRequired, requireStaff, async (req, res) => {
  const today = req.query.date || toDateIso(new Date());

  if (!hasDatabase()) {
    const todayAppts = demoState.appointments.filter((a) => toDateIso(a.appt_date) === today && (a.status || 'confirmed') !== 'declined');
    const newReqs = demoState.requests.filter((r) => r.status === 'new');
    res.set('Cache-Control', 'private, max-age=30');
    return res.json({
      role: req.user.role,
      demoMode: true,
      date: today,
      todayCount: todayAppts.length,
      videoToday: todayAppts.filter((a) => a.session_type === 'video').length,
      inPersonToday: todayAppts.filter((a) => a.session_type === 'in-person').length,
      newRequests: newReqs.length,
      virtualNew: newReqs.filter((r) => r.session_type === 'video').length,
      inPersonNew: newReqs.filter((r) => r.session_type === 'in-person').length,
      patientCount: demoState.patients.length,
      today: todayAppts.map((a) => {
        const p = demoState.patients.find((x) => x.id === a.patient_id);
        return {
          id: a.id,
          patientName: p?.name || 'Patient',
          time: toTimeHm(a.appt_time),
          type: a.session_type,
          reason: a.reason,
          checkedIn: a.checked_in,
          status: a.status || 'confirmed',
        };
      }),
    });
  }

  /* Run all queries in parallel — independent of each other */
  const [todayAppts, [counts]] = await Promise.all([
    sql`
      SELECT a.*, p.name AS patient_name
      FROM appointments a JOIN patients p ON p.id = a.patient_id
      WHERE a.appt_date = ${today}
      ORDER BY a.appt_time
    `,
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM appointment_requests WHERE status = 'new')           AS new_requests,
        (SELECT COUNT(*)::int FROM appointment_requests WHERE status = 'new' AND session_type = 'video')     AS virtual_new,
        (SELECT COUNT(*)::int FROM appointment_requests WHERE status = 'new' AND session_type = 'in-person') AS inperson_new,
        (SELECT COUNT(*)::int FROM patients)                                              AS patients
    `,
  ]);
  const { new_requests, virtual_new, inperson_new, patients } = counts;

  res.set('Cache-Control', 'private, max-age=30');
  res.json({
    role: req.user.role,
    date: today,
    todayCount: todayAppts.length,
    videoToday: todayAppts.filter((a) => a.session_type === 'video').length,
    inPersonToday: todayAppts.filter((a) => a.session_type === 'in-person').length,
    newRequests: new_requests,
    virtualNew: virtual_new,
    inPersonNew: inperson_new,
    patientCount: patients,
    today: todayAppts.map((a) => ({
      id: a.id,
      patientName: a.patient_name,
      time: toTimeHm(a.appt_time),
      type: a.session_type,
      reason: a.reason,
      checkedIn: a.checked_in,
      status: 'confirmed',
    })),
  });
});

export default router;
