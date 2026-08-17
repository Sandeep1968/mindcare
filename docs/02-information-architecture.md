# CareNexa — Information Architecture
## Single-Clinic V1 (derived from `01-product-blueprint.md`)

**Status:** Finalized for V1 (single-clinic)
**Source of truth:** `/docs/01-product-blueprint.md`
**Scope:** Navigation, module boundaries, information relationships, permissions — for one psychology/therapy clinic. No UI, no database, no code.

---

# 1. IA Objectives

This document answers three questions for CareNexa's single-clinic V1:

1. **Where does every piece of functionality live?** — one home per feature, no duplicated screens.
2. **How does staff move through the system?** — Dashboard → Schedule → Client → Session → Documentation → Billing, without dead ends or redundant navigation.
3. **How is the complete client journey connected?** — Website → Interested Person → Booking → Intake → Client → Assessment → Treatment Plan → Session → Documentation → Goals/Outcomes → Billing → Follow-up (Blueprint §25), expressed as a navigable system rather than a diagram.

This is a **single-clinic product**. Multiple psychologists, multiple services, in-person and virtual care, and multiple clients are all in scope. Multi-clinic, multi-location, and multi-organization concepts are **not** — they are not designed, not previewed, and not present anywhere in this navigation, even as disabled or "future" menu items.

---

# 2. IA Principles

1. **One record, one home.** Every Client, Appointment, Treatment Plan, Invoice, etc. has exactly one owning module. Everywhere else it appears is a filtered view, never a copy. (Blueprint Principle 3 — One-Time Data Entry.)
2. **Global modules are worklists and libraries, not second editors.** Where a top-level module and the Client 360 both touch the same data, the global module shows cross-client work (queues, templates) and the Client 360 is where the record is actually authored.
3. **Navigation visibility is a UX layer, not the security boundary.** Hiding a menu is a convenience; the underlying data must be permission-checked independently of what the sidebar shows. (Blueprint Principle 7, §26–27.)
4. **A workflow stage is not a menu.** Lead → Client, Assessment → Outcome, Session → Note are movements through existing modules, not destinations of their own.
5. **A care mode is not a menu either.** Virtual vs. in-person is an attribute of an Appointment, not a parallel system — telehealth lives inside Schedule, not beside it.
6. **This is a single-clinic system, full stop.** No organization switcher, no multi-location picker, no tenant management, no clinic-level dashboard-of-dashboards — anywhere. Any structural decision that keeps the data model open to future growth is an internal, backend concern and has zero surface area in this IA.
7. **A tab is not a module.** Data scoped to one client (their notes, their balance) lives on a Client 360 tab, never promoted to top-level nav just because it matters.
8. **Therapy-first, not generic-medical.** Menu structure follows the Discover → Intake → Assess → Plan → Treat → Document → Measure → Communicate → Bill → Follow-up workflow (Blueprint §1), not a generic EHR menu shape borrowed from competitors.

---

# 3. User Roles

| Role | Core job | Primary daily modules |
|---|---|---|
| **Clinic Admin / Owner** | Runs the clinic: staff, services, finances, oversight | All modules, full Settings |
| **Psychologist / Therapist** | Delivers care: sessions, documentation, treatment planning | Dashboard, Schedule (incl. virtual sessions), Clients, Clinical Care |
| **Receptionist / Front Desk** | Keeps the clinic running operationally: booking, intake, first contact | Dashboard, Schedule, Clients (non-clinical), Intake & Leads, Communications |
| **Billing Staff** | Manages the clinic's money | Dashboard (financial), Billing, Reports (financial) |
| **Client / Patient** | Books, prepares for, and follows up on their own care | Client Portal (separate experience — §20), not the staff sidebar |

Each role's exact visibility is detailed in §21.

---

# 4. Final V1 Sidebar

The structure below reflects one change from the prior draft: **Telehealth is no longer a top-level menu** (see §28.14 for the reasoning). Every other item was re-checked this round and holds.

| Item | Verdict | Reasoning |
|---|---|---|
| Dashboard | **KEEP** | Blueprint §8.1; every internal role needs a role-scoped daily landing page. |
| Schedule | **KEEP, expanded** | Blueprint §9 core module; now also carries virtual-session monitoring (Waiting Room, Join, Today's Virtual Sessions) as part of the appointment lifecycle rather than a separate menu. |
| Clients | **KEEP** | Blueprint §12 names it "the central clinical and operational record." |
| Intake & Leads | **KEEP** | One combined module for the pre-client pipeline; splitting it into "Leads" and "Intake" would fragment a single front-desk task with no benefit at single-clinic volume. |
| Clinical Care | **KEEP, scope unchanged** | Cross-client worklist + template library only; client-specific clinical content stays in the Client Profile (§10). |
| Forms & Documents | **KEEP** | Blueprint §18; global library, templates, e-signature, and a reception-facing outstanding-forms queue. |
| Communications | **KEEP** | Blueprint §19; one inbox so messages aren't missed by being buried per-client. |
| ~~Telehealth~~ | **MERGE into Schedule** | A telehealth session has no existence beyond an Appointment with mode = Virtual (§15). A separate top-level menu for it was unnecessary weight — see §28.14. |
| Billing | **KEEP** | Blueprint §21, sized for one clinic, no insurance/claims. |
| Reports | **KEEP** | Blueprint §22, four practical categories, not an analytics suite. |
| Settings | **KEEP** | Blueprint §23, one clinic's configuration only. |

**Result: 10 top-level items**, down from 11 — one fewer menu with zero functionality lost, since every telehealth capability the Blueprint asks for (§20) is still reachable, now from inside Schedule.

```text
Dashboard
Schedule
Clients
Intake & Leads
Clinical Care
Forms & Documents
Communications
Billing
─────────────
Reports
Settings
```

---

# 5. Complete Navigation Tree

```text
CareNexa
│
├── Dashboard                          [primary nav — no submenu, single widget page]
│
├── Schedule                            [primary nav]
│   ├── Calendar (Day / Week / Month / Provider)     [secondary nav]
│   ├── Appointment Requests                          [secondary nav — queue]
│   ├── Virtual Sessions (Today / Waiting Room)         [secondary nav — filtered view, mode = Virtual]
│   └── Waitlist                                       [secondary nav — V1.1]
│       └── Appointment detail                         [contextual detail panel]
│           └── Check-in / Start Session / Join (if virtual) /
│               Cancel / Reschedule / Mode toggle        [contextual actions]
│
├── Clients                             [primary nav]
│   ├── Client List (filters: Active / Inactive / Discharged)  [secondary nav]
│   └── Client Profile (360°)                          [detail page — §8]
│       ├── Overview / Timeline / Appointments / Clinical Notes /
│       │   Assessments / Treatment Plan / Forms / Consent /
│       │   Documents / Messages / Billing              [tabs]
│       └── New Note / Assign Assessment / Book Appt /
│           Send Message / Send Form / Request Payment /
│           Change Client Status                          [contextual actions]
│
├── Intake & Leads                      [primary nav]
│   ├── Pipeline (by stage)                             [secondary nav]
│   └── Lead detail                                     [contextual detail panel]
│       └── Convert to Client                           [contextual action]
│
├── Clinical Care                       [primary nav]
│   ├── My Worklist                                     [secondary nav — therapist default]
│   ├── Clinical Notes (cross-client)                   [secondary nav]
│   ├── Assessments (Library / Assigned / Results)       [secondary nav]
│   ├── Treatment Plans (cross-client / Templates)        [secondary nav]
│   └── Risk & Safety (flagged clients)                   [secondary nav]
│
├── Forms & Documents                    [primary nav]
│   ├── Forms Library                                     [secondary nav]
│   ├── Documents                                         [secondary nav]
│   ├── Pending / Assigned                                [secondary nav — queue]
│   └── Templates & E-signature                            [secondary nav]
│
├── Communications                        [primary nav]
│   ├── Inbox                                              [secondary nav]
│   ├── History (SMS / Email)                               [secondary nav]
│   ├── Templates                                            [secondary nav]
│   └── Automation Rules                                       [secondary nav]
│
├── Billing                                  [primary nav]
│   ├── Invoices                                              [secondary nav]
│   ├── Payments / Transactions                                [secondary nav]
│   └── Outstanding Balances                                    [secondary nav]
│
├── Reports                                    [primary nav]
│   └── Operational / Clinical / Financial / Provider              [tabs on one page]
│
└── Settings                                     [primary nav]
    ├── Clinic Profile / Providers & Staff / Services /
    │   Availability / Appointment Settings / Notifications /
    │   Forms & Templates / Telehealth / Integrations /
    │   Security / Roles & Permissions                            [settings pages]
    └── My Settings (Therapist scope: availability, note template)  [personal settings pages]
```

Note: **Settings still has a Telehealth page** (vendor/session configuration) even though Telehealth has no top-level sidebar entry — configuration and daily-use navigation are different concerns, and moving the *destination* into Schedule doesn't remove the need to *configure* the vendor once, clinic-wide.

---

# 6. Dashboard IA

- **Purpose:** Daily operational + clinical overview — the "what needs my attention right now" screen (Blueprint §8.1).
- **Structure:** No submenu; one page of role-scoped widgets — Today's Sessions, Clinical Tasks, Patient Activity, Financial, Telehealth (upcoming virtual sessions / join shortcut).
- **Ownership:** Owns nothing; every widget is a read-only summary pulled from Schedule, Clinical Care, Intake & Leads, Billing.
- **Role variance:** Therapist sees Today's Sessions + Clinical Tasks + Telehealth widget; Receptionist sees Today's Sessions + Patient Activity; Billing Staff sees Financial only; Admin sees everything.

---

# 7. Schedule IA

- **Purpose:** Own the full appointment lifecycle: Requested → Pending → Confirmed → Checked In → In Session → Completed, with Cancelled / No-show / Rescheduled as alternate paths (Blueprint §9). Now also the single home for virtual-session operations.
- **Structure:** Calendar (Day/Week/Month/Provider view) as primary; Appointment Requests as a pending-confirmation queue; Virtual Sessions as a filtered view (Today's virtual appointments + a waiting-room monitor for reception); Waitlist (V1.1). Appointment detail opens as a contextual panel from the calendar, never a separate top-level destination.
- **Contextual actions on an appointment:** Check-in, Start Session (opens the linked Client Profile), Join (if mode = Virtual — opens the video call directly), Reschedule, Cancel, toggle In-person/Virtual.
- **Relationship to Client 360:** Client Profile > Appointments is a filtered view of this same Schedule data — never a second appointment record.
- **Relationship to Telehealth (as a capability, not a menu):** if mode = Virtual, "Join" launches the video session inline; the Virtual Sessions view is simply Schedule filtered to `mode = Virtual`, not a different data set.

---

# 8. Client 360 IA

**Change this round:** added a lightweight **Client Status** (Active / Inactive / Discharged) — the one genuine gap found in this review. The Blueprint's own end-to-end journey ends in "Follow-up" (§25), which implies a client's active-care period eventually closes; without a status field there was no way to represent that, and reception/admin had no way to filter a growing client list into who's currently in active care. This is a field on Overview and a filter on Client List — not a new module, not a new tab.

**Everything else carries forward unchanged** from the prior draft — Goals & Outcomes stays merged into Treatment Plan (progress is a view of the plan, not an independent record); Risk & Safety stays as an Overview banner + cross-caseload Clinical Care queue rather than a 12th tab; Diagnoses stay summarized on Overview and edited inside Treatment Plan.

**Final tab set:**

```text
Client Profile
├── Overview        — demographics, client status (Active/Inactive/Discharged),
│                      assigned therapist, active diagnoses, active treatment
│                      plan summary, next appointment, risk/safety banner (if active)
├── Timeline         — full chronological activity feed
├── Appointments     — history + upcoming
├── Clinical Notes   — session documentation; create/sign
├── Assessments      — assigned / pending / completed / trend charts
├── Treatment Plan   — sub-views: Plan | Progress & Outcomes
├── Forms            — intake, questionnaires, custom forms
├── Consent          — signed consent documents, versions, status
├── Documents        — uploaded files
├── Messages         — secure messages with this client
└── Billing          — invoices, payments, balance (this client only)
```

**What each role sees (unchanged):**
- **Therapist:** Lands on Overview — status, risk banner, active plan, next appointment all visible immediately. Full access to every clinical tab. Billing tab is read-only (balance only).
- **Receptionist:** Overview (demographic/scheduling/status fields only, no clinical summary), Appointments, Forms (status only), Consent (status only), Messages, Billing. **Clinical Notes, Assessments, and Treatment Plan tabs are hidden entirely**, not just read-only (Blueprint §27).
- **Billing Staff:** Overview (name/contact/status/balance only), Appointments (read-only), Billing (full). All clinical tabs hidden.

---

# 9. Intake & Lead IA

Unchanged from the prior draft — re-checked this round and still the right call for a single clinic.

```text
New Inquiry → Contacted → Interested → Appointment Requested → Booked → Intake Started → Converted to Client
```

| Stage | Managed in | Notes |
|---|---|---|
| New Inquiry / Contacted / Interested | Intake & Leads > Pipeline | Created from the website form or manual reception entry |
| Appointment Requested / Booked | Intake & Leads ⇄ Schedule | Same underlying Appointment record, shown in both places |
| Intake Started | Intake & Leads shows rollup status; **Forms & Documents owns the actual form data** | Intake & Leads never stores form content itself |
| Converted to Client | Clients | The Lead is **promoted**, not copied — the contact becomes a Client record (status = Active); the Lead entry becomes historical "Source" metadata on the new Client's Overview |

**Why one module, and why not folded into Clients:** a Lead is incomplete, unqualified contact data — putting it in the same list clinicians treat as their trusted clinical record would undermine the Client 360 as "the" system of record (Blueprint §12). Splitting it into two separate menus ("Leads" and "Intake") would fragment one continuous front-desk task with no benefit at single-clinic volume.

---

# 10. Clinical Care IA

Unchanged — this remains the key boundary decision in the document, re-verified this round with no new duplication found.

| Content | Authored in (source of truth) | Also visible in (read/aggregate) |
|---|---|---|
| A client's clinical note (SOAP/DAP/BIRP/GIRP/Narrative/Custom) | Client Profile > Clinical Notes | Clinical Care > Clinical Notes (cross-client list, links back) |
| Note templates | Settings > Forms & Templates | Clinical Care (selectable when writing a note) |
| Diagnoses | Client Profile > Treatment Plan | Client Profile > Overview (summary) |
| A client's treatment plan | Client Profile > Treatment Plan | Clinical Care > Treatment Plans (cross-client list) |
| Treatment plan templates | Settings > Forms & Templates | Clinical Care > Treatment Plans > Templates |
| Goals / objectives / interventions | Client Profile > Treatment Plan (defined) | Client Profile > Treatment Plan > Progress & Outcomes (tracked) |
| Risk / safety documentation | Client Profile > Clinical Notes + Overview banner | Clinical Care > Risk & Safety (cross-client flagged list) |
| Clinical timeline | Client Profile > Timeline | — |

**Rule applied:** if the data belongs to one client, it's authored in the Client Profile. If it spans the caseload (a worklist, a template, a flagged-clients view), it lives in Clinical Care. Clinical Care never opens its own "edit Client X's note" screen distinct from the one inside that client's profile. Clinical Care's default landing (**My Worklist**) is what a therapist sees first when they need to know what's outstanding across their whole caseload.

---

# 11. Assessment IA

Unchanged.

```text
Clinical Care > Assessments                    Client Profile > Assessments
├── Library (instruments, incl. custom)         ├── Assigned to this client
├── Assigned (cross-client outstanding)          ├── Completed, with scores
├── Pending                                       └── Historical trend (e.g., PHQ-9 over time)
└── Completed / Results (cross-client)
```

**Connection to the rest of the journey:**
```text
Client → Treatment Plan (a goal may target "reduce PHQ-9 to <10")
   → Assessment assigned, tied to that goal
      → completed → auto-scored where applicable
         → feeds Treatment Plan > Progress & Outcomes trend
            → referenced from the next Clinical Note
               → aggregated in Reports > Clinical
```
The instrument **Library** is global (owned by Clinical Care/Settings); every **result** belongs to one client and lives on their Assessments tab. Clinical Care's Assessments view is a cross-client roll-up of the same results, not a second data set.

---

# 12. Treatment Plan IA

Unchanged.

```text
Diagnosis → Problem → Goal → Objective → Intervention → Measurement → Progress → Review
```

Lives on **Client Profile > Treatment Plan**, with two sub-views:
- **Plan** — diagnoses, problems, goals, objectives, interventions, target/review dates, provider sign-off.
- **Progress & Outcomes** — goal status over time, linked assessment score trends, session milestones, plan revision history.

**Reached from two places, one editor:**
- **Client Profile** — the complete authoring surface.
- **Clinical Care > Treatment Plans** — a cross-client list ("plans due for review this week") that deep-links into the same Client Profile tab; it never opens its own inline editor. Templates are configured once, in Settings > Forms & Templates, referenced from both entry points.

---

# 13. Forms & Documents IA

Unchanged.

| Type | Definition | Home |
|---|---|---|
| **Clinical Notes** | Provider's therapeutic documentation of a session | Clinical Care / Client Profile — **not** here |
| **Assessments** | Structured, scored clinical instruments | Clinical Care / Client Profile — **not** here |
| **Forms** | Structured data collected from/about the client: Intake, Consent, Questionnaires, Custom forms | Forms & Documents (library/templates) + Client Profile (responses) |
| **Documents** | Unstructured files: uploads, shared PDFs | Forms & Documents (clinic templates) + Client Profile > Documents (client files) |

**Distinction rule:** provider's clinical judgment/narrative → Clinical Note. Structured data collected via a template → Form. A scored clinical instrument → Assessment (its own module, §11, not filed under Forms despite being form-shaped). A plain file with no structured fields → Document.

Forms & Documents owns templates, the library, e-signature configuration, and a **Pending/Assigned** cross-client queue so reception can chase outstanding intake/consent without opening every client individually. Responses always render inside the owning client's profile.

---

# 14. Communication IA

Unchanged.

- **Global Inbox** (Communications module) — every conversation, every channel, every client; what reception/admin need for clinic-wide visibility.
- **Client-specific** (Client Profile > Messages) — the same threads, filtered to one client; what a therapist sees by default.
- **Appointment-specific** — not a separate view; reminder/confirmation status shows as a small indicator on the appointment, linking into the real thread.

**Decision: combination**, with Communications as the single source of truth and Client Profile/Appointment as filtered/linked views — never a second inbox.

Templates and automation (booking confirmation, 24h reminder, cancellation notice, no-show follow-up, incomplete-form reminder — Blueprint §19) are configured once in Communications > Automation Rules, triggered by Schedule/Forms events.

---

# 15. Telehealth (Merged into Schedule)

**This is the primary structural change in this review round.** Telehealth is no longer a top-level menu — see §28.14 for the full comparison of why it was kept separate before and why that no longer holds up. The underlying workflow is unchanged:

```text
Appointment (mode = Virtual)
   → Waiting Room → Video Consultation
      → Clinical Note (same Client Profile > Clinical Notes as any session)
         → Billing (same Client Profile > Billing / global Billing module)
```

A "telehealth session" is not an independent record — it's an Appointment with mode = Virtual plus join/duration metadata. What used to be a separate Telehealth module (Today's Virtual Sessions, Waiting Room, Session History) is now the **Virtual Sessions** view inside Schedule (§7) — same data, same actions, one less place to look. Vendor/session configuration remains in Settings > Telehealth (§5), since configuring a capability once, clinic-wide, is a different concern from where staff go to use it day to day.

---

# 16. Billing IA

Unchanged. V1 scope exactly matches Blueprint §21: **Invoices, Payments/Transactions, Outstanding Balances**, connected to Appointments/Services. Services/price list live in Settings > Services (referenced, not duplicated). Client Profile > Billing is a filtered, single-client view of this module.

**Explicitly future scope, not shown anywhere in V1 (not even as disabled menu items):** Insurance, Claims, Superbills, Payment plans, advanced revenue-cycle management (Blueprint §21, §30).

---

# 17. Reports IA

Unchanged. One destination, four categories (tabs on a single page, not four menus):

| Category | V1 Reports |
|---|---|
| **Operational** | Appointment volume, cancellation rate, no-show rate, new clients, returning clients |
| **Clinical** | Assessment trends, treatment-plan status, goals/outcomes |
| **Financial** | Revenue, payments, outstanding balances |
| **Provider** | Appointment volume, completed sessions, documentation pending |

---

# 18. Settings IA

| Setting | Scope | Edited by |
|---|---|---|
| Clinic Profile | Clinic-wide | Admin |
| Providers & Staff | Clinic-wide roster | Admin |
| Services | Clinic-wide | Admin |
| Availability | Clinic-wide defaults + per-provider overrides | Admin (defaults), Therapist (own schedule) |
| Appointment Settings | Clinic-wide (types, buffers, cancellation policy) | Admin |
| Notifications | Clinic-wide (reminder timing/channels) | Admin |
| Forms & Templates | Clinic-wide (note templates, plan templates, form builder) | Admin |
| Telehealth | Clinic-wide (vendor/session configuration — used by Schedule's Virtual Sessions view) | Admin |
| Integrations | Clinic-wide | Admin |
| Security | Clinic-wide (audit log, session policy, MFA) | Admin |
| Roles & Permissions | Clinic-wide | Admin |

Therapists get a separate, reduced **"My Settings"** scope (own availability, own default note template) — a distinct, smaller page, not read-only access to the full Settings module. Everything else in Settings is invisible to non-admin roles, not just locked.

---

# 19. Website Booking IA

Unchanged.

```text
Website
   → Book Appointment
      → Select Service
         → Select Therapist
            → Select Appointment Type
               → Select Date
                  → Select Available Time
                     → Enter Contact Details
                        → Confirmation
                           → Intake (forms sent; booking is held without requiring completion first)
```

This flow creates a **Lead**, not a Client — submitting contact details creates/updates an Intake & Leads pipeline entry at "Appointment Requested," which becomes "Booked" the moment a Schedule record exists.

**Where this surfaces inside the clinic application:**

| Website stage | Staff-side location |
|---|---|
| Form submitted, no booking yet | Intake & Leads > Pipeline, "New Inquiry" |
| Request pending confirmation | Schedule > Appointment Requests **and** Intake & Leads pipeline (same record, two views) |
| Confirmed appointment | Schedule > Calendar |
| Intake in progress | Intake & Leads shows rollup status; Forms & Documents owns the form data |
| Converted client | Clients > Client List (status = Active); Lead entry becomes "Source" metadata on Overview |

---

# 20. Client Portal IA

Unchanged. The authenticated, client-facing experience — structurally separate from the staff sidebar, connected to the same underlying records.

```text
Client Portal (after Verify/Login)
├── Home / Upcoming Appointments
├── Book / Reschedule
│     → Select Service → Select Therapist → Select Slot → Confirm
│       (skips the Lead pipeline entirely — this is already a Client)
├── Forms                — complete assigned intake/consent/questionnaires
├── Documents             — view shared documents, upload requested files
├── Messages              — secure messaging with their care team
├── Payments               — view balance, pay invoices
└── Telehealth              — join their own upcoming virtual session
```

The Portal keeps its own "Telehealth" destination even though the staff sidebar merged it into Schedule — the portal is a small, single-purpose surface where a client only ever needs to join *their own* session, so the top-level-menu-count pressure that applied to the staff sidebar (juggling ten modules across five roles) doesn't apply here.

**Existing-client booking flow:**
```text
Website / Client Portal → Verify/Login → Select Service → Select Therapist → Select Slot → Confirm
```
No Lead record is created; the booking attaches directly to the existing Client and appears immediately in staff-side Schedule.

---

# 21. Role-Based Navigation

| Role | Visible top-level menus | Hidden | Key restrictions |
|---|---|---|---|
| **Clinic Admin** | All 10 | None | Full access; only role with full Settings |
| **Psychologist / Therapist** | Dashboard, Schedule (incl. Virtual Sessions), Clients, Clinical Care, Forms & Documents, Communications, Reports (own stats), Settings (My Settings only) | Intake & Leads, Billing (full) | Client Profile Billing tab is read-only balance only |
| **Receptionist** | Dashboard, Schedule (incl. Virtual Sessions/Waiting Room monitor), Clients (non-clinical tabs), Intake & Leads, Forms & Documents (status only), Communications, Billing (create/view, take payment), Reports (operational only) | Clinical Care, Settings (except own profile) | Clinical Notes/Assessments/Treatment Plan tabs hidden entirely on Client Profile |
| **Billing Staff** | Dashboard (financial), Schedule (read-only), Clients (minimal fields), Billing (full), Reports (financial only) | Clinical Care, Intake & Leads, Communications (unless billing-related), Settings | All clinical tabs hidden on Client Profile |
| **Client / Patient** | Client Portal only (§20) — not this sidebar at all | Everything internal-staff | Fully separate experience |

### Therapist daily workflow
```text
Dashboard → today's appointment card
   → Schedule > Appointment detail → Start Session (or Join, if virtual)
      → Client Profile (Overview + Clinical History visible immediately)
         → New Clinical Note (pre-linked to this appointment, template pre-selected)
            → references Treatment Plan goals/interventions inline (no navigation away)
               → Sign & Lock → Appointment marked Completed
                  → optional: mark billable
```
Shortcuts that avoid duplicate navigation: "New Note" from both the Appointment card and Dashboard's Clinical Tasks widget opens the **same** Client Profile > Clinical Notes create screen. "Join" from Dashboard, Schedule's appointment card, and Schedule > Virtual Sessions all open the **same** session. Clinical Care > My Worklist items link into the relevant Client Profile tab rather than offering a second inline editor.

### Receptionist daily workflow
```text
Dashboard (Patient Activity widget: new inquiries, new bookings, reschedule requests)
   → Intake & Leads > Pipeline (triage new inquiries, move stage, convert)
   → Schedule (book, confirm, reschedule, cancel, check clients in, monitor virtual waiting room)
   → Client (non-clinical tabs: register new client, update contact info, check intake status)
   → Communications (send reminders, respond to messages)
   → Billing (take payment at check-out)
```
No path in this workflow ever surfaces Clinical Notes, Assessments, or Treatment Plan content — those tabs are absent, not greyed out, on every Client Profile a receptionist opens.

### Billing staff daily workflow
```text
Dashboard (Financial widget: outstanding payments, today's payments)
   → Billing > Outstanding Balances (work the collections queue)
   → Client (minimal identity fields only) → Billing tab (full invoice/payment detail)
   → Reports > Financial (revenue, payment completion)
```
Billing Staff never see Schedule beyond read-only context, and never see any clinical module.

---

# 22. Global Search

| Entity | Admin | Therapist | Receptionist | Billing Staff |
|---|---|---|---|---|
| Clients | Full | Assigned only | Full (non-clinical fields) | Full (billing-relevant fields) |
| Appointments | Full | Own | Full | Full (read-only) |
| Leads | Full | Not surfaced | Full | Not surfaced |
| Providers | Full | Full (directory) | Full (directory) | Full (directory) |
| Services | Full | Full | Full | Full |
| Clinical documents | Full | Assigned clients only | **Not searchable** | **Not searchable** |
| Invoices | Full | Not surfaced | View | Full |

Clinical content is deliberately excluded from Receptionist/Billing search results — surfacing note snippets to non-clinical roles through a generic search box would bypass the Client Profile's tab-level access controls (Blueprint §27).

---

# 23. Notification Center

| Category | In-app | Email/SMS | Urgency |
|---|---|---|---|
| Appointment (booked, reminder, cancelled, rescheduled) | Yes | Yes | Normal |
| Intake (form assigned/completed/overdue) | Yes | Yes (client); in-app only (staff) | Normal |
| Clinical task (note unsigned, plan due, assessment due) | Yes | Optional digest | Normal, escalates if overdue |
| Risk/Safety flag | Yes, persistent until acknowledged | Yes, immediate | **Immediate** |
| Billing (payment received/failed, overdue balance) | Yes | Yes (client); in-app (Billing Staff) | Normal |
| Communication (new secure message) | Yes | Optional email fallback if unread | Normal |
| Security (new-device login, permission change, failed logins) | Yes | Yes | High |

A single dropdown/panel filterable by category — not a top-level menu, since it's a cross-cutting overlay rather than a workflow destination.

---

# 24. Global vs Contextual Features

| Feature | Global Module | Client Context | Appointment Context | Both |
|---|---|---|---|---|
| Clinical Notes | Clinical Care (worklist/list) | ✓ (authored here) | Linked (created from an appointment) | ✓ |
| Assessments | Clinical Care (library/results) | ✓ (client's results) | — | ✓ |
| Treatment Plans | Clinical Care (list/templates) | ✓ (authored here) | — | ✓ |
| Forms | Forms & Documents (library) | ✓ (responses) | — | ✓ |
| Documents | Forms & Documents (templates) | ✓ (client files) | — | ✓ |
| Messages | Communications (inbox) | ✓ (filtered view) | Reminder status only | ✓ |
| Billing | Billing (ledger) | ✓ (client balance/invoices) | Linked (session → invoice line) | ✓ |
| Telehealth | **Schedule** (Virtual Sessions view) | — | ✓ (mode of an appointment) | Appointment-only |
| Appointments | Schedule (source of truth) | ✓ (client's list) | — | ✓ |
| Consent | Forms & Documents (templates) | ✓ (signed status/versions) | — | ✓ |

Every row has exactly one **editing** surface — every other appearance is a filtered view or a trigger, never a duplicate. (Telehealth's "Global Module" column changed from a standalone Telehealth module to Schedule this round, reflecting the merge in §15.)

---

# 25. Cross-Module Relationships

```text
Website → Lead → Appointment → Client → Intake(Forms) → Assessment
   → Treatment Plan → Therapy Session(Appointment) → Clinical Note
   → Outcome(within Treatment Plan) → Billing → Follow-up(Communications)
```

| Module | Role in the journey |
|---|---|
| Intake & Leads | Captures interest before it's trustworthy clinical data; bridges Website → Schedule |
| Schedule | Owns every Appointment, in-person or virtual, from request to completion — including virtual-session operations |
| Clients | The permanent record everything else attaches to; carries the client's status through to Follow-up |
| Forms & Documents | Captures structured intake/consent data and files, feeding the Client record |
| Clinical Care | Cross-caseload worklist/library; where a therapist's day-to-day clinical work is organized |
| (within Client Profile) Assessments / Treatment Plan / Clinical Notes | Where the actual clinical record for one client is authored |
| Communications | Keeps every channel and every automated touchpoint tied back to the Client |
| Billing | Converts completed Appointments/Services into invoices and payments |
| Reports | Reads across all of the above; owns nothing |

**Source of truth per entity:**

| Entity | Source of truth |
|---|---|
| Lead | Intake & Leads |
| Appointment (incl. virtual-session metadata) | Schedule |
| Client (incl. status) | Clients |
| Form response / Intake data | Forms & Documents (attached to Client) |
| Assessment result | Client Profile > Assessments |
| Treatment Plan (incl. Goals/Objectives) | Client Profile > Treatment Plan |
| Clinical Note | Client Profile > Clinical Notes |
| Invoice / Payment | Billing (attached to Client + Appointment) |
| Message | Communications (attached to Client, optional Appointment) |
| Consent record | Forms & Documents (attached to Client) |

---

# 26. IA Risks / Open Decisions

**Resolved within this document:**
- Clinical Care vs. Client 360 overlap → worklist/library vs. authoring surface (§10).
- Telehealth as a standalone menu → merged into Schedule; no functionality lost (§15, §28.14).
- Goals & Outcomes as a separate tab → merged into Treatment Plan (§8).
- Risk & Safety as a separate tab → Overview banner + cross-caseload Clinical Care queue instead (§8).
- Leads vs. Intake as two menus → combined into one module, scoped to reception (§9).
- No client status/lifecycle closure → added a lightweight Active/Inactive/Discharged field (§8).

**Genuinely requiring product-owner input** (unchanged from prior review — still open, still not answerable from the Blueprint):

1. **Cross-therapist visibility.** Can Therapist A see Therapist B's clients/notes (coverage, shared caseload), or is every therapist strictly siloed to their own assigned clients?
2. **Group / couples / family sessions.** The Blueprint lists Couples/Family Therapy and Group appointments as services, but Client 360 is built around one individual. Does a family session's Clinical Note attach to multiple Client records, or is a higher-level "Case" concept needed above the individual client?
3. **Re-intake for existing clients.** Is "Intake" strictly a one-time, pre-conversion event, or can an existing client be assigned new intake-style forms later (annual consent renewal, updated contact info)?
4. **Multiple concurrent treatment plans per client.** If a client sees two different therapists for two different services, does the Client 360 support multiple active Treatment Plans at once, or is one plan per client assumed?
5. **Reception visibility into risk flags.** Default permissions hide all clinical content from Receptionist — should Receptionist see a non-clinical "safety flag present" indicator without detail?
6. **V1 payer-type field.** Should the Client Billing tab capture a basic self-pay/insurance-pending field now, or should V1 carry zero insurance-adjacent fields until that module actually exists?
7. **Discharge workflow detail.** This review added a Client Status field (§8) to close the gap left by having no lifecycle terminus — but whether "Discharged" requires anything more structured (a discharge summary document, a required final note, an automatic Portal access change) is a clinical-process decision the Blueprint doesn't specify.

---

# 27. Final Recommended Navigation

```text
Dashboard
Schedule
Clients
Intake & Leads
Clinical Care
Forms & Documents
Communications
Billing
─────────────────  (visual separator — daily workflow vs. insight/admin)
Reports
Settings
```

All 10 items are Blueprint-grounded (§4). Overlaps between Clinical Care/Clients and Intake & Leads/Clients are resolved by scope (§9, §10), not by removing functionality. Telehealth is fully supported as a capability of Schedule rather than a separate destination (§15). No organization, location, or tenant concept appears anywhere in this tree.

---

# 28. Final V1 Review (20-Point Checklist)

| # | Area | Verdict | Reasoning |
|---|---|---|---|
| 1 | Unnecessary top-level menus | **MODIFY** | Telehealth merged into Schedule — 11 items → 10. Every remaining item re-checked and still has distinct, Blueprint-grounded daily use; none of the other 10 duplicate another's job. |
| 2 | Duplicate functionality | **KEEP** | Re-inspected: Clinical Care remains worklist/library only, Goals stays merged into Treatment Plan, every Client 360 tab that also appears in a global module (Billing, Messages, Appointments) is a filtered view, not a second ledger. No new duplication found. |
| 3 | Missing psychology/therapy-specific workflows | **ADD** | Client Status (Active/Inactive/Discharged) added to Overview + Client List filter — the one real gap, since the Blueprint's own journey implies a terminus ("Follow-up," §25) that the IA had no way to represent. No other gap found that isn't already covered by an Open Question. |
| 4 | Therapist workflow | **MODIFY** | Unchanged in substance; "Join Session" now fires from the Schedule appointment card instead of a separate Telehealth destination (§21). |
| 5 | Receptionist workflow | **MODIFY** | Waiting-room monitoring moved from a standalone Telehealth menu into Schedule > Virtual Sessions (§21); everything else unchanged. |
| 6 | Billing workflow | **KEEP** | No issues found; matches Blueprint §21 exactly. |
| 7 | Website → Inquiry → Appointment → Intake → Client journey | **KEEP** | Unaffected by this review; already resolved in §9/§19. |
| 8 | Client 360 structure | **MODIFY** | Client Status added to Overview (see #3); tab set otherwise unchanged from the prior, already-justified 11-tab structure. |
| 9 | Clinical Care structure | **KEEP** | Worklist/library boundary re-verified; no drift found. |
| 10 | Assessment structure | **KEEP** | No issues found. |
| 11 | Treatment Plan structure | **KEEP** | No issues found. |
| 12 | Forms & Documents | **KEEP** | No issues found; Clinical Notes vs. Forms vs. Documents vs. Assessments boundary still holds. |
| 13 | Communication | **KEEP** | Global inbox + filtered client/appointment views still the right shape. |
| 14 | Telehealth | **MERGE** | The core finding this round. A telehealth session has no existence beyond an Appointment with mode = Virtual (§15) — the prior document already said this, but still gave it a top-level menu "for the waiting-room use case." That use case is fully served by a filtered Schedule view; keeping a whole sidebar entry for it contradicted the document's own reasoning and added a menu a single clinic doesn't need. |
| 15 | Billing | **KEEP** | (Same finding as #6 — Billing appears twice in the review checklist; no new issue on second pass.) |
| 16 | Reports | **KEEP** | Four categories on one page remains appropriately sized for one clinic. |
| 17 | Settings | **KEEP** | Telehealth retained as a Settings page (vendor config) even though it lost its top-level nav entry — configuration and daily navigation are different concerns. |
| 18 | Role-based navigation | **MODIFY** | Updated to remove standalone Telehealth references; Receptionist and Therapist rows now show virtual-session access folded into Schedule (§21). |
| 19 | Client portal | **KEEP** | The Portal keeps its own small "Telehealth" destination for clients — the top-level-menu-count pressure that justified merging it on the staff side doesn't apply to a five-item client-facing portal. |
| 20 | Global vs. contextual features | **MODIFY** | Telehealth row's "Global Module" column updated from a standalone module to Schedule (§24), reflecting the merge. |

---

## FINAL V1 SIDEBAR

```text
Dashboard
Schedule
Clients
Intake & Leads
Clinical Care
Forms & Documents
Communications
Billing
Reports
Settings
```

---

## FINAL MODULE TREE

```text
CareNexa
├── Dashboard
├── Schedule
│   ├── Calendar (Day / Week / Month / Provider)
│   ├── Appointment Requests
│   ├── Virtual Sessions (Today / Waiting Room)
│   └── Waitlist (V1.1)
├── Clients
│   ├── Client List (Active / Inactive / Discharged)
│   └── Client Profile
│       └── Overview, Timeline, Appointments, Clinical Notes, Assessments,
│           Treatment Plan (Plan | Progress & Outcomes), Forms, Consent,
│           Documents, Messages, Billing
├── Intake & Leads
│   ├── Pipeline
│   └── Lead Detail
├── Clinical Care
│   ├── My Worklist
│   ├── Clinical Notes
│   ├── Assessments (Library / Assigned / Results)
│   ├── Treatment Plans (list / Templates)
│   └── Risk & Safety
├── Forms & Documents
│   ├── Forms Library
│   ├── Documents
│   ├── Pending / Assigned
│   └── Templates & E-signature
├── Communications
│   ├── Inbox
│   ├── History
│   ├── Templates
│   └── Automation Rules
├── Billing
│   ├── Invoices
│   ├── Payments / Transactions
│   └── Outstanding Balances
├── Reports
│   └── Operational / Clinical / Financial / Provider
└── Settings
    ├── Clinic Profile, Providers & Staff, Services, Availability,
    │   Appointment Settings, Notifications, Forms & Templates,
    │   Telehealth, Integrations, Security, Roles & Permissions
    └── My Settings (Therapist: availability, note template)
```

---

## IMPORTANT IA DECISIONS

1. **Telehealth merged into Schedule** — the single biggest change this round. It was never an independent record (an Appointment with mode = Virtual, plus join metadata); giving it a top-level menu duplicated Schedule's job. Removing it drops the sidebar from 11 to 10 items with zero functionality lost.
2. **Client Status (Active / Inactive / Discharged) added** to Client Overview and as a Client List filter — the one genuine missing therapy-specific workflow, closing the gap between the Blueprint's journey (which ends in "Follow-up") and a Client 360 that previously had no way to represent a client's care as concluded.
3. **Clinical Care remains worklist/library only** — re-verified, not re-litigated. All client-specific clinical content is authored exclusively inside the Client Profile.
4. **Intake & Leads remains one combined module** — re-verified. Splitting it would fragment a single front-desk task with no benefit at single-clinic scale.
5. **No insurance/claims/superbill features anywhere in V1** — unchanged, per Blueprint §31.
6. **No organization/location/tenant concept anywhere in this IA** — unchanged; strictly internal/backend if it exists at all.
7. **Settings keeps a Telehealth configuration page** even without a top-level Telehealth menu — configuring a capability once is separate from where staff go to use it.
8. **Navigation visibility always sits on top of a real permission check** — hidden menus are a UX convenience, never the actual access-control mechanism (Blueprint §26–27).

---

## OPEN QUESTIONS

Genuine product decisions that cannot be determined from the Product Blueprint — required before the database schema stage:

1. Can therapists see other therapists' clients/notes, or is caseload strictly siloed per provider?
2. How should group/couples/family sessions attach to individual Client records — multi-client-linked notes, or a Case/Family Unit concept above the individual client?
3. Is "Intake" strictly a one-time pre-client event, or can existing clients receive new intake-style forms later?
4. Can a single client have multiple concurrent Treatment Plans, or is one plan per client assumed?
5. Should Receptionist see a non-clinical "safety flag present" indicator, or should risk/safety stay fully invisible outside clinical roles?
6. Should V1 Billing capture a basic payer-type field now, even though insurance processing itself is future scope?
7. Does "Discharged" client status require any additional structured workflow (discharge summary, mandatory final note, automatic Portal access change), or is a status field alone sufficient for V1?

---

## Consistency Check Against `01-product-blueprint.md`

Every Core Product Module (Blueprint §8–§23) still has an explicit, non-duplicated home after this review's changes. Telehealth's capabilities (Blueprint §20) are fully preserved — appointment mode toggle, waiting room, join, session-to-note-to-billing chain — just accessed through Schedule instead of a dedicated menu, which better matches the Blueprint's own instruction not to treat video as an isolated product. The new Client Status field directly supports the Blueprint's stated end-to-end journey (§25, ending in Follow-up) without introducing any concept the Blueprint didn't already imply. No organization/location/tenant concept was introduced. The Permission Philosophy (§26–27) is applied consistently across the updated Role-Based Navigation (§21).

**Result: fully aligned, and simpler than the prior draft.** The seven Open Questions are genuine Blueprint gaps, not contradictions introduced by this IA.

---

**IA FINALIZED FOR V1 SINGLE-CLINIC CARENEXA**
