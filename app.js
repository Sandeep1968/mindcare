/* ============ MindCare — lightweight solo-practice manager ============ */
/* All data persists in localStorage under one key. No server, no build. */

const STORE_KEY = 'mindcare.v1';
const LEGACY_STORE_KEY = 'theradesk.v1'; // pre-rebrand key; migrated on first load

let db = load();
db.settings = { provider: 'zoom', zoomLink: '', clinicName: 'MindCare Practice', ...(db.settings || {}) };
db.users = db.users || [];
db.appointmentRequests = db.appointmentRequests || [];
// migrate accounts created before the doctor -> practitioner rename
db.users.forEach(u => { if (u.role === 'doctor') u.role = 'practitioner'; });
let currentPatientId = null;
let apptFilter = 'upcoming';
let requestFilter = 'new';
// dashboard.html?login=patient (linked from the public site's Patient Login buttons)
// preselects the patient sign-in list; anything else defaults to staff/practitioner.
let authIntent = new URLSearchParams(location.search).get('login') === 'patient' ? 'patient' : 'staff';

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
  return { patients: [], appointments: [], invoices: [], appointmentRequests: [], users: [], settings: {} };
}

function save() {
  // db can be wholesale-replaced (wipe/import/sample load) — always re-ensure defaults
  db.settings = { provider: 'zoom', zoomLink: '', clinicName: 'MindCare Practice', ...(db.settings || {}) };
  db.users = db.users || [];
  db.appointmentRequests = db.appointmentRequests || [];
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

/* ============ Auth: practitioner (super user), staff & patient roles ============ */
// Device-level access control: passwords are salted + hashed, roles gate the UI.
// This is a privacy screen for a shared office computer, not server-grade security.
const SESSION_KEY = 'mindcare.session';
const PRACTITIONER_ONLY_VIEWS = ['reports', 'data'];
const ROLE_LABEL = { practitioner: 'Practitioner', staff: 'Staff', patient: 'Patient' };
const ROLE_RANK = { practitioner: 0, staff: 1, patient: 2 };
const ROLE_BADGE = { practitioner: 'badge-role-practitioner', staff: 'badge-role-staff', patient: 'badge-role-patient' };

function currentUser() {
  // sessionStorage = this tab's login; localStorage = "keep me signed in on this device"
  const id = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  return db.users.find(u => u.id === id) || null;
}
function setSession(id, persist) {
  sessionStorage.setItem(SESSION_KEY, id);
  if (persist) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}
const isPractitioner = () => currentUser()?.role === 'practitioner';
const isStaff = () => currentUser()?.role === 'staff';
const isPatient = () => currentUser()?.role === 'patient';
function requirePractitioner() {
  if (isPractitioner()) return true;
  toast('Practitioner access required');
  return false;
}
function requireStaffAccess() { // practitioner or staff — blocks patient logins
  if (isPatient()) { toast('Not available on patient logins'); return false; }
  return true;
}

async function hashPassword(pw, salt, algo) {
  const bytes = new TextEncoder().encode(salt + ':' + pw);
  const useFnv = algo === 'fnv' || (!algo && !crypto.subtle);
  if (!useFnv && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // FNV-1a fallback for non-secure contexts (e.g. file://) where WebCrypto is unavailable
  let h = 2166136261;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 16777619); }
  return 'fnv' + (h >>> 0).toString(16);
}

// Verify with the SAME algorithm the stored hash was created with, so an account
// created under the fnv fallback still works when opened in a WebCrypto context.
async function verifyPassword(pw, user) {
  const algo = user.hash.startsWith('fnv') ? 'fnv' : 'sha';
  return (await hashPassword(pw, user.salt, algo)) === user.hash;
}

function renderAuth() {
  const pub = document.getElementById('public-site');
  const loggedIn = !!currentUser();

  if (pub) {
    // index.html (route: /) — the public website has no auth gate of its own.
    // A signed-in visitor here is sent straight to the dashboard route instead
    // of maintaining two different "logged in" UIs on one page.
    if (loggedIn) { window.location.href = 'dashboard.html'; return; }
    renderPublicSite();
    return;
  }

  // dashboard.html (route: /dashboard) — this route IS the auth gate; there is
  // nothing else on this page to fall back to.
  const scr = document.getElementById('auth-screen');
  const body = document.getElementById('auth-body');
  const app = document.getElementById('app-shell');

  if (loggedIn) {
    scr.classList.add('hidden');
    body.innerHTML = ''; // never leave a typed password sitting in the DOM
    app.classList.remove('hidden');
    applyRoleUI();
    return;
  }

  app.classList.add('hidden');
  scr.classList.remove('hidden');
  if (!db.users.length) {
    body.innerHTML = `
      <h2>Set up the practitioner account</h2>
      <p class="muted small">This super-user account has full access and manages staff and patient logins.</p>
      <form onsubmit="doSetup(event)">
        <div class="form-row"><label>Your name<input class="input" name="name" required placeholder="Dr. …"></label></div>
        <div class="form-row"><label>Password<input class="input" type="password" name="pw" required minlength="4"></label></div>
        <div class="form-row"><label>Confirm password<input class="input" type="password" name="pw2" required minlength="4"></label></div>
        <div class="auth-error" id="auth-error"></div>
        <button class="btn btn-primary">Create account &amp; open MindCare</button>
      </form>`;
  } else {
    const pool = db.users.filter(u => {
      if (authIntent === 'patient') return u.role === 'patient';
      return u.role === 'practitioner' || u.role === 'staff';
    });
    if (!pool.length) {
      body.innerHTML = `
        <h2>${authIntent === 'patient' ? 'Patient login' : 'Staff sign in'}</h2>
        <p class="muted small">${authIntent === 'patient'
          ? 'No patient portal logins exist yet. Ask the clinic to create one under Settings → Users.'
          : 'No staff or practitioner accounts exist yet.'}</p>
        <button type="button" class="btn" onclick="authIntent='staff';renderAuth()">Staff / Practitioner instead</button>`;
    } else {
      const opts = pool.slice()
        .sort((a, b) => (ROLE_RANK[a.role] - ROLE_RANK[b.role]) || a.name.localeCompare(b.name))
        .map(u => `<option value="${u.id}">${esc(u.name)} (${ROLE_LABEL[u.role] || u.role})</option>`).join('');
      body.innerHTML = `
        <h2>${authIntent === 'patient' ? 'Patient login' : 'Staff / Practitioner sign in'}</h2>
        <form onsubmit="doLogin(event)">
          <div class="form-row"><label>User<select class="input" name="userId">${opts}</select></label></div>
          <div class="form-row"><label>Password<input class="input" type="password" name="pw" required autofocus></label></div>
          <label class="remember"><input type="checkbox" name="remember"> Keep me signed in on this device</label>
          <div class="auth-error" id="auth-error"></div>
          <button class="btn btn-primary">Unlock</button>
        </form>
        <p class="muted small" style="margin-top:12px">
          ${authIntent === 'patient'
            ? `<a href="#" onclick="authIntent='staff';renderAuth();return false">Staff / Practitioner sign in</a>`
            : `<a href="#" onclick="authIntent='patient';renderAuth();return false">Patient login</a>`}
        </p>`;
    }
  }
  setTimeout(() => body.querySelector('input')?.focus(), 50);
}

async function doSetup(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  if (f.get('pw') !== f.get('pw2')) {
    document.getElementById('auth-error').textContent = 'Passwords do not match.';
    return;
  }
  if ((f.get('pw') || '').length < 4) {
    document.getElementById('auth-error').textContent = 'Password must be at least 4 characters.';
    return;
  }
  const salt = uid();
  const user = { id: uid(), name: f.get('name').trim(), role: 'practitioner', salt, hash: await hashPassword(f.get('pw'), salt) };
  db.users.push(user);
  setSession(user.id, false);
  save();
  renderAuth();
  showView('dashboard');
  toast(`Welcome, ${user.name}`);
}

async function doLogin(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const user = db.users.find(u => u.id === f.get('userId'));
  if (!user || !(await verifyPassword(f.get('pw'), user))) {
    document.getElementById('auth-error').textContent = 'Wrong password — try again.';
    e.target.querySelector('[name="pw"]').select();
    return;
  }
  setSession(user.id, f.get('remember') === 'on');
  renderAuth();
  renderAll();
  showView(user.role === 'patient' ? 'portal' : 'dashboard');
  toast(`Welcome back, ${user.name}`);
}

function closeAuth() {
  // dashboard.html has nothing to show without a session — "closing" the
  // login screen means leaving this route and going back to the website.
  window.location.href = 'index.html';
}

function lockApp() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY); // Lock always ends a "keep me signed in" session too
  closeModal();
  // Full navigation away — no need to hand-clear report/print DOM state,
  // the whole page (and any PHI rendered into it) unloads with it.
  window.location.href = 'index.html';
}

function initials(name) {
  return (name || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function applyRoleUI() {
  const u = currentUser();
  const patient = u?.role === 'patient';
  // practitioner-only elements hide for staff and patients
  document.querySelectorAll('[data-doctor-only]').forEach(el =>
    el.classList.toggle('hidden', !!u && u.role !== 'practitioner'));
  // patients see only the portal nav item; everyone else never sees it
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.view === 'portal') el.classList.toggle('hidden', !patient);
    else if (!el.hasAttribute('data-doctor-only')) el.classList.toggle('hidden', patient);
    else if (patient) el.classList.add('hidden');
  });
  // Clinical Care group and Communication are staff/practitioner-facing placeholders — not for patients
  document.getElementById('nav-clinical-care')?.classList.toggle('hidden', patient);
  document.querySelectorAll('.nav-item[data-feature]').forEach(el => el.classList.toggle('hidden', patient));

  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role');
  const avatarEl = document.getElementById('user-avatar');
  if (u) {
    nameEl.textContent = u.name;
    roleEl.textContent = ROLE_LABEL[u.role] || u.role;
    avatarEl.textContent = initials(u.name);
  } else {
    nameEl.textContent = 'Signed out';
    roleEl.textContent = '';
    avatarEl.textContent = '–';
  }
}

/* ============ Navigation ============ */
const VIEW_TITLES = {
  dashboard: 'Dashboard', patients: 'Patients', 'patient-detail': 'Patient',
  schedule: 'Schedule', requests: 'Appointments', video: 'Video Visits', billing: 'Billing & Payments',
  reports: 'Reports', data: 'Settings', portal: 'My Visits & Billing', comingsoon: 'Coming Soon'
};
function showView(name) {
  if (isPatient() && name !== 'portal') { toast('Patient logins can only view their own visits and billing'); return; }
  if (isStaff() && PRACTITIONER_ONLY_VIEWS.includes(name)) { toast('Practitioner access required'); return; }
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + name).classList.remove('hidden');
  const navKey = name === 'patient-detail' ? 'patients' : name; // detail view keeps Patients highlighted
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.view === navKey));
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = VIEW_TITLES[name] || 'MindCare';
  closeAllPopovers();
  closeSidebar();
  window.scrollTo(0, 0);
}

// Coming-soon copy per not-yet-built feature — honest about what's built and where
// the real functionality currently lives, per docs/11-mindcare-experience-architecture.md.
const COMING_SOON_NOTE = {
  'Clinical Notes': 'Today, clinical notes are recorded directly on each patient’s record — open a patient, then “+ Clinical Entry.”',
  'Assessments': 'Structured assessments (e.g. PHQ-9 scoring and trends) are planned but not part of this version yet.',
  'Treatment Plans': 'Structured treatment plans and goals are planned but not part of this version yet.',
  'Forms & Documents': 'Intake forms, consent forms and document storage are planned but not part of this version yet.',
  'Communication': 'For now, please reach patients using the phone/email on file in their record.'
};
function navToComingSoon(feature) {
  if (isPatient()) { toast('Not available on patient logins'); return; }
  document.getElementById('cs-title').textContent = feature;
  document.getElementById('cs-body').textContent = `${feature} is part of MindCare’s planned Clinical Care expansion — not built yet in this version.`;
  document.getElementById('cs-note').textContent = COMING_SOON_NOTE[feature] || '';
  showView('comingsoon');
}

function toggleNavGroup(btn) {
  const group = btn.closest('.nav-group');
  const open = group.getAttribute('data-open') === 'true';
  group.setAttribute('data-open', open ? 'false' : 'true');
  btn.setAttribute('aria-expanded', open ? 'false' : 'true');
}

function openSidebar() {
  document.getElementById('sidebar').setAttribute('data-open', 'true');
  document.getElementById('sidebar-scrim').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').setAttribute('data-open', 'false');
  document.getElementById('sidebar-scrim').classList.remove('show');
}

document.querySelectorAll('.nav-item, .nav-subitem').forEach(btn =>
  btn.addEventListener('click', () => {
    if (btn.dataset.feature) navToComingSoon(btn.dataset.feature);
    else if (btn.dataset.view) showView(btn.dataset.view);
  }));

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
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    if (document.getElementById('auth-screen')?.dataset.open === 'true' && !currentUser()) closeAuth();
  }
});

/* ============ Topbar: search, notifications, user menu ============ */
function closeAllPopovers() {
  ['search-results', 'notif-panel', 'user-menu-panel'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  document.getElementById('notif-btn')?.setAttribute('aria-expanded', 'false');
  document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-search') && !e.target.closest('.topbar-action-wrap')) closeAllPopovers();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllPopovers();
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('global-search')?.focus();
  }
});

function runGlobalSearch(q) {
  const box = document.getElementById('search-results');
  if (!box) return;
  q = (q || '').trim().toLowerCase();
  if (!q || isPatient()) { box.classList.add('hidden'); return; }

  const patients = db.patients.filter(p => [p.name, p.phone, p.email].join(' ').toLowerCase().includes(q)).slice(0, 5);
  const t = todayIso();
  const appts = db.appointments.filter(a => a.date >= t && patientName(a.patientId).toLowerCase().includes(q)).slice(0, 4);

  let html = '';
  if (patients.length) {
    html += '<div class="popover-head">Patients</div>' + patients.map(p =>
      `<button type="button" class="popover-item" onclick="selectSearchResult('patient','${p.id}')">${esc(p.name)}${p.phone ? ' · ' + esc(p.phone) : ''}</button>`).join('');
  }
  if (appts.length) {
    html += '<div class="popover-head">Upcoming appointments</div>' + appts.map(a =>
      `<button type="button" class="popover-item" onclick="selectSearchResult('appt','${a.id}')">${esc(patientName(a.patientId))} — ${fmtDate(a.date)} ${fmtTime(a.time)}</button>`).join('');
  }
  if (!html) html = '<div class="popover-empty">No matches</div>';
  box.innerHTML = '<div class="popover-body">' + html + '</div>';
  box.classList.remove('hidden');
}
function selectSearchResult(kind, id) {
  document.getElementById('global-search').value = '';
  document.getElementById('search-results').classList.add('hidden');
  const patientId = kind === 'patient' ? id : db.appointments.find(x => x.id === id)?.patientId;
  if (!patientId) return;
  showView('patients');
  openPatientDetail(patientId);
}

// The same real, honest data used on the Dashboard's "Needs attention" — no separate
// notification store, just a different lens on the same computed lists.
function needsAttentionItems() {
  if (isPatient()) return [];
  const reqs = (db.appointmentRequests || []).filter(r => r.status === 'new')
    .map(r => ({ label: `Booking request — ${r.name}`, action: () => showView('requests') }));
  if (isPractitioner()) {
    return reqs
      .concat(pendingNoteAppointments().map(x => ({ label: `Note pending — ${x.patient.name}`, action: () => { openPatientDetail(x.patient.id); openRecordModal(); } })))
      .concat(followUpClients().map(p => ({ label: `Follow-up due — ${p.name}`, action: () => openApptModal(p.id) })));
  }
  return reqs.concat(db.invoices.filter(i => invoiceStatus(i) !== 'paid')
    .map(inv => ({ label: `Payment due — ${patientName(inv.patientId)}`, action: () => openPaymentModal(inv.id) })));
}
function renderNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const n = needsAttentionItems().length;
  badge.textContent = n;
  badge.classList.toggle('hidden', n === 0);
}
let notifActions = [];
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const willOpen = panel.classList.contains('hidden');
  closeAllPopovers();
  if (!willOpen) return;
  notifActions = needsAttentionItems();
  panel.innerHTML = '<div class="popover-head">Needs attention</div><div class="popover-body">' +
    (notifActions.length ? notifActions.map((it, i) => `<button type="button" class="popover-item" onclick="notifActions[${i}].action();closeAllPopovers()">${esc(it.label)}</button>`).join('')
      : '<div class="popover-empty">You\'re all caught up ✓</div>') + '</div>';
  panel.classList.remove('hidden');
  document.getElementById('notif-btn').setAttribute('aria-expanded', 'true');
}

function toggleUserMenu() {
  const panel = document.getElementById('user-menu-panel');
  const willOpen = panel.classList.contains('hidden');
  closeAllPopovers();
  if (!willOpen) return;
  const u = currentUser();
  panel.innerHTML = `<div class="popover-head">${u ? esc(u.name) : ''}</div><div class="popover-body">
    <button type="button" class="popover-item" onclick="closeAllPopovers();lockApp()">Sign out</button>
  </div>`;
  panel.classList.remove('hidden');
  document.getElementById('user-menu-btn').setAttribute('aria-expanded', 'true');
}

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
  if (!requireStaffAccess()) return;
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
  db.users = db.users.filter(u => u.patientId !== id); // remove the patient's portal login too
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

  // Clinical records (newest first) — rendered only for the practitioner, not just hidden
  const recs = !isPractitioner() ? [] : (p.records || []).slice().sort((x, y) => y.date.localeCompare(x.date));
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

/* ============ Clinical records (doctor only) ============ */
function openRecordModal(recordId) {
  if (!requirePractitioner()) return;
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
        <label>Session notes
          <span class="btn-row" style="margin-bottom:4px">
            <button type="button" class="btn btn-sm" onclick="insertNoteTemplate(this, 'SOAP')">Insert SOAP template</button>
            <button type="button" class="btn btn-sm" onclick="insertNoteTemplate(this, 'DAP')">Insert DAP template</button>
          </span>
          <textarea class="input" name="notes" rows="6">${esc(r.notes)}</textarea>
        </label>
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
  if (!requirePractitioner()) return;
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

const NOTE_TEMPLATES = {
  SOAP: 'S — Subjective:\n\nO — Objective:\n\nA — Assessment:\n\nP — Plan:\n',
  DAP: 'D — Data:\n\nA — Assessment:\n\nP — Plan:\n',
};
function insertNoteTemplate(btn, key) {
  const ta = btn.closest('label').querySelector('textarea[name="notes"]');
  ta.value = ta.value.trim() ? ta.value.replace(/\s*$/, '\n\n') + NOTE_TEMPLATES[key] : NOTE_TEMPLATES[key];
  ta.focus();
}

function deleteRecord(recordId) {
  if (!requirePractitioner()) return;
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
  if (!requireStaffAccess()) return;
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
  document.querySelectorAll('#sched-filters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderSchedule();
}

let scheduleMode = 'list';
let weekOffset = 0; // weeks relative to the current one

function setScheduleMode(m) {
  scheduleMode = m;
  document.getElementById('mode-list').classList.toggle('active', m === 'list');
  document.getElementById('mode-week').classList.toggle('active', m === 'week');
  document.getElementById('sched-filters').classList.toggle('hidden', m !== 'list');
  document.getElementById('appt-list').classList.toggle('hidden', m !== 'list');
  document.getElementById('week-nav').classList.toggle('hidden', m !== 'week');
  document.getElementById('appt-week').classList.toggle('hidden', m !== 'week');
  renderSchedule();
}

function shiftWeek(dir) {
  weekOffset = dir === 0 ? 0 : weekOffset + dir;
  renderSchedule();
}

function startOfWeek() { // Monday of the displayed week
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderWeek() {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek()); d.setDate(d.getDate() + i); return d;
  });
  document.getElementById('week-label').textContent =
    `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ` +
    `${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  document.getElementById('appt-week').innerHTML = days.map(d => {
    const iso = isoDate(d);
    const appts = db.appointments.filter(a => a.date === iso).sort((x, y) => x.time.localeCompare(y.time));
    return `<div class="day-col ${iso === todayIso() ? 'today' : ''}">
      <div class="day-head">${d.toLocaleDateString(undefined, { weekday: 'short' })}<span>${d.getDate()}</span></div>
      ${appts.map(a => `<button class="appt-chip ${a.type === 'in-person' ? 'chip-inperson' : 'chip-video'}"
        onclick="openApptModal(null, '${a.id}')" title="${esc(patientName(a.patientId))}${a.reason ? ' — ' + esc(a.reason) : ''}">
        <b>${fmtTime(a.time)}</b>${esc(patientName(a.patientId).split(' ')[0])} ${a.type === 'in-person' ? '🏢' : '🎥'}</button>`).join('')
      || '<div class="day-empty">—</div>'}
    </div>`;
  }).join('');
}

function renderSchedule() {
  if (scheduleMode === 'week') { renderWeek(); return; }
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
  if (!requireStaffAccess()) return;
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
  if (!requireStaffAccess()) return;
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
  if (!requireStaffAccess()) return;
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
  if (!requireStaffAccess()) return;
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
        <button class="btn btn-sm" onclick="printInvoice('${inv.id}')" title="Print a statement/superbill for this invoice">Print</button>
        <button class="btn btn-sm" onclick="openInvoiceModal('${inv.id}')">Edit</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty">No invoices yet.</div>';
}

// Printable statement/superbill for a single invoice — patients can submit
// this to their insurer for out-of-network reimbursement.
function printInvoice(invoiceId) {
  const inv = db.invoices.find(x => x.id === invoiceId);
  const p = patientById(inv.patientId);
  const paid = paidAmount(inv);
  const due = Number(inv.amount) - paid;
  document.getElementById('print-invoice').innerHTML = `
    <div class="report-sheet" style="box-shadow:none;border:none">
      <div class="report-header">
        <div>
          <div class="report-clinic">MindCare Practice</div>
          <div class="muted small">Statement of services (superbill)</div>
        </div>
        <div class="small" style="text-align:right">
          Statement date: ${new Date().toLocaleDateString()}<br>
          Invoice ID: ${esc(inv.id)}
        </div>
      </div>
      <div class="report-section">
        <h3>Patient</h3>
        <div class="report-kv">
          <div><b>Name:</b> ${esc(p?.name || '(deleted patient)')}</div>
          <div><b>Date of birth:</b> ${p?.dob ? fmtDate(p.dob) : '—'}</div>
          <div><b>Insurance:</b> ${esc(p?.insurance || '—')}</div>
        </div>
      </div>
      <div class="report-section">
        <h3>Services</h3>
        <table class="report-table">
          <tr><th style="width:120px">Date of service</th><th>Description</th><th style="width:90px">Charge</th></tr>
          <tr><td>${fmtDate(inv.date)}</td><td>${esc(inv.description)}</td><td>${money(inv.amount)}</td></tr>
        </table>
      </div>
      <div class="report-section">
        <h3>Payments</h3>
        ${(inv.payments || []).length ? `<table class="report-table">
          <tr><th style="width:120px">Date</th><th>Method</th><th style="width:90px">Amount</th></tr>
          ${inv.payments.map(pay => `<tr><td>${fmtDate(pay.date)}</td><td>${esc(pay.method || '—')}</td><td>${money(pay.amount)}</td></tr>`).join('')}
        </table>` : '<p class="muted small">No payments recorded.</p>'}
        <p class="small" style="margin-bottom:0"><b>Total charged:</b> ${money(inv.amount)} &nbsp;
          <b>Paid:</b> ${money(paid)} &nbsp; <b>Balance due:</b> ${money(due)}</p>
      </div>
      <div class="report-foot">
        Statement generated by MindCare for the patient's records and insurance reimbursement.
        Provider details and tax ID may be added by hand or stamp where the insurer requires them.
      </div>
    </div>`;
  document.body.classList.add('print-invoice-mode');
  window.addEventListener('afterprint',
    () => document.body.classList.remove('print-invoice-mode'), { once: true });
  window.print();
}

/* ============ Reports ============ */
function renderReportSelect() {
  const sel = document.getElementById('report-patient');
  const current = sel.value;
  sel.innerHTML = patientOptions(current);
  if (current && patientById(current)) sel.value = current;
}

function generateReport(patientId) {
  if (currentUser() && !isPractitioner()) { toast('Practitioner access required'); return; }
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

/* ============ Patient portal (Patient dashboard) ============ */
// What a patient login sees: their own visits (join video, copy link) and billing. Read-only,
// plus a small set of honest quick actions — nothing here claims a capability (self-booking,
// messaging) that doesn't actually exist yet.
function renderPortal() {
  const el = document.getElementById('portal-body');
  const u = currentUser();
  if (u?.role !== 'patient') { el.innerHTML = ''; return; }
  const p = patientById(u.patientId);
  const title = document.getElementById('portal-title');
  if (!p) {
    title.textContent = 'My visits';
    el.innerHTML = '<div class="card"><p class="muted">Your login is not linked to a patient record yet — please contact the practice.</p></div>';
    return;
  }
  title.textContent = `${greeting()}, ${p.name.split(' ')[0]}`;
  const t = todayIso();
  const mine = db.appointments.filter(a => a.patientId === p.id);
  const upcoming = mine.filter(a => a.date >= t).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const next = upcoming[0] || null;
  const laterUpcoming = upcoming.slice(1);
  const past = mine.filter(a => a.date < t).sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time)).slice(0, 5);
  const invs = db.invoices.filter(i => i.patientId === p.id).sort((x, y) => y.date.localeCompare(x.date));
  const billed = invs.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invs.reduce((s, i) => s + paidAmount(i), 0);

  const visitRow = (a, joinable) => {
    const isVideo = a.type !== 'in-person';
    return `<div class="row">
      <div class="row-main">
        <div class="row-title">${fmtDate(a.date)} · ${fmtTime(a.time)}
          <span class="badge ${isVideo ? 'badge-video' : 'badge-inperson'}">${isVideo ? '🎥 Video' : '🏢 In person'}</span></div>
        <div class="row-sub">${esc(a.duration || 50)} min${a.reason ? ' · ' + esc(a.reason) : ''}${!isVideo && a.location ? ' · 📍 ' + esc(a.location) : ''}</div>
      </div>
      ${joinable && isVideo && a.link ? `<div class="btn-row">
        <button type="button" class="btn btn-sm btn-primary" onclick="joinVideo('${a.id}')">🎥 Join</button>
        <button type="button" class="btn btn-sm" onclick="copyLink('${a.id}')">Copy link</button></div>` : ''}
    </div>`;
  };

  const heroHtml = next ? (() => {
    const isVideo = next.type !== 'in-person';
    return `<div class="hero-appt">
      <div class="hero-label">Your next appointment</div>
      <div class="hero-when">${fmtDate(next.date)} at ${fmtTime(next.time)}</div>
      <div class="hero-sub">${esc(next.duration || 50)} min · ${isVideo ? '🎥 Virtual visit' : '🏢 In person'}${next.reason ? ' · ' + esc(next.reason) : ''}
        ${!isVideo && next.location ? '<br>📍 ' + esc(next.location) : ''}</div>
      <div class="hero-actions btn-row">
        ${isVideo && next.link ? `<button type="button" class="btn btn-primary" onclick="joinVideo('${next.id}')">🎥 Join Session</button>
          <button type="button" class="btn" onclick="copyLink('${next.id}')">Copy link</button>` : ''}
      </div>
    </div>`;
  })() : `<div class="hero-appt"><div class="hero-label">Your next appointment</div>
      <p class="hero-empty">No upcoming appointments scheduled — contact the clinic to book one.</p></div>`;

  const quickActions = `<div class="card"><h2>Quick actions</h2>
    <div class="btn-row">
      <button type="button" class="btn btn-primary" onclick="toast('Online booking is coming soon — please contact the clinic to book.')">Book Appointment</button>
      <button type="button" class="btn" onclick="toast('Secure messaging is coming soon — please contact the clinic directly for now.')">Message Clinic</button>
      <button type="button" class="btn" onclick="document.getElementById('portal-billing').scrollIntoView({behavior:'smooth'})">View Billing</button>
    </div></div>`;

  el.innerHTML = heroHtml + quickActions +
    (laterUpcoming.length ? `<div class="card"><h2>Also upcoming</h2>
      ${laterUpcoming.map(a => visitRow(a, true)).join('')}
    </div>` : '') +
    `<div class="card"><h2>Recent visits</h2>
      ${past.length ? past.map(a => visitRow(a, false)).join('') : '<div class="empty">No past visits.</div>'}
    </div>
    <div class="card" id="portal-billing"><h2>My billing</h2>
      ${invs.map(inv => {
        const st = invoiceStatus(inv);
        const badge = { paid: 'badge-paid', partial: 'badge-partial', unpaid: 'badge-unpaid' }[st];
        const lbl = { paid: 'Paid', partial: 'Partially paid', unpaid: 'Unpaid' }[st];
        return `<div class="row"><div class="row-main">
          <div class="row-title">${money(inv.amount)} <span class="badge ${badge}">${lbl}</span></div>
          <div class="row-sub">${fmtDate(inv.date)} · ${esc(inv.description)}</div></div></div>`;
      }).join('') || '<div class="empty">No invoices.</div>'}
      ${invs.length ? `<div class="row"><div><b>Balance due</b></div>
        <b style="color:${billed - paid > 0 ? 'var(--danger)' : 'var(--ok)'}">${money(billed - paid)}</b></div>` : ''}
    </div>`;
}

/* ============ Users & access (practitioner only) ============ */
function renderUsers() {
  const el = document.getElementById('user-list');
  el.innerHTML = db.users.map(u => `<div class="row">
    <div class="row-main">
      <div class="row-title">${esc(u.name)}
        <span class="badge ${ROLE_BADGE[u.role] || 'badge-partial'}">${ROLE_LABEL[u.role] || u.role}</span>
        ${u.role === 'patient' ? `<span class="muted small">→ ${esc(patientName(u.patientId))}</span>` : ''}
        ${currentUser()?.id === u.id ? '<span class="muted small">(you)</span>' : ''}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-sm" onclick="openPasswordModal('${u.id}')">Reset password</button>
      ${canDeleteUser(u) ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Remove</button>` : ''}
    </div>
  </div>`).join('') || '<div class="empty">No users yet.</div>';
}

function canDeleteUser(u) {
  if (u.role !== 'practitioner') return true;
  // never delete yourself or the last remaining practitioner
  return u.id !== currentUser()?.id && db.users.filter(x => x.role === 'practitioner').length > 1;
}

function openUserModal() {
  if (!requirePractitioner()) return;
  openModal('Add user', `
    <form onsubmit="saveUser(event)">
      <div class="form-row">
        <label>Name *<input class="input" name="name" required></label>
        <label>Role
          <select class="input" name="role" onchange="document.getElementById('patient-link-wrap').style.display = this.value==='patient' ? '' : 'none'">
            <option value="staff" selected>Staff</option>
            <option value="patient">Patient (own visits &amp; billing only)</option>
            <option value="practitioner">Practitioner (full access)</option>
          </select>
        </label>
      </div>
      <div class="form-row" id="patient-link-wrap" style="display:none">
        ${db.patients.length
          ? `<label>Linked patient record *
              <select class="input" name="patientId" onchange="autofillPatientName(this)">${patientOptions()}</select>
            </label>`
          : `<div class="empty">⚠ No patient records exist yet. First add the patient under
              <b>Patients → + New Patient</b>, then come back here to create their login.</div>`}
      </div>
      <div class="form-row">
        <label>Password *<input class="input" type="password" name="pw" required minlength="4"></label>
        <label>Confirm *<input class="input" type="password" name="pw2" required minlength="4"></label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Add user</button>
      </div>
    </form>`);
}

// Picking a linked patient pre-fills the login name if it's still empty
function autofillPatientName(sel) {
  const nameInput = document.querySelector('#modal-body [name="name"]');
  const p = patientById(sel.value);
  if (p && nameInput && !nameInput.value.trim()) nameInput.value = p.name;
}

async function saveUser(e) {
  e.preventDefault();
  if (!requirePractitioner()) return;
  const f = new FormData(e.target);
  if (f.get('pw') !== f.get('pw2')) { toast('Passwords do not match'); return; }
  const role = f.get('role');
  const patientId = role === 'patient' ? f.get('patientId') : undefined;
  if (role === 'patient' && !patientId) {
    toast(db.patients.length
      ? 'Choose the patient record this login belongs to'
      : 'Add the patient first (Patients → + New Patient), then create their login');
    return;
  }
  const salt = uid();
  db.users.push({
    id: uid(), name: f.get('name').trim(), role, patientId,
    salt, hash: await hashPassword(f.get('pw'), salt),
  });
  closeModal();
  save();
  toast('User added');
}

function openPasswordModal(userId) {
  if (!requirePractitioner()) return;
  const u = db.users.find(x => x.id === userId);
  openModal(`Reset password — ${u.name}`, `
    <form onsubmit="savePassword(event, '${userId}')">
      <div class="form-row">
        <label>New password *<input class="input" type="password" name="pw" required minlength="4"></label>
        <label>Confirm *<input class="input" type="password" name="pw2" required minlength="4"></label>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary">Set password</button>
      </div>
    </form>`);
}

async function savePassword(e, userId) {
  e.preventDefault();
  if (!requirePractitioner()) return;
  const f = new FormData(e.target);
  if (f.get('pw') !== f.get('pw2')) { toast('Passwords do not match'); return; }
  const u = db.users.find(x => x.id === userId);
  u.salt = uid();
  u.hash = await hashPassword(f.get('pw'), u.salt);
  closeModal();
  save();
  toast(`Password updated for ${u.name}`);
}

function deleteUser(userId) {
  if (!requirePractitioner()) return;
  const u = db.users.find(x => x.id === userId);
  if (!canDeleteUser(u)) return;
  if (!confirm(`Remove ${u.name}'s login? Patient data is not affected.`)) return;
  db.users = db.users.filter(x => x.id !== userId);
  save();
  toast('User removed');
}

/* ============ Data & backup ============ */
function exportData() {
  if (!requirePractitioner()) return;
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mindcare-backup-${todayIso()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup downloaded');
}

function importData(e) {
  if (!requirePractitioner()) { e.target.value = ''; return; }
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.patients)) throw new Error('Not a MindCare backup');
      if (confirm('Replace ALL current data with this backup?')) {
        // keep current logins/settings when the backup predates them
        db = { patients: [], appointments: [], invoices: [], appointmentRequests: [], users: db.users, settings: db.settings, ...data };
        db.appointmentRequests = db.appointmentRequests || [];
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
  if (!requirePractitioner()) return;
  if (!confirm('Erase ALL patient data? Export a backup first if you want to keep anything. (Logins and video settings are kept.)')) return;
  if (!confirm('Really erase everything? This cannot be undone.')) return;
  db = { patients: [], appointments: [], invoices: [], appointmentRequests: [], users: db.users, settings: db.settings };
  currentPatientId = null;
  save();
  showView('dashboard');
  toast('All patient data erased');
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
    users: db.users,
    settings: db.settings,
    appointmentRequests: db.appointmentRequests || [],
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

/* ============ Dashboard (role-aware) ============ */
// Three questions only: what's happening today, what needs attention, what can I do quickly.
// Therapist/Staff dashboards are built here; the Patient dashboard lives in renderPortal().

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function qa(label, onclick, primary) {
  return `<button type="button" class="btn ${primary ? 'btn-primary' : ''}" onclick="${onclick}">${esc(label)}</button>`;
}

// Heuristic derived entirely from existing data — no fabricated fields: a same-day-or-earlier
// appointment with no clinical entry dated that same day for that patient.
function pendingNoteAppointments() {
  const t = todayIso();
  return db.appointments
    .filter(a => a.date <= t && patientById(a.patientId))
    .map(a => {
      const p = patientById(a.patientId);
      const hasNote = (p.records || []).some(r => r.date === a.date);
      return hasNote ? null : { appt: a, patient: p };
    })
    .filter(Boolean)
    .sort((x, y) => y.appt.date.localeCompare(x.appt.date));
}

// Heuristic derived entirely from existing data: a patient whose most recent visit was
// FOLLOW_UP_DAYS+ ago with nothing booked since. Not a real "follow-up" workflow yet —
// just a useful, honest signal from appointment history.
const FOLLOW_UP_DAYS = 14;
function followUpClients() {
  const t = todayIso();
  return db.patients.filter(p => {
    const appts = db.appointments.filter(a => a.patientId === p.id);
    if (!appts.length || appts.some(a => a.date >= t)) return false;
    const last = appts.slice().sort((x, y) => x.date.localeCompare(y.date)).pop();
    return (new Date(t) - new Date(last.date + 'T00:00:00')) / 86400000 >= FOLLOW_UP_DAYS;
  });
}

function toggleCheckIn(apptId) {
  if (!requireStaffAccess()) return;
  const a = db.appointments.find(x => x.id === apptId);
  if (!a) return;
  a.checkedIn = !a.checkedIn;
  save();
  toast(a.checkedIn ? 'Checked in' : 'Check-in removed');
}

function dashSessionRow(a) {
  const isVideo = a.type !== 'in-person';
  return `<div class="row">
    <div class="row-main">
      <div class="row-title">${fmtTime(a.time)} — ${esc(patientName(a.patientId))}
        <span class="badge ${isVideo ? 'badge-video' : 'badge-inperson'}">${isVideo ? '🎥 Virtual' : '🏢 In-person'}</span></div>
      <div class="row-sub">${esc(a.reason || 'Session')}${!isVideo && a.location ? ' · 📍 ' + esc(a.location) : ''}</div>
    </div>
    <div class="btn-row">
      ${isVideo && a.link ? `<button type="button" class="btn btn-sm btn-primary" onclick="joinVideo('${a.id}')">🎥 Join</button>` : ''}
      <button type="button" class="btn btn-sm" onclick="openPatientDetail('${a.patientId}')">View Client</button>
    </div>
  </div>`;
}

function dashStaffApptRow(a) {
  const isVideo = a.type !== 'in-person';
  const checked = !!a.checkedIn;
  return `<div class="row">
    <div class="row-main">
      <div class="row-title">${fmtTime(a.time)} — ${esc(patientName(a.patientId))}
        <span class="badge ${isVideo ? 'badge-video' : 'badge-inperson'}">${isVideo ? '🎥 Video' : '🏢 In-person'}</span>
        ${checked ? '<span class="badge badge-paid">Checked in</span>' : ''}</div>
      <div class="row-sub">${esc(a.duration || 50)} min${a.reason ? ' · ' + esc(a.reason) : ''}</div>
    </div>
    <div class="btn-row">
      <button type="button" class="btn btn-sm ${checked ? '' : 'btn-primary'}" onclick="toggleCheckIn('${a.id}')">${checked ? 'Undo check-in' : 'Check in'}</button>
      <button type="button" class="btn btn-sm" onclick="openApptModal(null,'${a.id}')">Edit</button>
    </div>
  </div>`;
}

/* Small original icon set — plain inline SVG, no icon-font/library dependency. */
const ICONS = {
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8 3v4M16 3v4"/></svg>',
  fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.8 14.3c2.1.6 3.5 2.7 3.7 5.7"/></svg>',
  dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5v19"/><path d="M8 6.8c0-1.6 1.8-2.8 4-2.8s4 1.2 4 2.6c0 3.4-8 1.6-8 5 0 1.5 1.8 2.7 4 2.7s4-1.1 4-2.6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  lightning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  plusUser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M18 8v6M15 11h6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V11M10 20V4M16 20v-7M4 20h16"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.3" width="6" height="3" rx="1"/><path d="M9 11h6M9 15h4"/></svg>',
  calendarPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M12 13v6M9 16h6"/></svg>'
};

function statTile(icon, tint, num, label, sub) {
  return `<div class="stat-card stat-tile">
    <div class="stat-tile-ico ${tint}">${icon}</div>
    <div><div class="stat-num">${esc(num)}</div><div class="stat-label">${esc(label)}</div>${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}</div>
  </div>`;
}
function attnRow(icon, title, sub, onclick) {
  return `<button type="button" class="attn-row-v2" onclick="${onclick}">
    <span class="attn-ico">${icon}</span>
    <span style="flex:1;min-width:0">
      <span class="attn-title" style="display:block">${esc(title)}</span>
      <span class="attn-sub">${esc(sub)}</span>
    </span>
    <span class="attn-chevron" aria-hidden="true">${ICONS.chevronRight}</span>
  </button>`;
}
function qaGrid(actions) {
  return `<div class="qa-grid">${actions.map(a =>
    `<button type="button" class="qa-btn ${a.primary ? 'qa-primary' : ''}" onclick="${a.onclick}">
      <span class="qa-ico">${a.icon}</span>${esc(a.label)}
    </button>`).join('')}</div>`;
}
function dashScheduleRow(a) {
  const isVideo = a.type !== 'in-person';
  const name = patientName(a.patientId);
  return `<tr>
    <td data-label="Time"><b>${fmtTime(a.time)}</b></td>
    <td data-label="Client"><div class="sched-client-cell"><span class="mini-avatar">${esc(initials(name))}</span>${esc(name)}</div></td>
    <td data-label="Type">${esc(a.reason || 'Session')}</td>
    <td data-label="Location">${isVideo ? '🎥 Virtual' : '<span class="loc-ico">📍</span>In-person'}</td>
    <td data-label="Status">${a.checkedIn ? '<span class="badge badge-paid">Checked in</span>' : '<span class="text-muted">—</span>'}</td>
    <td data-label="">${isVideo && a.link
      ? `<button type="button" class="btn btn-sm btn-primary" onclick="joinVideo('${a.id}')">🎥 Join</button>`
      : `<button type="button" class="btn btn-sm" onclick="openPatientDetail('${a.patientId}')">View Client</button>`}</td>
  </tr>`;
}
function dashScheduleTable(rows) {
  if (!rows.length) return '<div class="empty">No sessions today.</div>';
  return `<div class="sched-table-wrap"><table class="sched-table">
    <thead><tr><th>Time</th><th>Client</th><th>Type</th><th>Location</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map(dashScheduleRow).join('')}</tbody>
  </table></div>`;
}
// Real, computed from actual appointment data — not a fabricated forecast.
function upcomingWeekRows() {
  const base = new Date(); base.setHours(0, 0, 0, 0);
  let html = '';
  for (let i = 1; i <= 4; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    const iso = isoDate(d);
    const count = db.appointments.filter(a => a.date === iso).length;
    html += `<div class="week-row"><span class="week-day">${esc(d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))}</span>
      <span class="week-count"><span class="count-chip">${count}</span></span></div>`;
  }
  return html;
}

function therapistDashboardHtml() {
  const t = todayIso();
  const today = db.appointments.filter(a => a.date === t).sort((x, y) => x.time.localeCompare(y.time));
  const videoCount = today.filter(a => a.type !== 'in-person').length;
  const pending = pendingNoteAppointments();
  const followUps = followUpClients();
  const newReqs = (db.appointmentRequests || []).filter(r => r.status === 'new');

  const attention = newReqs.map(r =>
    attnRow(ICONS.calendarPlus, `Booking request — ${r.name}`,
      `${fmtDate(r.preferredDate)} ${fmtTime(r.preferredTime)} · ${r.service || 'General'}`,
      "showView('requests')"))
    .concat(pending.map(({ appt, patient }) =>
      attnRow(ICONS.fileText, `Clinical note pending — ${patient.name}`, `Session on ${fmtDate(appt.date)}`,
        `openPatientDetail('${patient.id}');openRecordModal()`)))
    .concat(followUps.map(p =>
      attnRow(ICONS.users, `Follow-up due — ${p.name}`, `${FOLLOW_UP_DAYS}+ days since their last visit`,
        `openApptModal('${p.id}')`)));

  return `
    <div class="stat-grid dash-block">
      ${statTile(ICONS.calendar, 'tint-navy', today.length, "Today's Sessions", today.length ? `${videoCount} virtual, ${today.length - videoCount} in-person` : '')}
      ${statTile(ICONS.fileText, 'tint-gold', pending.length, 'Pending Notes', 'Needs your attention')}
      ${statTile(ICONS.users, 'tint-peach', followUps.length, 'Follow-ups', followUps.length ? `${FOLLOW_UP_DAYS}+ days since last visit` : 'All caught up')}
      ${statTile(ICONS.clipboard, 'tint-navy', newReqs.length, 'New Requests', newReqs.length ? 'From website' : 'None waiting')}
    </div>

    <div class="two-col">
      <div>
        <div class="card">
          <div class="card-bar-head"><h2>${ICONS.calendar} Today's Schedule</h2>
            <a href="#" class="link-white" onclick="showView('schedule');return false">View full schedule ${ICONS.chevronRight}</a></div>
          ${dashScheduleTable(today)}
        </div>
        <div class="card">
          <h2>Quick Actions</h2>
          ${qaGrid([
    { icon: ICONS.clipboard, label: 'New Clinical Note', primary: true, onclick: "showView('patients');toast('Select a client to add a clinical note')" },
    { icon: ICONS.plusUser, label: 'Add Patient', onclick: 'openPatientModal()' },
    { icon: ICONS.calendarPlus, label: 'Schedule Appointment', onclick: 'openApptModal()' },
    { icon: ICONS.users, label: 'Patient List', onclick: "showView('patients')" }
  ])}
        </div>
      </div>
      <div>
        <div class="card">
          <h2>Needs Your Attention${attention.length ? ` <span class="badge badge-partial">${attention.length}</span>` : ''}</h2>
          ${attention.length ? attention.join('') : '<div class="attn-empty">✓ Nothing needs your attention right now.</div>'}
        </div>
        <div class="card">
          <div class="row-between"><h2 style="margin:0">Upcoming This Week</h2>
            <a href="#" onclick="showView('schedule');setScheduleMode('week');return false" style="font-size:12.5px;font-weight:700">View calendar</a></div>
          ${upcomingWeekRows()}
        </div>
      </div>
    </div>`;
}

function staffDashboardHtml() {
  const t = todayIso();
  const today = db.appointments.filter(a => a.date === t).sort((x, y) => x.time.localeCompare(y.time));
  const checkedIn = today.filter(a => a.checkedIn).length;
  const due = db.invoices.reduce((s, i) => s + Math.max(0, Number(i.amount) - paidAmount(i)), 0);
  const unpaid = db.invoices.filter(i => invoiceStatus(i) !== 'paid').sort((x, y) => x.date.localeCompare(y.date));
  const newReqs = (db.appointmentRequests || []).filter(r => r.status === 'new');

  const attention = newReqs.map(r =>
    attnRow(ICONS.calendarPlus, `Booking request — ${r.name}`,
      `${fmtDate(r.preferredDate)} ${fmtTime(r.preferredTime)} · ${r.service || 'General'}`,
      "showView('requests')"))
    .concat(unpaid.map(inv =>
      attnRow(ICONS.dollar, `Payment due — ${patientName(inv.patientId)}`,
        `${money(Number(inv.amount) - paidAmount(inv))} · ${esc(inv.description)}`,
        `openPaymentModal('${inv.id}')`)));

  return `
    <div class="stat-grid dash-block">
      ${statTile(ICONS.calendar, 'tint-navy', today.length, "Today's Appointments", '')}
      ${statTile(ICONS.users, 'tint-gold', `${checkedIn}/${today.length}`, 'Checked In', '')}
      ${statTile(ICONS.dollar, 'tint-peach', money(due), 'Payments Due', '')}
      ${statTile(ICONS.clipboard, 'tint-navy', newReqs.length, 'New Requests', newReqs.length ? 'From website' : 'None waiting')}
    </div>

    <div class="two-col">
      <div>
        <div class="card">
          <div class="card-bar-head"><h2>${ICONS.calendar} Today's Appointments</h2>
            <a href="#" class="link-white" onclick="showView('schedule');return false">View full schedule ${ICONS.chevronRight}</a></div>
          ${today.length ? today.map(dashStaffApptRow).join('') : '<div class="empty">No appointments today.</div>'}
        </div>
        <div class="card">
          <h2>Quick Actions</h2>
          ${qaGrid([
    { icon: ICONS.calendarPlus, label: 'New Appointment', primary: true, onclick: 'openApptModal()' },
    { icon: ICONS.clipboard, label: 'Review Requests', onclick: "showView('requests')" },
    { icon: ICONS.plusUser, label: 'Add Patient', onclick: 'openPatientModal()' },
    { icon: ICONS.dollar, label: 'View Billing', onclick: "showView('billing')" }
  ])}
        </div>
      </div>
      <div>
        <div class="card">
          <h2>Pending Tasks${attention.length ? ` <span class="badge badge-partial">${attention.length}</span>` : ''}</h2>
          ${attention.length ? attention.join('') : '<div class="attn-empty">✓ No pending tasks.</div>'}
        </div>
        <div class="card">
          <div class="row-between"><h2 style="margin:0">Upcoming This Week</h2>
            <a href="#" onclick="showView('schedule');setScheduleMode('week');return false" style="font-size:12.5px;font-weight:700">View calendar</a></div>
          ${upcomingWeekRows()}
        </div>
      </div>
    </div>`;
}

function renderDashboard() {
  const now = new Date();
  const mainEl = document.getElementById('dash-date-main');
  const subEl = document.getElementById('dash-date-sub');
  if (mainEl) mainEl.textContent = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  if (subEl) subEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });

  const u = currentUser();
  const greetEl = document.getElementById('dash-greeting');
  const content = document.getElementById('dash-content');
  if (!u || u.role === 'patient') {
    // Before login, or for patient logins (their dashboard is the Portal view) — nothing to build here.
    if (greetEl) greetEl.textContent = 'Dashboard';
    if (content) content.innerHTML = '';
    return;
  }
  greetEl.textContent = `${greeting()}, ${u.name}`;

  // Always render the real dashboard shell (empty widgets are fine). Sample data is an
  // optional banner — never a gate that hides the UI until clicked.
  const empty = !db.patients.length && !db.appointments.length;
  const tip = empty ? `<div class="dash-empty-tip card">
      <div>
        <strong>Your practice is empty</strong>
        <p class="muted small" style="margin:4px 0 0">Add a patient, or load sample data to explore the dashboard with example sessions.</p>
      </div>
      <div class="btn-row">
        ${qa('+ Add patient', 'openPatientModal()', true)}
        ${qa('Load sample data', 'loadSampleData()')}
      </div>
    </div>` : '';

  content.innerHTML = tip + (u.role === 'practitioner' ? therapistDashboardHtml() : staffDashboardHtml());
}

/* ============ Public website + appointment requests ============ */
function togglePubNav() {
  const nav = document.getElementById('pub-nav');
  const btn = document.querySelector('.pub-nav-toggle');
  const open = nav.classList.toggle('show');
  btn?.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closePubNav() {
  document.getElementById('pub-nav')?.classList.remove('show');
  document.querySelector('.pub-nav-toggle')?.setAttribute('aria-expanded', 'false');
}
function scrollToBooking() {
  closePubNav();
  document.getElementById('pub-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function prefillService(name) {
  const el = document.getElementById('book-service');
  if (el) {
    const match = [...el.options].find(o => o.textContent === name || o.innerHTML === name);
    if (match) el.value = match.value;
  }
  scrollToBooking();
}
function prefillType(type) {
  const el = document.getElementById('book-type');
  if (el) el.value = type;
  scrollToBooking();
}

function renderPublicSite() {
  const year = document.getElementById('pub-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const list = document.getElementById('pub-therapist-list');
  if (!list) return;
  const practitioners = (db.users || []).filter(u => u.role === 'practitioner');
  if (!practitioners.length) {
    list.innerHTML = `<article class="pub-therapist">
      <div class="avatar-lg">MC</div>
      <h3>MindCare Practitioner</h3>
      <div class="title">Clinical therapist</div>
      <div class="specs">Directory fills in once a practitioner account is set up.</div>
      <button type="button" class="btn btn-sm" onclick="scrollToBooking()">Request appointment</button>
    </article>`;
    return;
  }
  list.innerHTML = practitioners.map(u => `<article class="pub-therapist">
    <div class="avatar-lg">${esc(initials(u.name))}</div>
    <h3>${esc(u.name)}</h3>
    <div class="title">Clinical therapist</div>
    <div class="specs">Anxiety · Mood · Life transitions</div>
    <button type="button" class="btn btn-sm" onclick="scrollToBooking()">Request appointment</button>
  </article>`).join('');

  // Prefer tomorrow as default preferred date when empty
  const dateInput = document.querySelector('#booking-form [name="preferredDate"]');
  if (dateInput && !dateInput.value) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    dateInput.value = isoDate(d);
    dateInput.min = todayIso();
  }
}

function submitBookingRequest(e) {
  e.preventDefault();
  const err = document.getElementById('book-error');
  if (err) err.textContent = '';
  const f = new FormData(e.target);
  const name = (f.get('name') || '').trim();
  const email = (f.get('email') || '').trim();
  if (!name || !email) {
    if (err) err.textContent = 'Name and email are required.';
    return;
  }
  const req = {
    id: uid(),
    createdAt: new Date().toISOString(),
    name,
    email,
    phone: (f.get('phone') || '').trim(),
    payerType: f.get('payerType') || 'self-pay',
    preferredDate: f.get('preferredDate'),
    preferredTime: f.get('preferredTime'),
    service: f.get('service'),
    sessionType: f.get('sessionType') || 'video',
    notes: (f.get('notes') || '').trim(),
    status: 'new', // new | confirmed | declined
    patientId: null,
    appointmentId: null
  };
  db.appointmentRequests = db.appointmentRequests || [];
  db.appointmentRequests.unshift(req);
  save(); // renderAll() is page-guarded, so this is safe to call from index.html too

  const panel = document.getElementById('booking-panel');
  if (panel) {
    panel.innerHTML = `<div class="pub-book-success">
      <div class="ok-ico">✓</div>
      <h3>Request received</h3>
      <p class="muted">Thanks, ${esc(name)}. Our team will review your preferred time
        (${esc(fmtDate(req.preferredDate))} at ${esc(fmtTime(req.preferredTime))}) and follow up.
        This is not a confirmed appointment yet.</p>
      <button type="button" class="btn" onclick="resetBookingForm()">Submit another request</button>
    </div>`;
  }
  toast('Appointment request submitted');
}

function resetBookingForm() {
  const panel = document.getElementById('booking-panel');
  if (!panel) return;
  panel.innerHTML = `
    <h3>Request an appointment</h3>
    <p class="muted small">This saves a request on this device for the clinic team to review. It does <b>not</b> confirm a slot until staff accepts it.</p>
    <form id="booking-form" onsubmit="submitBookingRequest(event)">
      <div class="form-row">
        <label>Full name<input class="input" name="name" required autocomplete="name"></label>
        <label>Email<input class="input" type="email" name="email" required autocomplete="email"></label>
      </div>
      <div class="form-row">
        <label>Phone<input class="input" name="phone" autocomplete="tel"></label>
        <label>Payer type
          <select class="input" name="payerType" required>
            <option value="self-pay">Self-pay</option>
            <option value="insurance">Insurance</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>Preferred date<input class="input" type="date" name="preferredDate" required></label>
        <label>Preferred time<input class="input" type="time" name="preferredTime" required></label>
      </div>
      <div class="form-row">
        <label>Focus area
          <select class="input" name="service" id="book-service">
            <option>Anxiety &amp; Stress</option>
            <option>Depression &amp; Mood</option>
            <option>Relationships</option>
            <option>Trauma &amp; Recovery</option>
            <option>Life Transitions</option>
            <option>Personal Growth</option>
            <option>General / Not sure yet</option>
          </select>
        </label>
        <label>Session type
          <select class="input" name="sessionType" id="book-type">
            <option value="video">Virtual</option>
            <option value="in-person">In-person</option>
          </select>
        </label>
      </div>
      <div class="form-row">
        <label>Anything we should know?<textarea class="input" name="notes" rows="3" placeholder="Optional"></textarea></label>
      </div>
      <div class="auth-error" id="book-error"></div>
      <button class="btn btn-primary" type="submit">Submit request</button>
    </form>`;
  renderPublicSite();
}

function setRequestFilter(f, btn) {
  requestFilter = f;
  document.querySelectorAll('#request-filters .chip').forEach(c => c.classList.toggle('active', c === btn));
  renderRequests();
}

function renderRequests() {
  const list = document.getElementById('request-list');
  const stats = document.getElementById('requests-stats');
  if (!list) return;
  if (!requireStaffAccess()) {
    list.innerHTML = '<div class="empty">Staff access required.</div>';
    return;
  }
  const all = db.appointmentRequests || [];
  const neu = all.filter(r => r.status === 'new').length;
  const conf = all.filter(r => r.status === 'confirmed').length;
  const dec = all.filter(r => r.status === 'declined').length;
  if (stats) {
    stats.innerHTML = `
      ${statTile(ICONS.clipboard, 'tint-gold', neu, 'New requests', 'Awaiting review')}
      ${statTile(ICONS.calendar, 'tint-navy', conf, 'Confirmed', 'Became appointments')}
      ${statTile(ICONS.users, 'tint-peach', dec, 'Declined', '')}`;
  }
  const rows = all.filter(r => requestFilter === 'all' ? true : r.status === requestFilter);
  if (!rows.length) {
    list.innerHTML = `<div class="empty">${requestFilter === 'new' ? 'No new booking requests.' : 'No requests in this filter.'}</div>`;
    return;
  }
  list.innerHTML = rows.map(r => {
    const statusBadge = r.status === 'new' ? 'badge-partial' : r.status === 'confirmed' ? 'badge-paid' : 'badge-unpaid';
    return `<div class="row">
      <div class="row-main">
        <div class="row-title">${esc(r.name)} <span class="badge ${statusBadge}">${esc(r.status)}</span>
          <span class="badge ${r.sessionType === 'in-person' ? 'badge-inperson' : 'badge-video'}">${r.sessionType === 'in-person' ? 'In-person' : 'Virtual'}</span></div>
        <div class="row-sub">${esc(fmtDate(r.preferredDate))} · ${esc(fmtTime(r.preferredTime))} · ${esc(r.service || '')}
          · ${esc(r.payerType)} · ${esc(r.email)}${r.phone ? ' · ' + esc(r.phone) : ''}</div>
        ${r.notes ? `<div class="row-sub">${esc(r.notes)}</div>` : ''}
      </div>
      <div class="btn-row">
        ${r.status === 'new' ? `
          <button type="button" class="btn btn-sm btn-primary" onclick="confirmBookingRequest('${r.id}')">Confirm</button>
          <button type="button" class="btn btn-sm" onclick="declineBookingRequest('${r.id}')">Decline</button>` : ''}
        ${r.patientId ? `<button type="button" class="btn btn-sm" onclick="openPatientDetail('${r.patientId}')">View client</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function findOrCreatePatientFromRequest(r) {
  const email = (r.email || '').toLowerCase();
  let p = db.patients.find(x => (x.email || '').toLowerCase() === email && email);
  if (!p) {
    p = db.patients.find(x => x.name.toLowerCase() === r.name.toLowerCase() && (!email || !(x.email)));
  }
  if (!p) {
    p = {
      id: uid(),
      name: r.name,
      email: r.email || '',
      phone: r.phone || '',
      dob: '',
      insurance: r.payerType === 'insurance' ? 'Insurance (from booking request)' : (r.payerType === 'self-pay' ? 'Self-pay' : ''),
      emergency: '',
      notes: r.notes ? `Booking request note: ${r.notes}` : '',
      records: [],
      created: todayIso(),
      payerType: r.payerType
    };
    db.patients.push(p);
  } else {
    if (!p.email && r.email) p.email = r.email;
    if (!p.phone && r.phone) p.phone = r.phone;
    if (!p.payerType) p.payerType = r.payerType;
  }
  return p;
}

function confirmBookingRequest(id) {
  if (!requireStaffAccess()) return;
  const r = (db.appointmentRequests || []).find(x => x.id === id);
  if (!r || r.status !== 'new') return;
  const patient = findOrCreatePatientFromRequest(r);
  const appt = {
    id: uid(),
    patientId: patient.id,
    date: r.preferredDate,
    time: r.preferredTime,
    duration: 50,
    type: r.sessionType === 'in-person' ? 'in-person' : 'video',
    reason: r.service || 'Intake',
    location: r.sessionType === 'in-person' ? 'Clinic' : '',
    link: r.sessionType === 'in-person' ? '' : (db.settings?.zoomLink || ''),
    checkedIn: false,
    fromRequestId: r.id
  };
  db.appointments.push(appt);
  r.status = 'confirmed';
  r.patientId = patient.id;
  r.appointmentId = appt.id;
  save();
  toast(`Confirmed — ${patient.name} booked ${fmtDate(appt.date)}`);
}

function declineBookingRequest(id) {
  if (!requireStaffAccess()) return;
  const r = (db.appointmentRequests || []).find(x => x.id === id);
  if (!r || r.status !== 'new') return;
  if (!confirm(`Decline request from ${r.name}?`)) return;
  r.status = 'declined';
  save();
  toast('Request declined');
}

/* ============ Render everything ============ */
function renderAll() {
  // dashboard.html and index.html share this file but only one of these root
  // elements exists per page — guard so save() is safe to call from either.
  // Also gated on currentUser(): #app-shell exists in the DOM (just CSS-hidden)
  // before login, so without this check patient data would render into a
  // hidden-but-inspectable DOM subtree before authentication completes.
  if (document.getElementById('app-shell') && currentUser()) {
    renderDashboard();
    renderPatients();
    renderSchedule();
    renderRequests();
    renderVideo();
    renderBilling();
    renderReportSelect();
    renderUsers();
    renderPortal();
    applyRoleUI();
    renderNotifBadge();
  }
  if (document.getElementById('public-site') && !currentUser()) renderPublicSite();
}

renderAll();
renderAuth();
