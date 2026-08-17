# MindCare — Current vs. Target Audit

**Status:** Audit only — no code changed, no product documents changed, no rename, no new repository.
**Method:** Every claim below about "current MindCare" is verified against the actual source (`index.html`, `styles.css`, `app.js`, all read in full), not inferred from `README.md`. Every claim about "target" is verified against `01-product-blueprint.md`, `02-information-architecture.md`, and `05-wireframes.md`.

---

## 1. Executive Summary

MindCare, as it exists today, is a **genuinely well-built, single-practitioner practice organizer** — not a rough prototype. Its auth, modal/toast interaction pattern, printable reports, and Zoom video integration are implemented with real craft (salted+hashed passwords with an algorithm-aware fallback, a deep-link-then-browser-fallback video launcher, an isolated print stylesheet for statements, atomic backup/restore, actual responsive breakpoints). None of that should be thrown away.

What it is **not** yet is the multi-therapist, therapy-first clinical system described in the approved documents. The gap is not primarily cosmetic — it's structural: MindCare's entire data model and permission system assume exactly **one practitioner**, whereas the approved Blueprint's core premise is a clinic with **multiple therapists**, cross-therapist permissions (Locked Decision 1), multiple treatment plans per client (Locked Decision 4), and a public website-to-booking journey that MindCare has no trace of. Clinical documentation today is a single free-text field with two cosmetic template buttons, not the six structured, sign-and-lock documentation styles the wireframes require.

In short: **keep the foundation, extend the data model deliberately, and treat "multiple therapists" as the one product decision that should be resolved before any deep clinical-model work begins** — because it changes the shape of nearly every other module.

---

## 2. Existing MindCare Strengths

These are implemented well enough that the target work should build on them, not replace them:

1. **Auth is more careful than it needed to be for a local-only tool.** Passwords are salted and hashed via `crypto.subtle.digest('SHA-256', …)`, with a documented FNV-1a fallback for non-secure contexts (`file://`, where WebCrypto is unavailable) — and `verifyPassword` re-derives using whichever algorithm the stored hash actually used, so accounts survive being opened in a different context. (`app.js:100-118`)
2. **Practitioner-only clinical data is kept out of the DOM, not just CSS-hidden.** `renderPatientDetail` sets `recs = !isPractitioner() ? [] : …` before ever building HTML (`app.js:372`) — this is exactly the "absent, not greyed out" principle the approved IA and wireframes require (PR1, `05-wireframes.md` §0.8).
3. **The Zoom/Jitsi video launcher is a real, working integration**, not a stub: it builds a `zoommtg://` deep link, races a browser fallback with a 1.8s timer cleared on `blur`, copies the link to the clipboard, and warns the user if a popup blocker stops the fallback (`app.js:633-685`). This is more sophisticated than "Join Session" typically is at wireframe stage.
4. **The printable invoice/superbill is a genuinely clean pattern**: a dedicated hidden `#print-invoice` container is populated and swapped in via a body class only during print, so the app itself is invisible in the output (`app.js:847-897`, `styles.css:282-296`).
5. **Responsive behavior is real, not aspirational** — actual `@media (max-width: 900px)` and `@media (max-width: 720px)` breakpoints collapse the two-column layout and turn the sidebar into a horizontal nav strip (`styles.css:92, 267-280`).
6. **Consistent, low-friction interaction pattern** across the whole app: one `openModal`/`closeModal` pair, one `toast()` helper, native `confirm()` before every destructive action (delete, wipe — wipe requires two confirms), Escape closes modals. Every module reuses the same `row`/`card`/`chip`/`badge` CSS components rather than inventing new ones per screen.
7. **Honest, non-overclaiming documentation.** The README explicitly says "not a certified EHR," "not HIPAA-compliant out of the box," and describes what device-level access control does and does not protect against. This tone matches what the approved wireframe spec insists on (§ HIPAA/Privacy UX Considerations: "does not claim HIPAA compliance") and should be preserved as the product grows, not softened.
8. **Backup/restore is atomic and honest about consequences** — export is one click, import requires confirmation and explicitly warns it replaces all data, and unrelated settings (users, video settings) are preserved across a restore from an older backup shape (`app.js:1190-1212`).

---

## 3. Existing MindCare Capability Audit

| Module | What exists (verified in code) | Completeness | Usability | Maintainability |
|---|---|---|---|---|
| Login / Roles | 3 roles (Practitioner/Staff/Patient), salted+hashed passwords, session via `sessionStorage`/`localStorage` token, practitioner-only view gating, patient portal isolation | Partial — solid for 3 roles, no MFA, no timeout | Clean single-screen login/setup flow | Gate functions (`requirePractitioner`, `requireStaffAccess`) are simple and reusable |
| Dashboard | Stat cards (patients/today/week/outstanding), today's appointments, unpaid invoices, first-run empty state with sample-data loader | Functional, single dashboard for all non-patient roles | Clear, low cognitive load | One render function, easy to extend with more widgets |
| Patients | Demographics, emergency contact, insurance (free text), search, patient detail page | Core CRUD complete; no status field, no risk flag, no structured payer type | Search-as-you-type, clear detail layout | `patientById`/`patientName` helpers reused everywhere — good |
| Schedule | List (filtered) + week-grid calendar with prev/next nav; video/in-person type only | Solid for a single calendar; no appointment status lifecycle, no multi-provider | Week grid is genuinely nice; filters are one click | `apptRow()` reused across Dashboard/Schedule/Video/Portal — good reuse |
| Clinical Entries | Dated symptoms/diagnosis/notes per patient, practitioner-only | Shallow data model (three free-text fields) | Simple form, but no structure | Flat array on `patient.records` — will need restructuring |
| Session Notes / SOAP / DAP | Two buttons insert plain-text skeletons into the single `notes` textarea | Cosmetic only — not structured fields, no BIRP/GIRP/Narrative/Custom, no signing | Fast to use, easy to misunderstand as "real" templating | `NOTE_TEMPLATES` is a 2-entry lookup — trivial to extend, but architecture (one big textarea) won't scale to true per-field templates |
| Video Visits | Zoom deep-link launcher + Jitsi fallback, saved per-practice, applied to upcoming video appointments | Strong for what it covers; no waiting room/pre-check/session-end states, no link to notes/billing | One-click, clear settings screen with status message | Self-contained; easy to extend with waiting-room UI later |
| Billing & Payments | Invoices (free-text description/amount), payments array, status badges, printable superbill | Solid basic invoicing; no service/price-list entity, no structured payer type, no appointment linkage | Clear stat cards, obvious "Record payment" CTA | `paidAmount`/`invoiceStatus` are clean, reusable derivations |
| Health Reports | Full per-patient report on screen + browser print-to-PDF, practitioner-only | Strong for single-patient reporting; no cross-caseload/aggregate reports | Print-ready, well laid out | Report builder is one big function — fine at this scope |
| Data & Backup | JSON export/import (atomic replace), double-confirm wipe, user management | Solid; no encryption, no audit trail of who exported/restored | Clear danger-zone separation | Straightforward; `save()` centralizes persistence |
| Patient Portal | Read-only upcoming/past visits (join/copy link), billing summary | Narrow slice of target portal scope | Simple, appropriately reduced | Reuses `visitRow`/`apptRow` patterns |
| Website / public-facing | **None found in source** | Not implemented | N/A | N/A |
| Forms | **None found** beyond the two note-template buttons | Not implemented | N/A | N/A |
| Communication | **None found** — no messaging, SMS, email, or notifications of any kind | Not implemented | N/A | N/A |

---

## 4. Module-by-Module Comparison

| Feature | Current MindCare | Target Requirement | Gap | Recommendation |
|---|---|---|---|---|
| Roles | Practitioner / Staff / Patient (3 roles); Staff bundles reception + billing + scheduling + video | Admin / Therapist / Receptionist / Billing Staff / Client (5 roles) with per-tab PR1 visibility (`02-ia.md` §21, `05-wireframes.md` §21) | Staff is not split; no per-role tab-level restriction beyond practitioner-only | 🟡 ENHANCE — split Staff into Receptionist/Billing once there's enough distinct functionality to justify it (see Implementation Order) |
| MFA | None | Login → MFA screen is an explicit Journey B requirement (`05-wireframes.md` screens 15-16) | Missing entirely | ⚪ MISSING |
| Session timeout | None — "remember me" is indefinite until manual Sign out | Idle staff sessions auto-timeout, require re-auth (`05-wireframes.md` §0.11) | Missing | ⚪ MISSING |
| Multiple therapists | **Not supported** — one practitioner assumed throughout auth, scheduling, dashboard, reports | Core Blueprint premise: "the clinic may have multiple therapists" (`01-blueprint.md` §6); cross-therapist access is Locked Decision 1 | Structural — not a missing screen, a missing dimension of the data model | 🔴 REBUILD (data model + auth), highest-leverage single change |
| Dashboard | One dashboard, all non-patient roles see the same widgets | 4 distinct role-scoped dashboards (`05-wireframes.md` screens 20-23) | No clinical-task widgets (pending notes, plan reviews), no lead/inquiry tracking, no per-role split | 🟡 ENHANCE (keep the stat-card/list layout, add widgets once source data exists) |
| Client 360 | Patient detail: demographics, clinical history, upcoming visits, billing summary, report link | 11-tab Client 360: Overview, Timeline, Appointments, Clinical Notes, Assessments, Treatment Plan, Forms, Consent, Documents, Messages, Billing (`02-ia.md` §8, `05-wireframes.md` §37) | Covers ~4 of 11 tab concepts, at reduced depth | 🟠 REFACTOR into a tabbed layout as new tab content becomes available — don't rebuild the page shell, extend it |
| Client status | None — no Active/Inactive/Discharged field | Explicit IA decision: Active/Inactive/Discharged status + filter (`02-ia.md` §8) | Missing field | 🟡 ENHANCE — quick win, additive field |
| Payer type | Free-text "insurance" field on patient; payment "method" includes "Insurance" as an option | Structured Self-Pay/Insurance/Other enum (Locked Decision 6) | Not structured | 🟡 ENHANCE — quick win, additive field |
| Appointment status lifecycle | None — appointments exist or are edited/deleted, no status | Requested → Pending → Confirmed → Checked-In → In Session → Completed, plus Cancelled/No-show (`01-blueprint.md` §9) | Missing entirely | 🟠 REFACTOR — add a `status` field to the existing appointment object, needs a migration for existing records |
| Multi-participant sessions (Couples/Family/Group) | Appointments are single-patient only | Individual/Couples/Family/Group all supported (Locked Decision 2) | Missing — no participant list concept | 🔴 REBUILD (appointment/participant data model) |
| Clinical Notes (structured) | One free-text `notes` field, two skeleton-insertion buttons | 6 structured templates (SOAP/DAP/BIRP/GIRP/Narrative/Custom), each with distinct fields (`05-wireframes.md` §59) | Not structured; only 2 of 6 styles even cosmetically present | 🔴 REBUILD note-editor; the *concept* of a per-patient dated entry is fine and can stay |
| Note signing / locking | None — every entry is always editable and deletable | Signed notes are permanently locked; addenda are separate, independently-signed records (Locked Decision 2 from the wireframe finalization round) | Missing entirely — directly contradicts an explicit locked product decision | 🔴 REBUILD — this is a workflow/state-machine addition, not just a field |
| Assessments (PHQ-9 etc.) | None | Assessment library, scoring, trend history (`01-blueprint.md` §15) | Missing entirely | ⚪ MISSING |
| Treatment Plans / Goals | Diagnosis is a free-text string on a clinical entry; no goals, objectives, or plan entity | Structured plan with problems/goals/objectives/interventions, multiple plans per client, only relevant ones active (Locked Decision 4) | Missing entirely | ⚪ MISSING |
| Risk / Safety indicator | None | Restricted-visibility indicator, full detail for clinical roles, flag-only for Reception (Locked Decision 5) | Missing entirely | ⚪ MISSING |
| Re-intake cycles | No concept of "intake" at all — patients are created directly | Multiple intake cycles per client; Clinical vs. Administrative re-intake split with different initiators (Locked Decision 3) | Missing entirely | ⚪ MISSING |
| Minor / guardian consent | No consent concept at all | Guardian/Authorized Representative signing path, scoped access (Product Owner decision, `05-wireframes.md` §75) | Missing entirely | ⚪ MISSING |
| Forms & Documents | None beyond note-template buttons | Intake/consent/questionnaire library, e-signature, document storage (`02-ia.md` §13) | Missing entirely | ⚪ MISSING |
| Communications | None | Secure inbox, SMS/email automation, templates, notification center (`02-ia.md` §14) | Missing entirely | ⚪ MISSING |
| Telehealth join mechanic | Zoom deep-link + Jitsi fallback — works well | Appointment → Join → Waiting Room → Session → Note/Billing (`05-wireframes.md` §86-89) | Missing waiting room, pre-session check, session-end state, and the link back into a signed note | 🟢 KEEP the launcher, 🟡 ENHANCE with the surrounding states |
| Billing | Invoices, payments, superbill print | Invoices/Payments/Outstanding Balances against Services, structured payer type (`01-blueprint.md` §21) | No Services/price-list entity; invoice description/amount are free-typed each time | 🟡 ENHANCE — add a Services list, link invoices to it |
| Reports | Single per-patient report + PDF | 4 categories: Operational/Clinical/Financial/Provider, clinic-wide (`02-ia.md` §17) | No cross-caseload aggregate reporting at all | ⚪ MISSING (aggregate side); 🟢 KEEP the per-patient report as-is |
| Settings | Video settings, users, backup | Clinic Profile, Providers & Staff, Services, Availability, Appointment Settings, Notifications, Forms & Templates, Integrations, Security, Roles & Permissions (`02-ia.md` §18) | Covers 2 of 10 target settings areas | ⚪ MISSING (most sub-areas); 🟢 KEEP what exists |
| Client Portal | Read-only appointments (join/copy link) + billing | Home, Appointments, Book/Reschedule, Forms, Messages, Documents, Billing, Profile, Telehealth, Consent (10 screens, `05-wireframes.md` §114-123) | Covers 2 of 10, no self-service booking | 🟡 ENHANCE incrementally as underlying modules (Forms, Messages) exist |
| Public website | None | Homepage, Services, Therapist Directory, Therapist Profile, Booking wizard, Confirmation (`05-wireframes.md` §01-14) | Missing entirely | ⚪ MISSING |
| Leads / Intake pipeline | None — patients created directly by staff | New Inquiry → Contacted → … → Converted to Client (`02-ia.md` §9) | Missing entirely | ⚪ MISSING |
| Data export/backup | JSON export/import, atomic, double-confirm wipe | Settings > Security / audit-aware backup expectations | Functionally solid; no encryption, no export audit trail | 🟢 KEEP, 🟡 ENHANCE with an inline PHI warning |
| Password/auth security | Salted+hashed, algorithm-aware verify | MFA, session timeout, account lockout | Foundation is good; depth is short of target | 🟢 KEEP the hashing approach, ⚪ MISSING MFA/timeout/lockout |

---

## 5. UX Assessment

Evaluated directly against actual rendered structure (not the wireframes) for each user type MindCare currently distinguishes.

### Practitioner / Staff (today's combined "office user")
- **Navigation:** single fixed sidebar, one click per view, current view highlighted — low cognitive load, no nested menus to get lost in.
- **Information hierarchy:** Dashboard leads with stat cards then two content lists — matches "most important number first" convention well.
- **Cognitive load:** low. Every create/edit flow is the same shape (button → modal → form → save → toast). A first-time user does not need to learn multiple patterns.
- **Clicks to complete a task:** booking an appointment for an existing patient is 2 clicks (nav or dashboard button → save); this is already close to the wireframe principle of a fast, low-friction flow.
- **CTA placement:** primary action is consistently top-right of each view header (`+ New Patient`, `+ New Appointment`, `+ New Invoice`) — consistent and predictable.
- **Search/filters:** Patients has live search; Schedule has filter chips (Upcoming/Today/Past/All) plus a separate List/Week mode — good, appropriately scoped (no over-filtering for a single-practitioner caseload).
- **Forms:** consistent `form-row`/`label` pattern, required fields marked with `*`, sensible input types (`type="date"`, `type="time"`, `type="number"`).
- **Empty states:** genuinely good — every list has a distinct "No X yet" message, and the Dashboard's first-run state explicitly offers "Load sample data" so a new user isn't staring at a blank app. This already matches the wireframe spec's E1 pattern in spirit.
- **Loading states:** not applicable — localStorage reads/writes are synchronous, so there's no async gap to show a loading state for. Not a real gap.
- **Error states:** weakest area — invalid JSON import uses a native `alert()`, not an inline styled message; there's no field-level validation beyond HTML5 `required`/`min`/`type` constraints. Functionally safe, visually inconsistent with the rest of the app's toast/modal language.
- **Confirmation states:** present and appropriately weighted — single `confirm()` for delete, double `confirm()` for full wipe. Native browser dialogs are less polished than the wireframe spec's styled C1 pattern (which states the specific consequence and uses a specific button label) but functionally equivalent in intent.
- **Responsive:** real breakpoints at 900px and 720px, sidebar becomes a horizontal scrollable nav strip on phones, two-column layouts collapse to one column — this is already better than "not built yet," it's an implemented, deliberate mobile layout.
- **Accessibility:** real `<button>` and `<label>` elements throughout (keyboard-operable, screen-reader-associable by default); no `aria-live` on the toast, no `role="dialog"` on the modal, no skip link — a few gaps, not a systemic problem.
- **Consistency:** high — one card style, one row style, one badge system reused everywhere.

### Patient (portal)
- Minimal, appropriately reduced relative to staff views — the portal shows exactly upcoming/past visits and billing, nothing more, which matches the target's "portal must be much simpler than the staff application" principle.
- Gap: no self-service action beyond joining a video call or copying a link — booking, forms, and messaging are entirely staff-initiated today.

### Reception / Billing (as distinguished from Staff)
- Not currently a distinguishable UX at all — a Staff-role login sees the *entire* non-clinical app, including billing, scheduling, and video, with no narrower "front desk" or "billing-only" view. Evaluating this role's UX separately isn't yet possible from the code, because the role doesn't exist as a separate surface yet.

---

## 6. Therapy-Specific Gap Analysis

Checked directly against the list in the audit request. Nothing here is inferred — if it wasn't found in `app.js`/`index.html`, it's marked MISSING.

| Requirement | Found in code? | Notes |
|---|---|---|
| SOAP | Partial | Text-skeleton insertion into one shared textarea, not structured fields |
| DAP | Partial | Same as SOAP |
| BIRP | Missing | Not present |
| GIRP | Missing | Not present |
| Narrative | Missing | Not present as a distinct selectable style (the whole notes field is effectively narrative by default, but not offered as a named option) |
| Custom note templates | Missing | Not present |
| Multiple treatment plans | Missing | No treatment plan entity exists at all |
| Treatment plan status | Missing | — |
| Goals/outcomes | Missing | — |
| Assessments | Missing | No instrument library, scoring, or trend tracking |
| Re-intake | Missing | No intake concept exists, so re-intake cannot exist either |
| Couples therapy | Partial | Nothing prevents entering a couple as a "patient," but there is no multi-participant appointment or shared-record concept |
| Family therapy | Partial | Same limitation as couples |
| Group therapy | Missing | No multi-participant appointment support |
| Minor/guardian consent | Missing | No consent concept exists at all |
| Risk/safety indicators | Missing | — |
| Client 360 | Partial | Patient detail page covers a subset of the target's 11 tabs |
| Clinical timeline | Missing | No aggregated chronological view; data exists to build one from (records + appointments + invoices) but it isn't rendered as a timeline |
| Therapist communication history | Missing | No messaging exists to have history of |
| Telehealth | Present (strong) | Zoom/Jitsi launcher works well; missing waiting room, pre-session check, session-end state |
| In-person care | Present | Appointment `type: 'in-person'` with a location field |
| Website appointment booking | Missing | No public site exists |
| Patient/client portal | Partial | Read-only slice of appointments + billing |
| Leads/inquiries | Missing | — |
| Basic payer type | Partial | Free-text "insurance" field, not a structured enum |
| Billing/payment | Present | Solid basic invoicing and payment recording |
| Scheduling | Present | Solid list + week-grid scheduling, single-provider only |

---

## 7. HIPAA-Aware Gap Review

MindCare's own README is already appropriately honest here; this section extends that assessment with priority levels. **None of this claims MindCare is or could trivially become HIPAA-compliant — compliance is an organizational and infrastructure property, not a single feature.**

| Area | Current state | Priority | Current prototype limitation vs. future production requirement |
|---|---|---|---|
| Authentication | Salted+hashed passwords, no MFA, no lockout, minimum password length 4 | HIGH | Prototype limitation: weak minimum length, no lockout. Production: MFA + strong password policy + lockout are non-negotiable per the approved wireframes (screens 15-16). |
| Session management | Token is a raw user ID in `sessionStorage`/`localStorage`, no expiry, "remember me" is indefinite | HIGH | Prototype limitation: trivially readable/forgeable via DevTools. Production: needs real session expiry and idle timeout (`05-wireframes.md` §0.11). |
| Role-based access | 3 roles, data-level gating for clinical records (good), but general notes/insurance fields are not role-gated at all | MEDIUM | Needs re-evaluation once Receptionist/Billing are split from Staff — decide what "general notes" should be visible to each role. |
| PHI exposure (at rest) | Entire `db` (patients, clinical records, invoices) stored as one plaintext JSON blob in `localStorage` | HIGH | This is inherent to the current "no backend" architecture. Not fixable incrementally — encryption at rest for a pure client-side app is fundamentally limited by the browser storage model. **Future architecture decision**, not a quick fix. |
| Backup/export security | Export produces an unencrypted JSON file to disk; no in-app warning at the point of export | MEDIUM | Quick win available (inline warning); full fix (encrypted export) is a future item. |
| Audit logging | None — no record of who viewed/edited/signed/exported what, when | HIGH (for clinical use) / FUTURE ARCHITECTURE | A client-side-only audit log stored in the same editable blob provides no real assurance. Meaningful audit logging likely requires a backend — flag as a deliberate future architecture decision, not an incremental patch. |
| Clinical note access | Practitioner-only, and correctly excluded from the DOM for other roles | LOW (already reasonably handled) | Extend the same pattern to Assessments/Treatment Plans/Risk once they exist. |
| Documents | Not implemented | FUTURE | No exposure risk today because there's nothing to expose. |
| Messaging | Not implemented | FUTURE | Same. |
| Notifications | Not implemented | FUTURE | Same — but note the approved spec's rule that notifications must never contain PHI/clinical content once built (`05-wireframes.md` §0.11). |
| Telehealth | Zoom link stored in plaintext in the same local blob; BAA responsibility correctly deferred to the operator in the README | MEDIUM | Already appropriately documented rather than falsely reassuring — preserve this framing when the feature grows. |
| Third-party integrations | Only Zoom/Jitsi (client-initiated redirect, no data sent from the app itself) | LOW | No API keys or server-side integration exist to secure. |

---

## 8. Architecture Assessment

**Can `index.html` + `styles.css` + `app.js` reasonably support the target incrementally? Yes, up to a point — and that point is multi-therapist support and structured clinical entities, both of which are data-model changes, not framework changes.**

- **Tightly coupled code:** most render functions call `document.getElementById(...)` directly rather than through any abstraction — fine at the current size (1,308 lines), but every new tab/view adds more of this. Not urgent to fix.
- **Duplicated logic:** minimal — `apptRow()`, `patientOptions()`, `paidAmount()`, `invoiceStatus()` are each defined once and reused across Dashboard/Schedule/Video/Portal/Billing. This is a real strength; a future refactor should preserve this "one render function per concept, reused everywhere" habit rather than replace it.
- **Reusable UI patterns already in place:** `.row`, `.card`, `.chip`, `.badge`, `openModal/closeModal`, `toast()` — these are effectively a tiny informal component library already. The target wireframe prototype (`/prototype`) uses the same philosophy (shared pattern functions returning HTML strings) — the two codebases are architecturally compatible in spirit, which is a good sign for incremental convergence.
- **Data-model limitations (the real ceiling):**
  - `patient.records[]` blends symptoms/diagnosis/notes into one flat array — needs to become separate collections (Clinical Notes, Assessments, Treatment Plans) before those features can exist.
  - `appointments[]` has no `status` field and no participant list — both are additive changes but need a migration path for existing localStorage data (older records will lack the new fields).
  - There is no `providerId` concept distinct from "the one practitioner" — multi-therapist support requires this everywhere `currentUser()`/`isPractitioner()` is used today, plus a genuinely new permission dimension (Locked Decision 1's cross-therapist access) that doesn't exist in any form yet.
- **localStorage limitations:** single-device, single-browser by design (already disclosed in the README) — this is a product-scope decision, not a bug, but it caps how far "MindCare stays local-only" can go if multi-therapist, multi-device access is ever required (two therapists cannot share one browser's localStorage). This should be flagged as a future product decision, separate from any incremental code change.
- **Routing limitations:** none — views are shown/hidden by class toggle, no URL reflects state, no deep-linking (e.g., no way to link directly to a specific patient or tab). Not urgent, but will matter once Client 360 has 11 tabs and staff want to bookmark/share a specific one.
- **Permission limitations:** the two-function gate pattern (`requirePractitioner`, `requireStaffAccess`) works cleanly for 3 roles; it will need to become a small permission table (role × module) once Receptionist/Billing are split out and once cross-therapist grants (Locked Decision 1) are introduced — this is a natural, low-risk evolution of the existing pattern, not a replacement of it.
- **Scalability limitations:** `renderAll()` re-renders every view on every `save()`, regardless of which view is visible. Harmless at current scale (localStorage read/write is fast, DOM is small); worth revisiting once Client 360's 11 tabs and a fuller module set exist, so a save doesn't re-render unrelated parts of the app every time.

**Conclusion: no framework migration is warranted by anything found in this audit.** The plain HTML/CSS/JS approach has already absorbed a reasonably complex feature set cleanly. The work ahead is schema and permission-model growth, which this architecture can absorb incrementally if sequenced carefully (see §16).

---

## 9. MindCare Scorecard

Percentages are feature-checklist estimates derived directly from the module comparison in §4 (count of target sub-requirements actually present, at any depth, ÷ total listed for that module) — not precision measurements, and stated as approximate.

| Module | Current Completeness | Current UX Quality | Target Coverage | Status | Recommendation |
|---|---|---|---|---|---|
| Auth & Roles | ~50% (3 of 5 target roles; hashing solid; MFA/timeout absent) | Good | ~35% | 🟡 ENHANCE | Extend roles + add MFA/timeout before deeper role-gated features |
| Dashboard | ~60% (core stats/lists present, no clinical-task widgets) | Good | ~30% | 🟡 ENHANCE | Add widgets as their source data (notes/plans) comes online |
| Clients / Client 360 | ~45% (demographics/appts/billing solid; 7 of 11 target tabs absent) | Good | ~35% | 🟠 REFACTOR into tabs | Convert detail page to tab shell now, fill tabs incrementally |
| Schedule & Appointments | ~55% (list+week strong; no status lifecycle, no multi-provider/participant) | Very good | ~40% | 🟡 ENHANCE / 🟠 REFACTOR | Add status field + migration; defer multi-provider until role split |
| Clinical Notes/Documentation | ~15% (2 of 6 styles, cosmetic only, no signing) | Fair | ~20% | 🔴 REBUILD | Needs structured fields + sign/lock + addenda |
| Assessments | 0% | N/A | 0% | ⚪ MISSING | Net-new |
| Treatment Plans/Goals | 0% | N/A | 0% | ⚪ MISSING | Net-new |
| Risk/Safety | 0% | N/A | 0% | ⚪ MISSING | Net-new |
| Forms & Documents | 0% | N/A | 0% | ⚪ MISSING | Net-new |
| Communications | 0% | N/A | 0% | ⚪ MISSING | Net-new |
| Telehealth | ~55% (join mechanic strong; surrounding states absent) | Very good | ~55% | 🟢 KEEP core / 🟡 ENHANCE states | Preserve launcher, add waiting room + note linkage |
| Billing | ~55% (invoicing/payments/print solid; no services entity, no structured payer type) | Good | ~55% | 🟢 KEEP / 🟡 ENHANCE | Add Services list + payer-type enum |
| Reports | ~25% (strong single-patient report; no aggregate reporting) | Good (for what exists) | ~25% | 🟢 KEEP existing / ⚪ MISSING aggregate | Preserve per-patient report, add clinic-wide reports later |
| Settings | ~25% (video/users/backup only) | Good (for what exists) | ~25% | 🟢 KEEP existing / ⚪ MISSING rest | Add remaining sub-areas as their features exist |
| Client Portal | ~20% (2 of 10 target screens, reduced) | Good (for what exists) | ~20% | 🟡 ENHANCE | Grow alongside Forms/Messages |
| Public Website/Booking | 0% | N/A | 0% | ⚪ MISSING | Net-new, largest single surface |
| Leads/Intake | 0% | N/A | 0% | ⚪ MISSING | Net-new |
| Data & Backup | ~70% (export/import/wipe solid; no encryption/audit trail) | Very good | ~70% | 🟢 KEEP | Add inline PHI warning; encryption is a future architecture item |

---

## 10. KEEP

- Salted+hashed password approach and algorithm-aware verification.
- Modal / toast / confirm interaction pattern used across the whole app.
- Zoom deep-link + Jitsi fallback video launcher.
- Printable superbill/report pattern (isolated print DOM + print stylesheet).
- Practitioner-only DOM-level data gating for clinical records.
- Existing responsive breakpoints and mobile nav pattern.
- JSON export/import with atomic replace and double-confirm wipe.
- Reusable render-function pattern (`apptRow`, `patientOptions`, `paidAmount`, etc.) — keep extending this habit rather than introducing a different pattern per new module.
- README's honest, non-overclaiming compliance framing.

## 11. ENHANCE

- Dashboard widgets (once clinical-task data exists).
- Client detail page → tabbed Client 360 shell.
- Client record: add `status` (Active/Inactive/Discharged) and structured `payerType`.
- Appointment record: add a `status` lifecycle field (with data migration).
- Billing: add a Services/price-list entity; link invoices to it.
- Client Portal: grow self-service scope as Forms/Messages come online.
- Telehealth: add pre-session check, waiting room, session-end state around the existing launcher.
- Data & Backup: inline PHI-handling warning near the export button.
- Accessibility: `aria-live` on toast, `role="dialog"`/`aria-modal` on the modal.

## 12. REFACTOR / REBUILD

**Refactor** (architecture/structure needs work, but the underlying capability is sound):
- Role gating: extend the two-function pattern into a small role × module permission table as Receptionist/Billing are split from Staff.
- `patient.records[]` → separate Clinical Notes / Assessments / Treatment Plans collections.
- `renderAll()` full-rerender-on-save → render only the active view, once view count grows.

**Rebuild** (current implementation isn't suitable for the target requirement):
- Clinical note editor: from one free-text field to 6 structured, signable documentation styles with addenda.
- Appointment/participant model: from single-patient to Individual/Couples/Family/Group.
- Auth/scheduling data model: from single-practitioner to multi-therapist with cross-therapist permission grants (Locked Decision 1) — this is the single highest-leverage rebuild, since it's a prerequisite dimension for several other modules (Schedule, Dashboard, Reports, Clinical Care worklist).

## 13. MISSING

- MFA, session timeout, account lockout.
- Assessments (library, scoring, trend history).
- Treatment Plans / Goals / Objectives / Interventions.
- Risk/Safety indicator (restricted-visibility pattern).
- Re-intake cycles (Clinical vs. Administrative).
- Minor/guardian consent.
- Forms & Documents (templates, e-signature, document storage).
- Communications (secure messaging, SMS/email automation, notification center).
- Public website (Homepage, Services, Therapist Directory, Therapist Profile, Booking wizard).
- Leads/Intake pipeline.
- Clinical timeline (aggregated view).
- Aggregate/cross-caseload Reports (Operational, Clinical, Financial, Provider categories).
- Remaining Settings sub-areas (Clinic Profile, Services, Availability, Appointment Settings, Notifications, Forms & Templates, Integrations beyond Zoom, Roles & Permissions, Security/audit).
- Audit logging.

## 14. QUICK WINS

Low risk, additive, no architectural change required:
- Add `payerType` field (Self-Pay/Insurance/Other) to the patient form.
- Add `status` field (Active/Inactive/Discharged) to the patient form + a filter chip on the Patients list.
- Extend `NOTE_TEMPLATES` with BIRP/GIRP/Narrative/Custom skeletons (same mechanism as the existing SOAP/DAP buttons).
- Add an inline "this file contains PHI — store it securely" note next to the Export button.
- Add `role="dialog"` / `aria-modal="true"` to the modal backdrop and an `aria-live="polite"` region for the toast.
- Add a simple idle-timeout auto-lock (reuses the existing `lockApp()` function).

## 15. HIGH-RISK CHANGES

Changes that touch shared state or many call sites, and should be planned carefully:
- Restructuring `patient.records[]` into separate collections — every reader of `p.records` needs updating together.
- Introducing multi-therapist support — touches auth, scheduling, dashboard, reports, and requires a genuinely new permission dimension; needs a product decision first (mirroring how Locked Decision 1 was resolved for the wireframes), not just code.
- Adding an appointment `status` lifecycle — every reader of `db.appointments` (Dashboard, Schedule list/week, Video list, Portal, Reports) must handle the new field, and existing localStorage data needs a migration default.
- Note signing/locking + addenda — changes the current always-editable/deletable behavior of clinical entries; must ship with a clear plan for existing unsigned data so nothing is silently locked or lost.
- Any move toward a backend (required for real audit logging, encryption at rest, MFA at scale, or multi-device/multi-therapist sync) — a deliberate, separate architectural decision, not something to slip in incrementally under a "quick win."

---

## 16. Recommended Implementation Order

**Do not implement yet — this is sequencing guidance only.**

1. **Quick wins first** (§14) — additive fields and polish that touch no shared state and carry no migration risk. Builds immediate alignment with the target documents and costs almost nothing.
2. **Resolve the multi-therapist question as a product decision before touching schema.** Nearly every deeper module (Schedule, Dashboard, Clinical Care, Reports, cross-therapist permissions) depends on whether MindCare grows into a multi-therapist tool now or stays single-practitioner with multi-therapist deferred. This should be decided explicitly — the way Locked Decisions 1-8 were resolved for the wireframes — not discovered mid-implementation.
3. **Grow the clinical data model incrementally, one entity at a time**, each shipped with its own migration for existing localStorage data: Treatment Plans → Assessments → Risk/Safety flag → structured Note templates → Note signing/addenda. Each step is independently useful and testable; don't attempt all of them in one change.
4. **Split Staff into Receptionist/Billing** only once there's enough distinct functionality (from step 3 and the Forms/Communications work below) to make separate views meaningful — splitting the role earlier just adds gating code with nothing yet to gate differently.
5. **Public website + booking wizard + Leads/Intake pipeline** — the largest net-new surface. Best sequenced *after* steps 2-3, so publicly-created bookings land directly into an already-correct Client/Appointment schema rather than needing a second migration once that schema changes later.
6. **Forms & Documents, then Communications** — both depend on having stable Client and Appointment records (and, for consent specifically, the guardian/minor decision already resolved) to attach to.
7. **Postpone until a deliberate backend/security architecture decision exists:** MFA at production strength, real session expiry, encryption at rest, and audit logging. These are flagged repeatedly above as *future architecture*, not incremental localStorage patches — bolting them onto the current no-backend model would either be cosmetic (false assurance) or would quietly force the backend decision anyway. Make that decision on purpose, separately from feature work.

**What should be left untouched for now:** the auth hashing approach, the modal/toast/confirm pattern, the video launcher, the print/report generation, and the responsive layout — all are already aligned with the target's intent and don't block anything else on this list.
