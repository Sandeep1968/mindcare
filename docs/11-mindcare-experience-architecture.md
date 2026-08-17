# MindCare — Experience Architecture

**Status:** In progress — first build pass started (public website, brand lock, appointment requests). Documentation remains the source of truth for sequencing; this file is updated only when architecture decisions change.
**Scope:** Defines MindCare as one connected product across four experiences (Public Website, Therapist/Doctor Dashboard, Core Team Dashboard, Patient Dashboard), how they connect, and a KEEP/ENHANCE/ADD/REFACTOR plan grounded in the actual current codebase.
**Product name:** MindCare. Not renamed, not a new project, not a new repository.
**Relationship to earlier docs:** `01-product-blueprint.md`, `02-information-architecture.md`, and `05-wireframes.md` were written under the working name "CareNexa" but describe the same target product MindCare is now converging toward. `10-mindcare-current-vs-target-audit.md` already established this bridge by comparing MindCare's real code against those target documents. This document extends that audit into a concrete four-experience map. No file is renamed and no content in 01/02/05/10 is altered by this document.
**Visual references (this pass):**
| Asset | Path | Role |
|---|---|---|
| Brand mark + wordmark | `docs/references/mindcare-logo.png` | Canonical logo, tagline, blue/gold palette lock |
| Therapist workspace | `docs/references/mindcare-therapist-dashboard.png` | Target Therapist/Doctor Dashboard density + nav shape |
| Public clinic site | `docs/references/mindcare-public-website.png` | Target Public Website IA + tone (⚪ ADD) |

---

## 1. What changed immediately before this document

The previous task (role-aware dashboard enhancement) was implemented and is now part of MindCare's current baseline:

- `app.js`: `renderDashboard()` now branches by role — a Therapist/Practitioner view (Today's Sessions / Notes Pending / Follow-ups stats, Today's Schedule, Needs Attention, Quick Actions) and a Staff view (Today's Appointments / Checked In / Payments Due stats, Today's Appointments with a new `checkedIn` toggle, Pending Tasks, Quick Actions). `renderPortal()` now leads with a "Next Appointment" hero card and three honest quick actions (Book Appointment and Message Clinic show a toast pointing to the clinic since neither is real yet; View Billing scrolls to the real billing section).
- `styles.css`: repainted via the existing CSS custom properties (values changed, names kept) to a warm terracotta/ivory/sage palette, plus new dashboard component classes (`.hero-appt`, `.row-attn`, `.badge-role-*`) and accessibility additions (focus-visible ring, skip-link).
- `index.html`: Dashboard view simplified to a single JS-driven container; added a skip link and `role`/`aria-*` attributes on the modal and toast.
- Nothing else changed. Auth, Patients, Schedule, Clinical Entries, Video, Billing, Reports, and Backup are untouched.

**This matters for what follows:** the new instructions in this task call for a **different color direction** (warm yellow/gold + calm blue/navy, no purple, green not primary) than what was just implemented (terracotta + sage). Per the explicit instruction to document first and wait for approval before large UI changes, **the palette has not been touched again in this pass** — §8 below specifies the target direction and flags the repaint as pending work for the next approved pass, not something silently redone now.

---

## 2. MindCare as one ecosystem

```text
                              MINDCARE
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       PUBLIC WEBSITE      STAFF WORKSPACE      PATIENT PORTAL
     (not logged in)      (logged in: role-gated)  (logged in: patient)
              │                  │                  │
              │          ┌───────┴───────┐          │
              │          │               │          │
              │    Therapist/Doctor  Core Team       │
              │      Dashboard      Dashboard        │
              │          │               │           │
              └────────► Appointment Request ◄───────┘
                         (bridges public → staff)
```

All four experiences read and write the **same underlying data** (patients, appointments, invoices) — there is no separate mock system per experience. Where an experience needs data that doesn't exist yet (appointment *requests* as distinct from confirmed appointments, leads/inquiries, forms, messages), that is called out explicitly as new, additive data model work — not simulated with disconnected mock screens, per the explicit instruction against disconnected mocks.

---

## 3. Current baseline, per experience (KEEP / ENHANCE / ADD / REFACTOR)

Status legend matches `10-mindcare-current-vs-target-audit.md`: 🟢 KEEP · 🟡 ENHANCE · 🟠 REFACTOR · 🔴 REBUILD · ⚪ ADD (new, additive — the audit's "MISSING" category, renamed here to match this task's requested vocabulary).

### 3.1 Public Clinic Website — ⚪ ADD (0% exists)

Nothing in the current codebase serves an unauthenticated visitor. `index.html` goes straight to the login/setup screen for anyone who opens the app. There is no marketing content, no service list, no therapist directory, no public booking form.

**Target IA (from `docs/references/mindcare-public-website.png`):** one marketing surface with header (logo + Services / Therapists / About / FAQs / Contact + Patient Login + Book an Appointment), hero, four trust/value strips, six service cards, therapist directory preview, four-step "starting therapy" process, care-delivery pair (In-person / Virtual), FAQ accordion, final CTA band, and a dark footer (Explore / Patients / Contact / Legal). Content is static except where Book / Patient Login / therapist profiles touch real data.

| Piece | Status | Note |
|---|---|---|
| Home / About / Services / FAQ / Contact | ⚪ ADD | Static content matching the public-site reference; no data model needed |
| Therapist Directory / Profile | ⚪ ADD | Can read from the *existing* practitioner user record (name) once multi-therapist exists (see §9); today there is exactly one practitioner, so a "directory" of one is a reasonable first step — mockup shows three cards as the *target density*, not a claim that three therapists exist in code today |
| Book Appointment (new patient) | ⚪ ADD | Needs a new **Appointment Request** entity (§9) — must not write directly into `db.appointments` as a confirmed slot, since nothing has reviewed it yet. Primary CTA throughout the reference ("Book an Appointment") maps here |
| Book Appointment (existing patient) / Patient Login | ⚪ ADD | Needs patient-facing identity verification distinct from the staff-only login system that exists today; header "Patient Login" should route into the existing Patient Portal after auth, not invent a second portal |
| Payer type at booking | ⚪ ADD | Additive field, same one flagged in the audit's Quick Wins |
| Tagline | 🟡 ENHANCE (copy lock) | Logo lock is **"Compassion. Clarity. Care."** (`mindcare-logo.png`). The public-site mockup currently shows "Compassionate. Professional. Personal." — treat the **logo** as canonical; update marketing copy to match when the site is built |

### 3.2 Therapist / Doctor Dashboard — 🟢 KEEP core, 🟡 ENHANCE toward full target list

**Target density (from `docs/references/mindcare-therapist-dashboard.png`):** greeting + date, five stat cards (Today's Sessions / Pending Notes / Follow-ups / Treatment Reviews / Unread Messages), Today's Schedule table, Needs Your Attention list, Upcoming This Week, Quick Actions grid, Recent Messages. Sidebar nav matches the target IA in §5. This mockup is the **visual and density target**, not a license to invent data for empty modules.

| Piece | Status | Note |
|---|---|---|
| Today's appointments / Today's Schedule | 🟢 KEEP | Implemented this session — real data, no change needed; mockup's Join Session / View Client actions already map to existing video launcher + Patient Detail |
| Upcoming appointments / Upcoming This Week | 🟡 ENHANCE | Today's Schedule is real; a distinct "Upcoming (this week)" widget is now justified by the reference — small, honest aggregation over existing `db.appointments`, not a second Schedule module |
| Pending clinical notes | 🟢 KEEP | Implemented this session via an honest heuristic (appointment with no same-day clinical entry) — documented in code as a heuristic, not a real "signed/unsigned" workflow |
| Treatment plan reviews | ⚪ ADD | No Treatment Plan entity exists (audit §4, §13) — **do not ship the mockup's "Treatment Reviews" stat as a real count until that data model exists**; omit the card or show an honest empty/unavailable state |
| Assessments due | ⚪ ADD | No Assessment entity exists — same reasoning; mockup's "1 assessment due (PHQ-9)" attention row stays out until assessments exist |
| Follow-ups | 🟢 KEEP | Implemented this session via an honest heuristic (14+ days since last visit, nothing booked since) |
| Messages requiring response / Recent Messages | ⚪ ADD | No messaging system exists — **do not fabricate unread counts or message snippets** from the mockup; omit until `messages[]` (§9) exists |
| Quick actions | 🟢 KEEP | New Clinical Note / View Schedule / Add Client / View Clients, implemented this session; mockup adds Send Message / View Reports — Reports can link to existing Health Reports; Send Message waits on messaging |
| Dashboard → Client 360 flow | 🟡 ENHANCE | Today: Dashboard → "View Client" opens the existing Patient Detail page (demographics, clinical history, appointments, billing summary) — functionally a Client 360, not yet organized into the tabbed Overview/Appointments/Clinical/Assessments/Treatment Plans/Forms/Documents/Messages/Billing structure `02-information-architecture.md` specifies. Restructuring into tabs is a natural next step once more of those tabs have real content. |

### 3.3 Core Team Dashboard — 🟡 ENHANCE core, ⚪ ADD the rest

Today, "Staff" is one role that bundles reception + billing + scheduling + video, and the dashboard branch built this session covers the operationally-real slice of what a front-desk/billing user needs.

| Piece | Status | Note |
|---|---|---|
| Today's appointments | 🟢 KEEP | Implemented this session |
| Check-ins | 🟢 KEEP | Implemented this session — a new, small, additive `checkedIn` boolean on the appointment object, with a toggle button on the dashboard |
| Payment/billing tasks | 🟢 KEEP | Implemented this session (unpaid invoices as "Pending Tasks", with a direct "Record payment" action) |
| New online booking requests | ⚪ ADD | Depends on the Public Website's booking flow existing first (§9) — cannot be shown honestly before requests can be created |
| New patient inquiries | ⚪ ADD | Depends on a Leads/Inquiries entity, same dependency |
| Patient registration (from a request) | 🟡 ENHANCE | The underlying action — creating a patient record — already exists (`openPatientModal`); what's missing is the *request-to-registration* bridge |
| Reschedule / cancellation requests | ⚪ ADD | Today, staff directly edit or delete an appointment (`openApptModal`, `deleteAppt`) — there is no concept of a patient-initiated *request* distinct from a staff-made change. Building this without the patient-facing request flow first would be a fake queue with nothing feeding it. |
| Pending forms | ⚪ ADD | No forms module exists |
| Operational messages | ⚪ ADD | No messaging module exists |
| Role separation (Reception vs. Billing) | 🟠 REFACTOR | Still one "Staff" role bundling both — reasonable to keep bundled until there's enough distinct functionality (forms triage vs. payment collection) to justify splitting, per the audit's sequencing |

### 3.4 Patient Dashboard / Portal — 🟢 KEEP core, ⚪ ADD self-service

| Piece | Status | Note |
|---|---|---|
| Next appointment (hero) | 🟢 KEEP | Implemented this session |
| Join virtual session | 🟢 KEEP | Reuses the existing Zoom/Jitsi launcher — already solid (audit §2) |
| View billing / payment info | 🟢 KEEP | Implemented this session (existing billing summary, now reachable via a Quick Action) |
| Book appointment | ⚪ ADD | Currently an honest "coming soon" toast, not a fake button — real self-service booking depends on the same Appointment Request entity as the Public Website (§9), and should reuse it rather than build a second booking mechanism |
| Reschedule / cancel | ⚪ ADD | Same dependency — should be modeled as a request a patient submits, not a direct edit to a confirmed appointment, so Core Team retains the review step described in §9 of the task instructions |
| Complete forms | ⚪ ADD | No forms module exists |
| View permitted documents | ⚪ ADD | No documents module exists |
| Message clinic | ⚪ ADD | Currently an honest "coming soon" toast — depends on the messaging module |
| Manage profile | 🟠 REFACTOR | Patients don't edit their own demographics today — only staff do, via `openPatientModal`. A patient-facing profile-edit view would need its own, narrower form (e.g., contact info only, not clinical fields) |

---

## 4. Cross-experience connection flow

The task's example flow, mapped onto concrete MindCare pieces (target state — most of this is ⚪ ADD per §3):

```text
PUBLIC WEBSITE                              (⚪ ADD, §3.1)
   │  visitor picks service/therapist/date/time, enters basic info + payer type
   ▼
NEW or EXISTING PATIENT                     (⚪ ADD — identity check before submitting)
   │
   ▼
APPOINTMENT REQUEST                          (⚪ ADD data entity, §9 — NOT a confirmed appointment yet)
   │
   ▼
CORE TEAM DASHBOARD → "New requests"         (⚪ ADD widget, §3.3)
   │  staff reviews, confirms or proposes a new time
   ▼
CONFIRMED APPOINTMENT                        (🟢 already exists — db.appointments)
   │  now visible on...
   ▼
THERAPIST SCHEDULE → THERAPIST DASHBOARD     (🟢 already exists, ENHANCED this session)
   │  session happens, note gets written
   ▼
PATIENT DASHBOARD                            (🟢 already exists, ENHANCED this session)
   │  sees the confirmed appointment, joins if virtual, later completes any assigned forms
```

The middle of this chain (Confirmed Appointment → Therapist Schedule → Therapist Dashboard → Patient Dashboard) **already works today** — that's exactly what the dashboard work in this session strengthened. The two ends (Public Website → Appointment Request, and Appointment Request → Core Team review queue) are the genuinely new pieces, and they share one new entity (§9) rather than each experience inventing its own booking mechanism.

---

## 5. Navigation implications (not implemented yet)

The reference direction shared for this task — and confirmed by `docs/references/mindcare-therapist-dashboard.png` — a sidebar with Dashboard, Schedule, Appointments, Clients, a Clinical Care group (Clinical Notes, Assessments, Treatment Plans, Forms & Documents), Communication, Billing, Reports, Settings — is **the same navigation structure already specified** in `02-information-architecture.md` §3–§4 for the broader target product. That document's reasoning still applies here and doesn't need to be re-derived: it explains why Clinical Care is a worklist/library rather than a duplicate editor, why Communication is one inbox rather than per-module message threads, and so on.

MindCare's current sidebar (Dashboard / Patients / Schedule / Video Visits / Billing & Payments / Health Reports / Data & Backup, plus the Patient's My Visits & Billing) is a **reasonable, honest subset** of that target — it doesn't yet have Clinical Care, Communication, or Appointments-as-distinct-from-Schedule because those modules' underlying content (treatment plans, assessments, messages, appointment requests) doesn't exist yet either. Expanding the sidebar ahead of the modules it would point to was explicitly avoided in the dashboard task (and should stay avoided here) — a nav item that opens an empty or fake module is worse than not having the nav item.

**Mockup → current label mapping (when renaming, not when inventing):** Clients ≡ Patients; Reports ≡ Health Reports; Settings ≡ Data & Backup (until §7 lands). "Appointments" and "Communication" remain gated on §9 entities. The sidebar wellness card in the mockup ("Take care of your mind…") is optional chrome — fine to add with the palette pass, not a product dependency.

**Recommended sequencing for nav growth** (same discipline as the sequencing note in §11): add a sidebar item only in the same change that adds real content behind it. Concretely: "Appointments" (separate from Schedule, to host the request-review queue) and "Communication" are the two most likely next additions, once §9's Appointment Request entity and a minimal message thread exist.

---

## 6. Client 360 — current vs. target shape

Today's Patient Detail page already behaves like a narrow Client 360 (demographics header, clinical history, upcoming visits, billing summary, one-click report). The target shape from `02-information-architecture.md` §8 is an 11-tab structure (Overview, Timeline, Appointments, Clinical Notes, Assessments, Treatment Plan, Forms, Consent, Documents, Messages, Billing). Recommendation: **don't restructure into tabs yet** — with only 2–3 of those 11 concepts having real data today, a tab bar would mostly show empty tabs. Restructure into tabs once Treatment Plans and Assessments (the next planned data-model additions per the audit's §16 sequencing) give the page enough real content to organize.

---

## 7. Settings (cross-cutting — supports Therapist and Core Team, not the Public Website or Patient Portal)

Settings isn't one of the four experiences, but every logged-in experience except the Patient Portal depends on it. Today it exists as a single "Data & Backup" view that blends account/user management with backup/restore and a privacy-notes card. The proposed target structure:

```text
Settings
   ├── Clinic Profile
   ├── User & Permissions
   ├── Preferences
   ├── Integrations
   └── Data & Backup
         ├── Export Backup
         ├── Import / Restore
         ├── Backup Information
         └── Data Reset / Wipe
```

| Piece | Status | Note |
|---|---|---|
| Clinic Profile | ⚪ ADD | Doesn't exist as an editable entity today. The clinic's name is currently a **hardcoded literal string** — `"MindCare Practice"` — inside both `generateReport()` and `printInvoice()` in `app.js`. Making it a real setting (name, address, phone, hours in `db.settings`) is small and additive, and immediately fixes an honesty gap: today's printed reports/superbills claim a clinic name no one configured. |
| User & Permissions | 🟡 ENHANCE | Exists today as the "Users & access" card (add user, reset password, remove user, 3 roles) inside Data & Backup — real and working (audit §2, §10). Moving it under a dedicated Settings section is organizational, not a rebuild. A real permission *matrix* (beyond the current role-gate functions) stays a 🟠 REFACTOR for later, per the audit's sequencing — not needed until roles split further. |
| Preferences | ⚪ ADD | Not yet defined. Recommend scoping narrowly at first — default appointment duration (already defaults to 50 min per-appointment; a clinic-wide default is a one-field addition) and reminder/notification preferences once messaging exists (§9) — rather than an open-ended "preferences" catch-all. |
| Integrations | 🟡 ENHANCE (relocate) / ⚪ ADD (new ones) | The Zoom/Jitsi provider settings **already exist and work** (audit §2) but live under the Video Visits view, not Settings. Recommend keeping video settings where they are (co-located with the feature they configure) rather than moving them, and having Settings > Integrations *link* to that same screen rather than duplicate its storage — one source of truth, reachable from two places. Any future third-party integration (e.g., a calendar sync) would be a genuine ⚪ ADD here. |
| Export Backup | 🟢 KEEP | `exportData()` — solid, atomic, works today |
| Import / Restore | 🟢 KEEP | `importData()` — solid, confirms before replacing, works today |
| Backup Information | ⚪ ADD | Small, honest addition: record `db.settings.lastExportAt`/`lastImportAt` at the moment those actions run, and display it here. Nothing to show until the fields exist — no fabricated "last backup" timestamp in the meantime. |
| Data Reset / Wipe | 🟢 KEEP | `wipeData()` — double-confirmation, already solid (audit §2) |

This reorganization is mostly **moving and renaming a screen that already works**, plus one genuinely new, small entity (Clinic Profile) and one small addition (Backup Information timestamps) — low risk, no data-model conflicts with §9's new entities.

---

## 8. UI direction (documented target, not applied in this pass)

**Brand lock (from `docs/references/mindcare-logo.png`):** warm yellow/gold + calm blue/navy. No purple anywhere. Green is not a brand color (semantic status green only). Professional, therapy-appropriate. Minimal gradients on chrome (icon mark may keep soft gradients); no glassmorphism. Strong contrast.

| Token / role | Locked value (starting hex) | Use |
|---|---|---|
| Brand navy ("Mind") | `#003E7E` | Wordmark half, deep headers, primary text on light surfaces |
| Brand gold ("Care") | `#FFB81C` | Wordmark half, primary CTAs on marketing, accent bars |
| Soft brain yellow | `#FFE68C` | Soft fills, attention/highlight backgrounds (not body text) |
| Mid blue (tagline / support) | `#4279B0` | Secondary text, links, info chips |
| Soft cream (public site) | ~`#F7F1E6` | Public website page ground (from marketing mockup) |
| Deep navy (footer / process band) | ~`#0B2540` | Public footer + "Starting therapy" band; candidate `--sidebar-bg` for staff app |
| App surface | white / light gray | Staff + patient app content area (dashboard mockup) |

**Canonical tagline:** `Compassion. Clarity. Care.` (logo). Public-site mockup copy that differs should be corrected on build.

**CSS property mapping (values only when approved — names unchanged):**

```
--accent      #FFB81C   (warm gold — primary actions / brand mark on dark)
--accent-2    #003E7E   (navy — secondary accent, links, info; or #4279B0 for lighter chrome)
--sidebar-bg  #0B2540   (deep navy — replaces current warm-brown sidebar)
--ok / --warn / --danger   unchanged in role (green/amber/red for status)
```

**Current state:** the previous task in this session repainted MindCare's existing CSS custom properties to a warm terracotta + ivory + sage-green palette (`--accent: #a15c3e`, `--accent-2: #3f6259`). That direction does not contain purple, but it does not match the locked yellow+blue brand above. **The palette has not been repainted again in this pass** — apply the table above in one focused values-only pass after approval.

Status colors (paid/unpaid/partial, confirmed/pending) stay semantically green/amber/red regardless of brand palette — usability convention, not branding.

The four experiences share **one brand system**, differentiated by content density and tone (marketing calm vs. clinical density), not separate accent schemes per experience.

### 8A. Reference → experience mapping (honesty rules)

| Reference | Experience | Build rule |
|---|---|---|
| `mindcare-logo.png` | All four | Use as the logo asset; split-color Mind/Care wordmark; tagline under mark where space allows |
| `mindcare-public-website.png` | Public Website (⚪ ADD) | Implement section IA from §3.1; CTAs feed Appointment Request (§9), not direct `db.appointments`; Patient Login → existing portal auth |
| `mindcare-therapist-dashboard.png` | Therapist/Doctor Dashboard | Match layout density gradually; **only widgets backed by real data** (Today's Sessions, Pending Notes, Follow-ups, Schedule, Quick Actions that already work). Hide or defer Treatment Reviews / Unread Messages / Recent Messages / assessment attention rows until §9 entities exist |
| *(none yet)* | Core Team Dashboard | Keep the staff branch built this session; no marketing mockup overrides it |
| *(none yet)* | Patient Portal | Keep the portal hero + honest toasts; no fake booking UI from the public-site CTA set |

---

## 9. Data model implications (for approval before building)

New entities needed to support the ⚪ ADD items above, sized to stay additive to the existing `db` shape (`{patients, appointments, invoices, users, settings}}`) rather than a rewrite:

| New entity | Purpose | Feeds |
|---|---|---|
| `appointmentRequests[]` | A visitor's or patient's booking submission, before staff review — separate from `appointments[]` so a request can be declined/rescheduled without ever having been a real confirmed slot | Public Website booking, Patient self-service booking, Core Team review queue |
| `leads[]` (optional, may fold into `appointmentRequests`) | A general inquiry that isn't yet a booking request (e.g., a contact-form message) | Core Team "New inquiries" |
| `forms[]` / per-patient form assignments | Intake/consent-style structured forms and their completion status | Core Team "Pending forms," Patient "Complete forms" |
| `messages[]` (per patient thread) | Two-way clinic↔patient communication | Therapist "Messages," Core Team "Operational communication," Patient "Message Clinic" |
| `treatmentPlans[]`, `assessments[]` | Structured clinical entities (already flagged in the audit as the next clinical data-model step, independent of this task) | Therapist Dashboard "Treatment plan reviews" / "Assessments due" |

None of these require a backend to exist as a first version — they can live in the same `db` object and `localStorage` key, exactly like `patients`/`appointments`/`invoices` do today. The genuine constraint (already flagged in the audit) is that **appointment requests created on a public, unauthenticated page cannot be written into a single browser's `localStorage`** — a visitor's browser and the clinic's browser are different devices. This is the one piece of this architecture that cannot be prototyped honestly with the current no-backend approach; it needs at minimum a shared write target (even a very small one) before "Public Website → Appointment Request → Core Team Dashboard" can be real rather than simulated. Flagging this now, per the explicit instruction not to pretend `localStorage` provides cross-device sync — this is an approval point, not a detail to quietly work around.

---

## 10. Single-clinic scope guardrail

Everything above assumes one clinic, consistent with the current product. Nothing in §9's new entities requires a `clinicId`/`orgId` to function correctly at single-clinic scale, but none of them hard-code an assumption that would block adding one later (e.g., `appointmentRequests[]` doesn't assume a single fixed therapist — it can carry a `therapistId` even while only one exists today, the same way `db.patients` already does). No multi-clinic switcher, tenant management, or organization-level concept is introduced or implied here, matching this task's explicit constraint.

---

## 11. What this document is asking approval for

1. **The four-experience frame itself** (§2–§3) — confirm this is the right shape before any of the ⚪ ADD rows become code.
2. **The Appointment Request entity** (§9) — the one piece of data model shared across three of the four experiences; getting its shape right matters more than any individual screen.
3. **The cross-device write problem** (§9, last paragraph) — a product decision on how far to go before a real backend is needed for the Public Website specifically.
4. **Brand + palette lock** (§8) — hex table and tagline are now grounded in `docs/references/mindcare-logo.png` (and the two experience mockups). Confirm or adjust hex before the values-only CSS pass.
5. **Public Website IA** (§3.1 + `mindcare-public-website.png`) — confirm section set and that Book CTAs must create Appointment Requests, not confirmed appointments.
6. **Therapist Dashboard honesty vs. mockup** (§3.2 + §8A + `mindcare-therapist-dashboard.png`) — confirm we match density only where data exists (defer Treatment Reviews / Messages widgets).
7. **The Settings reorganization** (§7) — mostly a relocation of an already-working screen, plus one small new entity (Clinic Profile); confirm before `db.settings` gains new fields.
8. **Sequencing** — recommended order is: palette/logo pass (values + asset only) → Appointment Request entity → Core Team review queue → Public Website (static IA first, then booking form) → Patient self-service booking/reschedule → Forms → Messaging → Treatment Plans/Assessments (feeding the Therapist Dashboard's remaining ⚪ ADD rows) → Client 360 tab restructuring / target sidebar growth. Same "don't build a nav item or widget ahead of its real data" discipline.

No application code has been changed in this pass. Reference images were copied into `docs/references/` only. `10-mindcare-current-vs-target-audit.md`, `01-product-blueprint.md`, `02-information-architecture.md`, and `05-wireframes.md` are unmodified.
