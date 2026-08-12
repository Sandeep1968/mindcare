/* ============ MindCare — lightweight solo-practice manager ============ */
/* All data persists in localStorage under one key. No server, no build. */

const STORE_KEY = 'mindcare.v1';
const LEGACY_STORE_KEY = 'theradesk.v1'; // pre-rebrand key; migrated on first load

let db = load();
db.settings = { provider: 'zoom', zoomLink: '', ...(db.settings || {}) };
let currentPatientId = null;
let apptFilter = 'upcoming';

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(LEGACY_STORE_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      localStorage.setItem(STORE_KEY, legacy);
      localStorage.removeItem(LEGACY_STORE_KEY);
      return data;
    }
  } catch (e) { console.error('Failed to load data', e); }
  return { patients: [], appointments: [], invoices: [] };
}

function save() {
  // db can be wholesale-replaced (wipe/import/sample load) — always re-ensure defaults
  db.settings = { provider: 'zoom', zoomLink: '', ...(db.settings || {}) };
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
  renderAll();
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n || 0).toFixed(2);
const patientById = id => db.patients.find(p => p.id === id);
const patientName = id => patientById(id)?.name || '(deleted patient)';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
}
// Local-time date string (toISOString would flip to tomorrow's date in the evening for UTC-negative zones)
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayIso() { return isoDate(new Date()); }
function age(dob) {
  if (!dob) return null;
  const d = new Date(dob + 'T00:00:00'), now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

/* ============ Navigation ============ */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + name).classList.remove('hidden');
  const navKey = name === 'patient-detail' ? 'patients' : name; // detail view keeps Patients highlighted
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.view === navKey));
  window.scrollTo(0, 0);
}
document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => showView(btn.dataset.view)));

/* ============ Toast / modal helpers ============ */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-backdrop').classList.remove('hidden');
  setTimeout(() => document.querySelector('#modal-body input, #modal-body select, #modal-body textarea')?.focus(), 50);
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function patientOptions(selectedId) {
  // Without a preselected patient, force an explicit choice instead of silently
  // defaulting to the first name alphabetically.
  const placeholder = selectedId && patientById(selectedId)
    ? '' : '<option value="" disabled selected>— Select patient —</option>';
  return placeholder + db.patients
    .slice().sort((a, b) => a.name.localeCompare(b.name))
    .map(p => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${esc(p.name)}</option>`)
    .join('');
}

/* ============ Patients ============ */
function openPatientModal(id) {
  const p = id ? patientById(id) : {};
  openModal(id ? 'Edit patient' : 'New patient', `
    <form onsubmit="savePatient(event, '${id || ''}')">
      <div class="form-row">
        <label>Full name *<input class="input" name="name" required value="${esc(p.name)}"></label>
        <label>Date of birth<input class="input" type="date" name="dob" max="${todayIso()}" value="${esc(p.dob)}"></label>
      </div>
      <div class="form-row">
        <label>Phone<input class="input" name="phone" value="${esc(p.phone)}"></label>
        <label>Email<input class="input" type="email" name="email" value="${esc(p.email)}"></label>
      </div>
      <div class="form-row">
        <label>Emergency contact<input class="input" name="emergency" placeholder="Name — phone" value="${esc(p.emergency)}"></label>
      </div>
      <div class="form-row">
        <label>Insurance / payer<input class="input" name="insurance" value="${esc(p.insurance)}"></label>
      </div>
      <div class="form-row">
        <label>General notes<textarea class="input" name="notes">${esc(p.notes)}</textarea></label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        ${id ? `<button type="button" class="btn btn-danger" onclick="deletePatient('${id}')">Delete</button>` : ''}
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Save patient</button>
      </div>
    </form>`);
}

function savePatient(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const data = Object.fromEntries(f.entries());
  if (id) {
    Object.assign(patientById(id), data);
    toast('Patient updated');
  } else {
    db.patients.push({ id: uid(), records: [], created: todayIso(), ...data });
    toast('Patient added');
  }
  closeModal();
  save();
  if (currentPatientId) renderPatientDetail();
}

function deletePatient(id) {
  const p = patientById(id);
  if (!confirm(`Delete ${p.name} and all their records, appointments and invoices? This cannot be undone.`)) return;
  db.patients = db.patients.filter(x => x.id !== id);
  db.appointments = db.appointments.filter(a => a.patientId !== id);
  db.invoices = db.invoices.filter(i => i.patientId !== id);
  closeModal();
  save();
  showView('patients');
  toast('Patient deleted');
}

function editCurrentPatient() { openPatientModal(currentPatientId); }

function renderPatients() {
  const q = (document.getElementById('patient-search').value || '').toLowerCase();
  const list = db.patients
    .filter(p => !q || [p.name, p.phone, p.email].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById('patient-list').innerHTML = list.length ? list.map(p => {
    const a = age(p.dob);
    const lastRec = (p.records || []).slice().sort((x, y) => x.date.localeCompare(y.date)).pop() || null;
    return `<div class="row row-click" onclick="openPatientDetail('${p.id}')">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-sub">${a != null ? a + ' yrs · ' : ''}${esc(p.phone || p.email || 'no contact info')}
          ${lastRec ? ' · last dx: ' + esc(lastRec.diagnosis || '—') : ''}</div>
      </div>
      <button class="btn btn-sm" onclick="event.stopPropagation(); openPatientModal('${p.id}')">Edit</button>
    </div>`;
  }).join('') : '<div class="empty">No patients found.</div>';
}

function openPatientDetail(id) {
  currentPatientId = id;
  renderPatientDetail();
  showView('patient-detail');
}

function renderPatientDetail() {
  const p = patientById(currentPatientId);
  if (!p) return;
  document.getElementById('pd-name').textContent = p.name;
  const a = age(p.dob);
  document.getElementById('pd-meta').textContent = [
    a != null ? `${a} yrs (DOB ${fmtDate(p.dob)})` : null,
    p.phone, p.email, p.insurance ? `Ins: ${p.insurance}` : null,
  ].filter(Boolean).join(' · ') || 'No demographics on file';

  // Clinical records (newest first)
  const recs = (p.records || []).slice().sort((x, y) => y.date.localeCompare(x.date));
  document.getElementById('pd-records').innerHTML = recs.length ? recs.map(r => `
    <div class="record-entry">
      <div class="record-date">${fmtDate(r.date)}
        <button class="btn btn-ghost btn-sm" style="float:right" onclick="openRecordModal('${r.id}')">Edit</button>
      </div>
      <dl>
        <dt>Symptoms</dt><dd>${esc(r.symptoms || '—')}</dd>
        <dt>Diagnosis</dt><dd>${esc(r.diagnosis || '—')}</dd>
        ${r.notes ? `<dt>Session notes</dt><dd>${esc(r.notes)}</dd>` : ''}
      </dl>
    </div>`).join('') : '<div class="empty">No clinical entries yet. Use “+ Clinical Entry”.</div>';

  // Upcoming appointments
  const appts = db.appointments
    .filter(x => x.patientId === p.id && x.date >= todayIso())
    .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  document.getElementById('pd-appts').innerHTML = appts.length ? appts.map(apptRow).join('')
    : '<div class="empty">No upcoming visits.</div>';

  // Billing summary
  const invs = db.invoices.filter(i => i.patientId === p.id);
  const billed = invs.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invs.reduce((s, i) => s + paidAmount(i), 0);
  document.getElementById('pd-billing').innerHTML = `
    <div class="row"><div>Billed</div><b>${money(billed)}</b></div>
    <div class="row"><div>Paid</div><b>${money(paid)}</b></div>
    <div class="row"><div>Balance</div><b style="color:${billed - paid > 0 ? 'var(--danger)' : 'var(--ok)'}">${money(billed - paid)}</b></div>`;
}

/* ============ Clinical records ============ */
function openRecordModal(recordId) {
  const p = patientById(currentPatientId);
  const r = recordId ? p.records.find(x => x.id === recordId) : {};
  openModal(recordId ? 'Edit clinical entry' : `New clinical entry — ${p.name}`, `
    <form onsubmit="saveRecord(event, '${recordId || ''}')">
      <div class="form-row">
        <label>Date *<input class="input" type="date" name="date" required value="${esc(r.date || todayIso())}"></label>
      </div>
      <div class="form-row">
        <label>Presenting symptoms<textarea class="input" name="symptoms" placeholder="e.g. Low mood, poor sleep, anxiety in social settings">${esc(r.symptoms)}</textarea></label>
      </div>
      <div class="form-row">
        <label>Diagnosis / impression<input class="input" name="diagnosis" placeholder="e.g. Generalized Anxiety Disorder (F41.1)" value="${esc(r.diagnosis)}"></label>
      </div>
      <div class="form-row">
        <label>Session notes<textarea class="input" name="notes">${esc(r.notes)}</textarea></label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        ${recordId ? `<button type="button" class="btn btn-danger" onclick="deleteRecord('${recordId}')">Delete</button>` : ''}
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Save entry</button>
      </div>
    </form>`);
}

function saveRecord(e, recordId) {
  e.preventDefault();
  const p = patientById(currentPatientId);
  const data = Object.fromEntries(new FormData(e.target).entries());
  if (recordId) {
    Object.assign(p.records.find(x => x.id === recordId), data);
  } else {
    p.records = p.records || [];
    p.records.push({ id: uid(), ...data });
  }
  closeModal();
  save();
  renderPatientDetail();
  toast('Clinical entry saved');
}

function deleteRecord(recordId) {
  const p = patientById(currentPatientId);
  if (!confirm('Delete this clinical entry?')) return;
  p.records = p.records.filter(x => x.id !== recordId);
  closeModal();
  save();
  renderPatientDetail();
  toast('Entry deleted');
}

/* ============ Appointments ============ */
function videoRoomLink() {
  if (db.settings.provider === 'zoom' && db.settings.zoomLink) return db.settings.zoomLink;
  return 'https://meet.jit.si/MindCare-' + uid();
}

function openApptModal(patientId, apptId) {
  if (!db.patients.length) { toast('Add a patient first'); openPatientModal(); return; }
  const a = apptId ? db.appointments.find(x => x.id === apptId) : {};
  openModal(apptId ? 'Edit appointment' : 'New appointment', `
    <form onsubmit="saveAppt(event, '${apptId || ''}')">
      <div class="form-row">
        <label>Patient *<select class="input" name="patientId" required>${patientOptions(a.patientId || patientId)}</select></label>
      </div>
      <div class="form-row">
        <label>Date *<input class="input" type="date" name="date" required value="${esc(a.date || todayIso())}"></label>
        <label>Time *<input class="input" type="time" name="time" required value="${esc(a.time || '10:00')}"></label>
        <label>Duration (min)<input class="input" type="number" name="duration" min="10" step="5" value="${esc(a.duration || 50)}"></label>
      </div>
      <div class="form-row">
        <label>Visit type *
          <select class="input" name="type" onchange="document.getElementById('loc-wrap').style.display = this.value==='in-person' ? '' : 'none'">
            <option value="video" ${a.type !== 'in-person' ? 'selected' : ''}>Video (link auto-generated)</option>
            <option value="in-person" ${a.type === 'in-person' ? 'selected' : ''}>In person</option>
          </select>
        </label>
      </div>
      <div class="form-row" id="loc-wrap" style="${a.type === 'in-person' ? '' : 'display:none'}">
        <label>Location<input class="input" name="location" placeholder="Office address / room" value="${esc(a.location)}"></label>
      </div>
      <div class="form-row">
        <label>Reason / focus<input class="input" name="reason" placeholder="e.g. Weekly CBT session" value="${esc(a.reason)}"></label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        ${apptId ? `<button type="button" class="btn btn-danger" onclick="deleteAppt('${apptId}')">Delete</button>` : ''}
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Save appointment</button>
      </div>
    </form>`);
}

function saveAppt(e, apptId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  if (apptId) {
    const a = db.appointments.find(x => x.id === apptId);
    // regenerate/clear link only when type changes
    if (data.type === 'video' && !a.link) data.link = videoRoomLink();
    if (data.type === 'in-person') data.link = '';
    Object.assign(a, data);
  } else {
    db.appointments.push({
      id: uid(),
      link: data.type === 'video' ? videoRoomLink() : '',
      ...data,
    });
  }
  closeModal();
  save();
  if (currentPatientId) renderPatientDetail();
  toast('Appointment saved');
}

function deleteAppt(apptId) {
  if (!confirm('Delete this appointment?')) return;
  db.appointments = db.appointments.filter(x => x.id !== apptId);
  closeModal();
  save();
  if (currentPatientId) renderPatientDetail();
  toast('Appointment deleted');
}

function apptRow(a) {
  const isVideo = a.type !== 'in-person';
  return `<div class="row">
    <div class="row-main">
      <div class="row-title">${esc(patientName(a.patientId))}
        <span class="badge ${isVideo ? 'badge-video' : 'badge-inperson'}">${isVideo ? '🎥 Video' : '🏢 In person'}</span>
      </div>
      <div class="row-sub">${fmtDate(a.date)} · ${fmtTime(a.time)} · ${esc(a.duration || 50)} min
        ${a.reason ? ' · ' + esc(a.reason) : ''}${!isVideo && a.location ? ' · 📍 ' + esc(a.location) : ''}</div>
    </div>
    <div class="btn-row">
      ${isVideo && a.link ? `<button class="btn btn-sm btn-primary" onclick="joinVideo('${a.id}')" title="Start this video meeting now">🎥 Start</button>
        <button class="btn btn-sm" onclick="copyLink('${a.id}')">Copy link</button>` : ''}
      <button class="btn btn-sm" onclick="openApptModal(null, '${a.id}')">Edit</button>
    </div>
  </div>`;
}

function setApptFilter(f, btn) {
  apptFilter = f;
  document.querySelectorAll('#view-schedule .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderSchedule();
}

function renderSchedule() {
  const t = todayIso();
  let list = db.appointments.slice();
  if (apptFilter === 'upcoming') list = list.filter(a => a.date >= t);
  if (apptFilter === 'today') list = list.filter(a => a.date === t);
  if (apptFilter === 'past') list = list.filter(a => a.date < t);
  list.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  if (apptFilter === 'past') list.reverse();
  document.getElementById('appt-list').innerHTML =
    list.length ? list.map(apptRow).join('') : '<div class="empty">No appointments in this view.</div>';
}

/* ============ Video ============ */
// Turn a Zoom join URL into a zoommtg:// deep link so the Zoom app opens directly,
// skipping the browser interstitial. Returns null for non-Zoom or vanity links.
function zoomDeepLink(url) {
  const m = String(url || '').match(/zoom\.us\/j\/(\d{8,12})(?:\?[^#]*?pwd=([\w.\-]+))?/);
  return m ? `zoommtg://zoom.us/join?action=join&confno=${m[1]}${m[2] ? '&pwd=' + m[2] : ''}` : null;
}

// Launch a video meeting immediately: Zoom app first via deep link;
// if the app doesn't grab focus within 1.8s, fall back to the browser.
function launchVideo(url) {
  const deep = zoomDeepLink(url);
  if (deep) {
    const fallback = setTimeout(() => {
      // Popup blockers may stop a delayed window.open — tell the user what to do instead of failing silently
      if (!window.open(url, '_blank', 'noopener')) toast('Zoom app not detected — use “Copy link” to open the meeting in your browser');
    }, 1800);
    window.addEventListener('blur', () => clearTimeout(fallback), { once: true });
    window.location.href = deep;
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function joinVideo(apptId) {
  const a = db.appointments.find(x => x.id === apptId);
  if (!a?.link) return;
  launchVideo(a.link);
  navigator.clipboard?.writeText(a.link).catch(() => {});
}
function copyLink(apptId) {
  const a = db.appointments.find(x => x.id === apptId);
  if (!a?.link) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(a.link)
      .then(() => toast('Video link copied — share it with your patient'))
      .catch(() => prompt('Copy this link:', a.link));
  } else {
    prompt('Copy this link:', a.link); // e.g. opened via file:// where the clipboard API is unavailable
  }
}
function startInstantSession() {
  if (db.settings.provider === 'zoom' && !db.settings.zoomLink) {
    showView('video');
    document.getElementById('zoom-link').focus();
    toast('Paste your Zoom personal meeting link first, then press 🎥 again');
    return;
  }
  const link = videoRoomLink();
  launchVideo(link);
  navigator.clipboard?.writeText(link).catch(() => {});
  toast(db.settings.provider === 'zoom'
    ? 'Zoom meeting starting — link copied for your patient'
    : 'Instant room opened — link copied to clipboard');
}

function saveVideoSettings() {
  const provider = document.getElementById('video-provider').value;
  const zoomLink = document.getElementById('zoom-link').value.trim();
  if (provider === 'zoom' && zoomLink && !/^https:\/\/([\w-]+\.)*zoom\.us\//.test(zoomLink)) {
    toast('That does not look like a Zoom link (expected https://…zoom.us/…)');
    return;
  }
  db.settings.provider = provider;
  db.settings.zoomLink = zoomLink;
  // Point upcoming video visits at the new meeting room
  let updated = 0;
  if (provider === 'zoom' && zoomLink) {
    db.appointments.forEach(a => {
      if (a.type !== 'in-person' && a.date >= todayIso() && a.link !== zoomLink) { a.link = zoomLink; updated++; }
    });
  }
  save();
  toast('Video settings saved' + (updated ? ` — ${updated} upcoming video visit${updated > 1 ? 's' : ''} switched to Zoom` : ''));
}

function renderVideo() {
  const provSel = document.getElementById('video-provider');
  const zoomInput = document.getElementById('zoom-link');
  if (document.activeElement !== provSel) provSel.value = db.settings.provider;
  if (document.activeElement !== zoomInput) zoomInput.value = db.settings.zoomLink;
  document.getElementById('video-settings-status').textContent =
    db.settings.provider === 'zoom' && !db.settings.zoomLink
      ? '⚠ No Zoom link saved yet — video visits use Jitsi until you add one.'
      : db.settings.provider === 'zoom' ? '✓ Zoom active' : '✓ Jitsi active';

  const list = db.appointments
    .filter(a => a.type !== 'in-person' && a.date >= todayIso())
    .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  document.getElementById('video-list').innerHTML =
    list.length ? list.map(apptRow).join('') : '<div class="empty">No upcoming video visits. Schedule one from the Schedule page.</div>';
}

/* ============ Billing ============ */
const paidAmount = inv => (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
function invoiceStatus(inv) {
  const paid = paidAmount(inv);
  if (paid >= Number(inv.amount)) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

function openInvoiceModal(invoiceId) {
  if (!db.patients.length) { toast('Add a patient first'); openPatientModal(); return; }
  const inv = invoiceId ? db.invoices.find(x => x.id === invoiceId) : {};
  openModal(invoiceId ? 'Edit invoice' : 'New invoice', `
    <form onsubmit="saveInvoice(event, '${invoiceId || ''}')">
      <div class="form-row">
        <label>Patient *<select class="input" name="patientId" required>${patientOptions(inv.patientId)}</select></label>
        <label>Date *<input class="input" type="date" name="date" required value="${esc(inv.date || todayIso())}"></label>
      </div>
      <div class="form-row">
        <label>Service description *<input class="input" name="description" required placeholder="e.g. Psychotherapy, 50 min (CPT 90837)" value="${esc(inv.description)}"></label>
      </div>
      <div class="form-row">
        <label>Amount (USD) *<input class="input" type="number" name="amount" min="0" step="0.01" required value="${esc(inv.amount)}"></label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        ${invoiceId ? `<button type="button" class="btn btn-danger" onclick="deleteInvoice('${invoiceId}')">Delete</button>` : ''}
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Save invoice</button>
      </div>
    </form>`);
}

function saveInvoice(e, invoiceId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  if (invoiceId) {
    Object.assign(db.invoices.find(x => x.id === invoiceId), data);
  } else {
    db.invoices.push({ id: uid(), payments: [], ...data });
  }
  closeModal();
  save();
  toast('Invoice saved');
}

function deleteInvoice(invoiceId) {
  if (!confirm('Delete this invoice and its payment history?')) return;
  db.invoices = db.invoices.filter(x => x.id !== invoiceId);
  closeModal();
  save();
  toast('Invoice deleted');
}

function openPaymentModal(invoiceId) {
  const inv = db.invoices.find(x => x.id === invoiceId);
  const due = Number(inv.amount) - paidAmount(inv);
  openModal('Record payment', `
    <p class="muted small">${esc(patientName(inv.patientId))} — ${esc(inv.description)}<br>
       Balance due: <b>${money(due)}</b></p>
    <form onsubmit="savePayment(event, '${invoiceId}')">
      <div class="form-row">
        <label>Amount *<input class="input" type="number" name="amount" min="0.01" step="0.01" required value="${due.toFixed(2)}"></label>
        <label>Date *<input class="input" type="date" name="date" required value="${todayIso()}"></label>
      </div>
      <div class="form-row">
        <label>Method
          <select class="input" name="method">
            <option>Card</option><option>Cash</option><option>Check</option>
            <option>Bank transfer</option><option>Insurance</option><option>Other</option>
          </select>
        </label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Record payment</button>
      </div>
    </form>`);
}

function savePayment(e, invoiceId) {
  e.preventDefault();
  const inv = db.invoices.find(x => x.id === invoiceId);
  const data = Object.fromEntries(new FormData(e.target).entries());
  inv.payments = inv.payments || [];
  inv.payments.push(data);
  closeModal();
  save();
  toast('Payment recorded');
}

function renderBilling() {
  const total = db.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = db.invoices.reduce((s, i) => s + paidAmount(i), 0);
  document.getElementById('bill-total').textContent = money(total);
  document.getElementById('bill-paid').textContent = money(paid);
  document.getElementById('bill-due').textContent = money(total - paid);

  const list = db.invoices.slice().sort((x, y) => y.date.localeCompare(x.date));
  document.getElementById('invoice-list').innerHTML = list.length ? list.map(inv => {
    const st = invoiceStatus(inv);
    const badge = { paid: 'badge-paid', partial: 'badge-partial', unpaid: 'badge-unpaid' }[st];
    const lbl = { paid: 'Paid', partial: 'Partially paid', unpaid: 'Unpaid' }[st];
    return `<div class="row">
      <div class="row-main">
        <div class="row-title">${esc(patientName(inv.patientId))} — ${money(inv.amount)}
          <span class="badge ${badge}">${lbl}</span></div>
        <div class="row-sub">${fmtDate(inv.date)} · ${esc(inv.description)}
          ${paidAmount(inv) > 0 ? ' · paid ' + money(paidAmount(inv)) : ''}</div>
      </div>
      <div class="btn-row">
        ${st !== 'paid' ? `<button class="btn btn-sm btn-primary" onclick="openPaymentModal('${inv.id}')">Record payment</button>` : ''}
        <button class="btn btn-sm" onclick="openInvoiceModal('${inv.id}')">Edit</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty">No invoices yet.</div>';
}

/* ============ Reports ============ */
function renderReportSelect() {
  const sel = document.getElementById('report-patient');
  const current = sel.value;
  sel.innerHTML = patientOptions(current);
  if (current && patientById(current)) sel.value = current;
}

function generateReport(patientId) {
  renderReportSelect();
  const sheet = document.getElementById('report-sheet');
  const p = patientById(patientId);
  if (!p) { sheet.innerHTML = '<p class="muted">Select a patient to generate a report.</p>'; return; }
  document.getElementById('report-patient').value = patientId;

  const recs = (p.records || []).slice().sort((x, y) => y.date.localeCompare(x.date));
  const appts = db.appointments.filter(a => a.patientId === p.id)
    .sort((x, y) => y.date.localeCompare(x.date));
  const invs = db.invoices.filter(i => i.patientId === p.id)
    .sort((x, y) => y.date.localeCompare(x.date));
  const billed = invs.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invs.reduce((s, i) => s + paidAmount(i), 0);
  const a = age(p.dob);

  sheet.innerHTML = `
    <div class="report-header">
      <div>
        <div class="report-clinic">MindCare Practice</div>
        <div class="muted small">Confidential health report</div>
      </div>
      <div class="small" style="text-align:right">
        Generated: ${new Date().toLocaleDateString()}<br>
        Patient ID: ${esc(p.id)}
      </div>
    </div>

    <div class="report-section">
      <h3>Patient information</h3>
      <div class="report-kv">
        <div><b>Name:</b> ${esc(p.name)}</div>
        <div><b>Date of birth:</b> ${p.dob ? fmtDate(p.dob) + (a != null ? ` (${a} yrs)` : '') : '—'}</div>
        <div><b>Phone:</b> ${esc(p.phone || '—')}</div>
        <div><b>Email:</b> ${esc(p.email || '—')}</div>
        <div><b>Emergency contact:</b> ${esc(p.emergency || '—')}</div>
        <div><b>Insurance:</b> ${esc(p.insurance || '—')}</div>
      </div>
      ${p.notes ? `<p class="small" style="margin-bottom:0"><b>Notes:</b> ${esc(p.notes)}</p>` : ''}
    </div>

    <div class="report-section">
      <h3>Clinical history</h3>
      ${recs.length ? `<table class="report-table">
        <tr><th style="width:110px">Date</th><th>Symptoms</th><th>Diagnosis</th><th>Notes</th></tr>
        ${recs.map(r => `<tr>
          <td>${fmtDate(r.date)}</td><td>${esc(r.symptoms || '—')}</td>
          <td>${esc(r.diagnosis || '—')}</td><td>${esc(r.notes || '—')}</td></tr>`).join('')}
      </table>` : '<p class="muted small">No clinical entries recorded.</p>'}
    </div>

    <div class="report-section">
      <h3>Visit history</h3>
      ${appts.length ? `<table class="report-table">
        <tr><th style="width:110px">Date</th><th>Time</th><th>Type</th><th>Reason</th></tr>
        ${appts.map(x => `<tr>
          <td>${fmtDate(x.date)}</td><td>${fmtTime(x.time)}</td>
          <td>${x.type === 'in-person' ? 'In person' : 'Video'}</td>
          <td>${esc(x.reason || '—')}</td></tr>`).join('')}
      </table>` : '<p class="muted small">No visits recorded.</p>'}
    </div>

    <div class="report-section">
      <h3>Billing summary</h3>
      ${invs.length ? `<table class="report-table">
        <tr><th style="width:110px">Date</th><th>Service</th><th>Amount</th><th>Status</th></tr>
        ${invs.map(i => `<tr>
          <td>${fmtDate(i.date)}</td><td>${esc(i.description)}</td>
          <td>${money(i.amount)}</td><td>${invoiceStatus(i) === 'paid' ? 'Paid' : invoiceStatus(i) === 'partial' ? 'Partial' : 'Unpaid'}</td></tr>`).join('')}
      </table>
      <p class="small" style="margin-bottom:0"><b>Total billed:</b> ${money(billed)} &nbsp; <b>Paid:</b> ${money(paid)} &nbsp; <b>Balance:</b> ${money(billed - paid)}</p>`
      : '<p class="muted small">No invoices recorded.</p>'}
    </div>

    <div class="report-foot">
      This report was generated by MindCare for clinical and administrative use by the treating therapist.
      It contains confidential protected health information — handle and share according to applicable privacy regulations.
    </div>`;
}

function downloadReportPdf() {
  const sel = document.getElementById('report-patient');
  if (!sel.value) { toast('Select a patient first'); return; }
  // The print stylesheet isolates the report sheet; browsers offer "Save as PDF".
  window.print();
}

/* ============ Data & backup ============ */
function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mindcare-backup-${todayIso()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup downloaded');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.patients)) throw new Error('Not a MindCare backup');
      if (confirm('Replace ALL current data with this backup?')) {
        db = { patients: [], appointments: [], invoices: [], ...data };
        save();
        toast('Backup restored');
      }
    } catch (err) {
      alert('Could not import: ' + err.message);
    } finally {
      e.target.value = ''; // always reset so the same file can be re-picked
    }
  };
  reader.readAsText(file);
}

function wipeData() {
  if (!confirm('Erase ALL data? Export a backup first if you want to keep anything.')) return;
  if (!confirm('Really erase everything? This cannot be undone.')) return;
  db = { patients: [], appointments: [], invoices: [] };
  currentPatientId = null;
  save();
  showView('dashboard');
  toast('All data erased');
}

/* ============ Sample data ============ */
function loadSampleData() {
  const t = new Date();
  const plus = days => { const d = new Date(t); d.setDate(d.getDate() + days); return isoDate(d); };

  const p1 = { id: uid(), name: 'Maya Rodriguez', dob: '1991-04-18', phone: '(555) 210-8842', email: 'maya.r@example.com', emergency: 'Luis Rodriguez — (555) 210-8843', insurance: 'BlueShield PPO', notes: 'Prefers morning appointments.', created: todayIso(), records: [
    { id: uid(), date: plus(-28), symptoms: 'Persistent worry, difficulty sleeping, muscle tension', diagnosis: 'Generalized Anxiety Disorder (F41.1)', notes: 'Started weekly CBT. Introduced sleep hygiene plan.' },
    { id: uid(), date: plus(-7), symptoms: 'Improved sleep, worry episodes reduced to ~2/week', diagnosis: 'GAD — improving', notes: 'Continued cognitive restructuring exercises.' },
  ]};
  const p2 = { id: uid(), name: 'James Okafor', dob: '1985-11-02', phone: '(555) 484-1190', email: 'j.okafor@example.com', emergency: 'Ada Okafor — (555) 484-1191', insurance: 'Self-pay', notes: '', created: todayIso(), records: [
    { id: uid(), date: plus(-14), symptoms: 'Low mood, loss of interest, fatigue', diagnosis: 'Major Depressive Disorder, moderate (F32.1)', notes: 'Behavioral activation plan agreed. Safety assessed — no acute risk.' },
  ]};
  const p3 = { id: uid(), name: 'Sarah Chen', dob: '1999-07-25', phone: '(555) 902-3317', email: 'sarah.chen@example.com', emergency: 'Wei Chen — (555) 902-3318', insurance: 'Aetna HMO', notes: 'University student; telehealth preferred.', created: todayIso(), records: []};

  db = {
    patients: [p1, p2, p3],
    appointments: [
      { id: uid(), patientId: p1.id, date: todayIso(), time: '10:00', duration: '50', type: 'video', link: videoRoomLink(), reason: 'Weekly CBT session', location: '' },
      { id: uid(), patientId: p2.id, date: todayIso(), time: '14:00', duration: '50', type: 'in-person', link: '', reason: 'Follow-up — behavioral activation', location: 'Office, Suite 210' },
      { id: uid(), patientId: p3.id, date: plus(2), time: '11:00', duration: '50', type: 'video', link: videoRoomLink(), reason: 'Intake session', location: '' },
      { id: uid(), patientId: p1.id, date: plus(7), time: '10:00', duration: '50', type: 'video', link: videoRoomLink(), reason: 'Weekly CBT session', location: '' },
    ],
    invoices: [
      { id: uid(), patientId: p1.id, date: plus(-7), description: 'Psychotherapy, 50 min (CPT 90837)', amount: '150', payments: [{ amount: '150', date: plus(-6), method: 'Card' }] },
      { id: uid(), patientId: p2.id, date: plus(-14), description: 'Psychotherapy, 50 min (CPT 90837)', amount: '150', payments: [] },
      { id: uid(), patientId: p1.id, date: plus(-28), description: 'Initial evaluation (CPT 90791)', amount: '200', payments: [{ amount: '100', date: plus(-20), method: 'Card' }] },
    ],
  };
  save();
  toast('Sample data loaded');
}

/* ============ Dashboard ============ */
function renderDashboard() {
  const t = todayIso();
  document.getElementById('dash-date').textContent =
    new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const todayAppts = db.appointments.filter(a => a.date === t);
  const weekAppts = db.appointments.filter(a => a.date >= t && a.date <= isoDate(weekEnd));
  const due = db.invoices.reduce((s, i) => s + Math.max(0, Number(i.amount) - paidAmount(i)), 0);

  document.getElementById('stat-patients').textContent = db.patients.length;
  document.getElementById('stat-today').textContent = todayAppts.length;
  document.getElementById('stat-week').textContent = weekAppts.length;
  document.getElementById('stat-due').textContent = money(due);

  document.getElementById('dash-today-list').innerHTML = todayAppts.length
    ? todayAppts.sort((x, y) => x.time.localeCompare(y.time)).map(apptRow).join('')
    : '<div class="empty">No appointments today.</div>';

  const unpaid = db.invoices.filter(i => invoiceStatus(i) !== 'paid')
    .sort((x, y) => x.date.localeCompare(y.date));
  document.getElementById('dash-unpaid-list').innerHTML = unpaid.length ? unpaid.map(inv => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(patientName(inv.patientId))}</div>
        <div class="row-sub">${fmtDate(inv.date)} · ${esc(inv.description)}</div>
      </div>
      <b>${money(Number(inv.amount) - paidAmount(inv))}</b>
    </div>`).join('') : '<div class="empty">Everything is paid up. 🎉</div>';

  document.getElementById('empty-state').style.display =
    (db.patients.length || db.appointments.length) ? 'none' : '';
}

/* ============ Render everything ============ */
function renderAll() {
  renderDashboard();
  renderPatients();
  renderSchedule();
  renderVideo();
  renderBilling();
  renderReportSelect();
}

renderAll();
