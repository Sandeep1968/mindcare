# CareNexa — Wireframe Specification

## Document Status
Finalized for HTML/CSS Prototype — Product Owner decisions applied

## Source Documents
- `01-product-blueprint.md`
- `02-information-architecture.md`

## Locked Product Decisions
1. Therapists can access other therapists' clients only when permission allows it.
2. Individual, Couples, Family, and Group Therapy are supported.
3. Clients can have multiple intake cycles/re-intakes.
4. Multiple treatment plans are supported, but only relevant plans should be active.
5. Risk/Safety uses restricted visibility with an appropriate safety indicator for authorized workflows.
6. V1 supports basic payer type information only (Self-Pay / Insurance / Other) — no insurance claims system.

## Wireframe Principles
Extremely user-friendly · Therapy-first · Simple · Fast to understand · Low cognitive load · Patient/client friendly · Therapist workflow focused · Reception workflow focused · Billing workflow focused · Accessible · Responsive · HIPAA-aware · Original in UX structure · Suitable for a US psychology/therapy clinic. No new top-level menus beyond the approved IA (`02-information-architecture.md`). No screen invents functionality outside the approved IA's module boundaries.

---

# 0. Shared UX Pattern Library

Referenced throughout by ID (e.g., "Loading: L1") instead of re-describing identical behavior on every one of the 123 screens. A screen only spells out a state in full when its behavior deviates from the shared pattern.

### 0.1 Page Patterns
| ID | Pattern | Used for |
|---|---|---|
| P-LIST | List/Card list | Leads, Documents, Templates |
| P-TABLE | Data table | Clients, Invoices, Payments |
| P-CAL | Calendar | Schedule |
| P-DETAIL | Detail page (tabbed) | Client 360, Invoice Detail |
| P-FORM | Form (single page) | Create Client, Create Invoice |
| P-WIZARD | Multi-step form | Booking, Create Appointment |
| P-TIMELINE | Chronological feed | Client Timeline, Communication History |
| P-WORKLIST | Task queue | Clinical Care Worklist, Intake Pending |
| P-MODAL | Overlay, blocking | Confirmations, quick actions |
| P-DRAWER | Overlay, non-blocking, side panel | Appointment detail from Calendar, quick preview |
| P-EMPTY | Dedicated empty/zero-state screen | First-run states |
| P-CONFIRM | Confirmation/success screen | Booking Confirmation, Payment Success |

### 0.2 Loading
- **L1 (skeleton):** Layout-shaped grey placeholders for initial page/data load >300ms. Default for lists, tables, detail pages.
- **L2 (inline spinner):** Small spinner inside a button or component for sub-second actions (save, submit) — button disables and shows spinner, label changes to present-participle ("Saving…").
- **L3 (progressive):** Calendar/worklist loads visible viewport first, background-fills the rest.

### 0.3 Empty
- **E1 (first-use, actionable):** Short line icon (not photographic illustration) + one-sentence explanation + primary CTA that resolves the emptiness (e.g., "No clients yet" → "Add Client").
- **E2 (filtered-to-empty):** "No results match your filters" + "Clear filters" action. Distinguished from E1 so users don't think the whole list is empty.
- **E3 (nothing-to-do, positive):** For worklists/queues — "You're caught up" framing, no CTA needed (this is a good state, not a problem to solve).

### 0.4 Error
- **ERR1 (system/network):** Inline banner at top of the content region, plain-language message ("Something went wrong loading this page"), Retry action. Never shows raw error codes or stack traces.
- **ERR2 (validation):** Field-level inline messages under the offending field; form does not submit; focus moves to the first invalid field; a summary banner appears only when ≥3 fields are invalid.
- **ERR3 (permission/blocked):** Replaces the content region with "You don't have access to this" + link back to the nearest permitted screen. No partial data is shown before the block renders.
- **ERR4 (conflict):** For race conditions (slot taken, record changed elsewhere) — explains what changed and offers the corrected options, never a silent failure.

### 0.5 Success
- **S1 (inline/toast):** Auto-dismissing, non-blocking confirmation for routine saves ("Note saved").
- **S2 (dedicated confirmation screen):** For high-stakes or multi-step completions (booking, payment, note sign-off) — a full confirmation state with a summary and clear next step, not just a toast.

### 0.6 Confirmation Dialogs
- **C1:** Modal, used only for destructive/irreversible or high-consequence actions (cancel appointment, delete document, discharge client, sign & lock a note). States the specific consequence in plain language (not "Are you sure?" alone) and requires an explicit, specific confirm label ("Cancel Appointment," not "OK").
- **C2 (unsaved changes):** Triggered on navigation-away with unsaved edits. Options: Discard, Keep Editing, Save & Leave (where save is valid mid-flow).

### 0.7 Search / Filter / Sort / Pagination
- Standard control bar sits directly above the list/table it governs. Filters persist in the URL/session so back-navigation preserves state. Sort via column-header click (tables) or an explicit sort dropdown (card lists). Structured lists (Clients, Invoices) use page-based pagination with a page-size selector; chronological feeds (Timeline, Inbox, History) use infinite scroll / "Load more."

### 0.8 Permission-Restricted Content
- **PR1 (hidden):** Default behavior — a menu item, tab, or section a role can't access is simply absent, never greyed out or blurred (a locked-but-visible element implies data exists and invites probing).
- **PR2 (reduced view):** Where a role has partial access (e.g., Receptionist on Client Overview), the screen renders a smaller field set as its own complete-feeling view, not a redacted version of the full view.
- **PR3 (indicator-only):** Where policy allows awareness without detail (e.g., the Risk/Safety indicator for Reception at check-in — Locked Decision 5), a non-clinical flag/icon is shown with no underlying clinical text accessible from it.

### 0.9 Responsive Breakpoints
- **Desktop (≥1024px):** Full multi-column layouts, persistent left sidebar.
- **Tablet (768–1023px):** Sidebar collapses to an icon rail; detail pages go single-column; tables gain horizontal scroll or convert to stacked cards where scroll is impractical.
- **Mobile (<768px):** Bottom nav or hamburger menu; single column throughout; wizards/forms go full-screen, one field group per screen where long; tables always convert to card lists; Calendar defaults to Day view.

### 0.10 Accessibility Baseline (applies to every screen)
All interactive elements keyboard-reachable with a visible focus state; every form field has a real associated label (not placeholder-only); status is never color-only (paired with icon/text); minimum touch target 44×44px; async status changes (toasts, loading completion) announced via ARIA live regions; each screen has exactly one H1 and a logical heading order.

### 0.11 HIPAA/Privacy Baseline (applies to every screen)
No PHI in URLs/query strings; no PHI in browser tab titles beyond the logged-in user's own current work; idle staff sessions auto-timeout and require re-authentication; print/export/copy actions on clinical data are audit-logged; shared/screen-share contexts default to collapsed clinical detail; outbound notifications (email/SMS) never contain clinical content, only neutral prompts ("You have a new secure message").

---

# PHASE 1 — Public Website

### 01. Homepage
- **Purpose:** Convert an anonymous visitor into either a booking or an inquiry; establish clinical credibility.
- **Role:** Public visitor
- **Pattern:** P-LIST (marketing composition, not a workflow screen)
- **Entry:** Direct/search/ad traffic
- **Exit/Next:** Services (02), Therapist Directory (03), Book Appointment (09), Contact (08)
- **Layout:** Header nav + hero (value proposition, primary "Book Appointment" CTA) + services preview strip + "How Therapy Works" teaser + therapist highlights + footer (contact, clinic info, legal/privacy links)
- **Hierarchy:** Book Appointment CTA > clinical credibility (services/therapists) > secondary info (about, FAQ)
- **Sections:** Hero, Services preview, How It Works teaser, Featured therapists, Trust/credentials strip, Footer
- **Components:** Primary CTA button, service cards, therapist mini-cards, nav bar
- **Primary CTA:** "Book an Appointment"
- **Secondary Actions:** "Meet Our Therapists," "Learn About Us," "Contact Us"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1 (hero renders first, sections progressively). Empty: N/A (static marketing content). Error: ERR1 if dynamic content (e.g., featured therapists) fails to load — section hides gracefully rather than showing a broken block. Success: N/A
- **Permissions:** Fully public, no auth
- **HIPAA/Privacy:** Zero PHI; no forms that collect health information here
- **Responsive:** Mobile collapses hero CTA to full-width sticky button; nav becomes hamburger
- **Navigation:** Top-level entry to all public pages; no back-navigation concept (it's the root)

### 02. Services
- **Purpose:** Explain therapy service types so a visitor can self-select before booking.
- **Role:** Public visitor
- **Pattern:** P-LIST
- **Entry:** Homepage, nav bar
- **Exit/Next:** Book Appointment (09, pre-filtered to selected service), Therapist Directory (03)
- **Layout:** Header + grid/list of service cards (Individual, Couples, Family, Group, Assessment, etc. — per Blueprint §6 example) + per-card "Book this service" CTA
- **Hierarchy:** Service name/description > "who it's for" > booking CTA
- **Sections:** Intro copy, Service cards grid
- **Components:** Service card (name, short description, format tags: in-person/virtual), CTA button per card
- **Primary CTA:** "Book [Service]"
- **Secondary Actions:** "View Therapists offering this service"
- **Filters/Search/Sort:** Optional filter by format (in-person/virtual)
- **States:** Loading: L1. Empty: E1 (should not occur in practice — clinic always configures ≥1 service; fallback message directs to Contact). Error: ERR1. Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** None — service descriptions are non-clinical marketing copy
- **Responsive:** Grid → single column list on mobile
- **Navigation:** Reachable from Homepage nav; feeds directly into Booking Step 1

### 03. Therapist Directory
- **Purpose:** Let a visitor choose a therapist by fit (specialty, format, availability) before booking.
- **Role:** Public visitor
- **Pattern:** P-LIST
- **Entry:** Homepage, Services page, nav bar
- **Exit/Next:** Therapist Profile (04), Book Appointment (09, pre-filled therapist)
- **Layout:** Header + filter bar (specialty/service, format) + therapist card grid
- **Hierarchy:** Photo/name/credentials > specialties > "Book with [Name]"
- **Sections:** Filter bar, Therapist cards
- **Components:** Therapist card (photo, name, credentials, specialty tags, format badges), filter chips
- **Primary CTA:** "Book with [Therapist]" (per card)
- **Secondary Actions:** "View Profile"
- **Filters/Search/Sort:** Filter by specialty/service, format (in-person/virtual); sort by next availability
- **States:** Loading: L1. Empty: E2 if filters yield none ("No therapists match — clear filters"). Error: ERR1. Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** None (public professional bios only)
- **Responsive:** Grid → single column
- **Navigation:** Feeds Therapist Profile and Booking Step 1

### 04. Therapist Profile
- **Purpose:** Build trust in a specific therapist before committing to book.
- **Role:** Public visitor
- **Pattern:** P-DETAIL
- **Entry:** Therapist Directory
- **Exit/Next:** Book Appointment (09, pre-filled)
- **Layout:** Header + profile hero (photo, name, credentials) + bio + specialties/approach + services offered + availability preview
- **Hierarchy:** Credentials/trust signals first, then approach/specialties, then booking CTA
- **Sections:** Bio, Approach/specialties, Services offered, Next available slot preview
- **Components:** Profile card, specialty tags, availability chip ("Next available: Tue, Aug 18")
- **Primary CTA:** "Book with [Therapist]"
- **Secondary Actions:** "Back to Directory"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1 (profile not found → redirect to Directory with a notice). Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** Only professional bio content; no client-related information ever appears here
- **Responsive:** Stacks vertically on mobile
- **Navigation:** Child of Therapist Directory; feeds Booking Step 1

### 05. About Clinic
- **Purpose:** Establish clinic credibility and identity.
- **Role:** Public visitor
- **Pattern:** P-LIST (static content)
- **Entry:** Homepage nav/footer
- **Exit/Next:** Services, Book Appointment
- **Layout:** Header + mission/story + team overview + credentials/affiliations
- **Hierarchy:** Mission statement first
- **Sections:** Story, Values, Credentials
- **Components:** Text blocks, credential badges
- **Primary CTA:** "Book an Appointment" (secondary presence, not the page's job)
- **Secondary Actions:** "Meet the Team" → Therapist Directory
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** None
- **Responsive:** Standard stacking
- **Navigation:** Footer/nav destination, no children beyond outbound links

### 06. How Therapy Works
- **Purpose:** Reduce first-time-client anxiety by explaining what to expect (Blueprint's therapy-first philosophy, made visible to the public).
- **Role:** Public visitor, especially first-time therapy seekers
- **Pattern:** P-LIST (static/explainer)
- **Entry:** Homepage teaser, nav
- **Exit/Next:** Book Appointment, FAQ
- **Layout:** Header + step explainer (Book → Intake → First Session → Ongoing Care) + reassurance copy (confidentiality, what a first session looks like)
- **Hierarchy:** "What happens after I book" sequence is the core content
- **Sections:** Step-by-step explainer, confidentiality note, FAQ teaser
- **Components:** Step indicator graphic (visual only, not a functional wizard)
- **Primary CTA:** "Book an Appointment"
- **Secondary Actions:** "Read FAQ"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** None — general explainer only, no personal data
- **Responsive:** Steps stack vertically on mobile
- **Navigation:** Standalone informational page

### 07. FAQ
- **Purpose:** Answer common logistical/clinical-adjacent questions to reduce Contact/inquiry volume.
- **Role:** Public visitor
- **Pattern:** P-LIST (accordion)
- **Entry:** Nav, footer, How Therapy Works
- **Exit/Next:** Contact, Book Appointment
- **Layout:** Header + searchable accordion list grouped by topic (Booking, Billing/Insurance, Therapy Process, Telehealth)
- **Hierarchy:** Most-asked questions first
- **Sections:** Topic-grouped accordion
- **Components:** Accordion item, topic filter chips, search box
- **Primary CTA:** "Still have questions? Contact Us"
- **Secondary Actions:** "Book an Appointment"
- **Filters/Search/Sort:** Search box (client-side filter across Q&A text), topic filter
- **States:** Loading: L1. Empty: E2 (search yields nothing → "No matching questions, contact us"). Error: ERR1. Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** Answers must not reveal clinical specifics tied to any real client
- **Responsive:** Single column accordion
- **Navigation:** Standalone; links out to Contact and Booking

### 08. Contact
- **Purpose:** Capture a general inquiry from a visitor not ready to book directly — this is a Lead-creation entry point.
- **Role:** Public visitor
- **Pattern:** P-FORM
- **Entry:** Nav, footer, FAQ
- **Exit/Next:** Confirmation message (inline, not a separate page); creates a Lead in Intake & Leads > Pipeline at "New Inquiry"
- **Layout:** Header + short form (name, email, phone, message) + clinic contact info sidebar (phone, address, hours)
- **Hierarchy:** Form first; clinic info secondary
- **Sections:** Inquiry form, Clinic contact details
- **Components:** Text inputs, textarea, submit button, phone/address block
- **Primary CTA:** "Send Message"
- **Secondary Actions:** "Book an Appointment instead" (redirect to 09)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 on submit. Empty: N/A. Error: ERR2 (validation — invalid email/phone, required fields). Success: S1 inline confirmation ("Thanks — we'll be in touch within 1 business day"), form clears
- **Permissions:** Public
- **HIPAA/Privacy:** Message field is free text — a small disclaimer states "Please don't include sensitive health details in this form"; submitted inquiries store only what the Blueprint's Lead lifecycle needs (contact info + message), not clinical data
- **Responsive:** Form full-width on mobile, sidebar moves below form
- **Navigation:** Standalone; success state offers Book Appointment as next step

### 09. Appointment Booking — Step 1 (Service, Therapist, Type)
- **Purpose:** Let the visitor choose what kind of care they need and with whom, including therapy format (Locked Decision 2: Individual/Couples/Family/Group).
- **Role:** Public visitor (Interested Person)
- **Pattern:** P-WIZARD (step 1 of 3)
- **Entry:** Any "Book Appointment" CTA sitewide
- **Exit/Next:** Step 2 (10); Back exits to the referring page
- **Layout:** Step indicator (1 of 3) + service selector + therapy format selector (Individual/Couples/Family/Group) + therapist selector (filtered by service/format) + appointment-type note (In-person/Virtual choice deferred to step 2 if tied to slot availability, or selected here if it affects which slots show)
- **Hierarchy:** Service > Format > Therapist
- **Sections:** Step indicator, Service selection, Format selection, Therapist selection (or "No preference — match me")
- **Components:** Radio/select cards for service and format, therapist picker (cards or dropdown), "Continue" button
- **Primary CTA:** "Continue"
- **Secondary Actions:** "I'm not sure which service — Contact Us instead"
- **Filters/Search/Sort:** Therapist list filters live as Service/Format selections change
- **States:** Loading: L1 (therapist list). Empty: E1 if a Format/Service combination has no available therapist ("No therapists currently offer this — Contact Us"). Error: ERR1. Success: N/A (advances to Step 2)
- **Permissions:** Public
- **HIPAA/Privacy:** No health information collected at this step — only service/format/therapist preference
- **Responsive:** Step indicator condenses to "Step 1 of 3" text on mobile; selections stack vertically
- **Navigation:** Linear wizard; no sidebar; exiting mid-flow loses progress (no save-and-resume for anonymous visitors)

### 10. Appointment Booking — Step 2 (Date & Time)
- **Purpose:** Select an available slot.
- **Role:** Public visitor
- **Pattern:** P-WIZARD (step 2 of 3)
- **Entry:** From Step 1
- **Exit/Next:** Step 3 (11); Back returns to Step 1 with selections preserved
- **Layout:** Step indicator (2 of 3) + summary strip of Step 1 choices (editable via "Change") + date picker + time-slot grid for the selected date + In-person/Virtual toggle if the therapist offers both
- **Hierarchy:** Date > available times for that date
- **Sections:** Selection summary, Date picker, Time slots, Format toggle
- **Components:** Calendar date picker, slot chips (available/unavailable), format toggle
- **Primary CTA:** "Continue"
- **Secondary Actions:** "Change service/therapist" (returns to Step 1)
- **Filters/Search/Sort:** Date navigation (prev/next week), format toggle re-filters slots
- **States:** Loading: L1 (slots for selected date). Empty: E1 ("No openings this day — try another date" + jump-to-next-available shortcut). Error: ERR4 if a slot is selected but becomes unavailable before submission (handled fully at Step 3/Confirmation — see 14). Success: N/A
- **Permissions:** Public
- **HIPAA/Privacy:** None
- **Responsive:** Calendar condenses to a scrollable date strip; time slots stack as a single-column list
- **Navigation:** Linear wizard; Step 1 choices remain editable

### 11. Appointment Booking — Step 3 (Contact Details)
- **Purpose:** Capture the minimum contact information needed to hold the booking — no clinical intake here.
- **Role:** Public visitor
- **Pattern:** P-WIZARD (step 3 of 3)
- **Entry:** From Step 2
- **Exit/Next:** Confirmation (12); Back returns to Step 2
- **Layout:** Step indicator (3 of 3) + summary strip (service, format, therapist, date/time, all editable) + contact form (name, email, phone, "new or existing client?" toggle, basic payer type — Self-Pay/Insurance/Other per Locked Decision 6) + consent-to-contact checkbox
- **Hierarchy:** Booking summary confirmation > contact fields
- **Sections:** Booking summary, Contact form, Payer type, Consent checkbox
- **Components:** Text inputs, existing-client lookup (email/phone match — if matched, routes toward Existing-Client flow instead per IA §19/§20), payer-type select, checkbox, submit button
- **Primary CTA:** "Confirm Booking"
- **Secondary Actions:** "Edit selections" (jumps back to Step 1/2)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 on submit. Empty: N/A. Error: ERR2 (validation) or ERR4 (slot taken while filling this step — surfaces the Booking Error state, screen 14). Success: advances to Confirmation (12)
- **Permissions:** Public
- **HIPAA/Privacy:** Only contact info + basic payer type collected — explicitly no diagnosis, symptoms, or clinical history at this stage, per the IA principle of not collecting unnecessary PHI before it's needed; payer type is billing metadata, not clinical
- **Responsive:** Summary strip collapses to an expandable "Review" accordion on mobile to keep the form the visual focus
- **Navigation:** Linear wizard; submission creates/updates a Lead record (Intake & Leads, per IA §19) or attaches directly to an existing Client if matched

### 12. Appointment Booking — Confirmation
- **Purpose:** Confirm the booking succeeded and direct the visitor to intake.
- **Role:** Public visitor / new or existing client
- **Pattern:** P-CONFIRM (S2)
- **Entry:** Successful submission of Step 3
- **Exit/Next:** Intake / Pre-Appointment Information (13)
- **Layout:** Success confirmation (checkmark + summary card: service, therapist, date/time, format, location/join-link placeholder) + "What's next" section pointing to intake + calendar-add action
- **Hierarchy:** Confirmation status first, then appointment summary, then next-step CTA
- **Sections:** Confirmation banner, Appointment summary card, Next steps (intake), Add-to-calendar
- **Components:** Summary card, "Add to Calendar" button, "Complete Intake Forms" CTA
- **Primary CTA:** "Complete Intake Forms"
- **Secondary Actions:** "Add to Calendar," "Back to Homepage"
- **Filters/Search/Sort:** N/A
- **States:** Loading: N/A (already resolved on arrival). Empty: N/A. Error: N/A (a failure would have surfaced at Step 3, not here). Success: this screen is the success state (S2)
- **Permissions:** Public (session-scoped to this booking; no account required yet)
- **HIPAA/Privacy:** Confirmation content shown/emailed contains only logistics (date, time, therapist name, location/join info) — never clinical content, consistent with the "no PHI in notifications" baseline (§0.11)
- **Responsive:** Summary card stacks; CTA remains prominent and full-width on mobile
- **Navigation:** Terminal step of the booking wizard; single forward path into Intake

### 13. Intake / Pre-Appointment Information
- **Purpose:** Get required forms in front of the client before their first session, and set expectations (Locked Decision 3: this may recur as a re-intake cycle for existing clients later — screen 56 handles that case; this screen is the first-time version).
- **Role:** New client (unauthenticated or freshly-created portal account)
- **Pattern:** P-LIST leading into P-FORM (form completion itself is screen 74)
- **Entry:** Booking Confirmation (12); reminder email/SMS link
- **Exit/Next:** Client Form Completion (74); eventually Client Portal (114) once an account is set
- **Layout:** Header + "Before your first session" intro + checklist of required items (intake form, consent form, any assessment forms) with status indicators + brief "what to expect at your first session" note
- **Hierarchy:** Outstanding items checklist is the primary content
- **Sections:** Intro, Checklist, What-to-expect note
- **Components:** Checklist items (Not Started/In Progress/Complete), "Start" / "Continue" buttons per item
- **Primary CTA:** "Start Intake Forms"
- **Secondary Actions:** "Contact us with questions"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1 would not normally apply (at least one intake form is always assigned) — if truly none required, shows a positive "You're all set for your appointment" message instead. Error: ERR1. Success: checklist items visually complete as forms are finished (S1 per item)
- **Permissions:** Scoped to the specific client via a secure link/token or authenticated portal session — no other client's checklist is reachable from this URL
- **HIPAA/Privacy:** The checklist itself names forms generically ("Intake Questionnaire," "Consent to Treat") without previewing clinical content; access requires the secure booking-confirmation token or portal login, never a guessable URL
- **Responsive:** Checklist stacks as a single column; buttons full-width on mobile
- **Navigation:** Bridges Public Website → Client Portal; also reachable later from Client Portal > Forms (117)

### 14. Booking Error / Unavailable Slot State
- **Purpose:** Recover gracefully when a selected slot becomes unavailable (race condition) or another booking error occurs, without losing the visitor's other selections.
- **Role:** Public visitor
- **Pattern:** P-EMPTY / inline ERR4 state layered on Step 2 or Step 3
- **Entry:** Triggered automatically during Step 2→3 transition or Step 3 submission if the chosen slot is no longer available
- **Exit/Next:** Returns to Step 2 with the conflicting slot removed and alternatives highlighted
- **Layout:** Inline banner replacing the summary/slot area: "That time was just booked by someone else" + immediately-visible list of nearest alternative slots (same day, then nearest days)
- **Hierarchy:** Explanation first, alternatives immediately after — no dead end
- **Sections:** Conflict banner, Alternative slots list
- **Components:** ERR4 banner, alternative slot chips, "Choose another time" link
- **Primary CTA:** Select an alternative slot (inline)
- **Secondary Actions:** "Start over," "Contact us to book by phone"
- **Filters/Search/Sort:** N/A
- **States:** This screen *is* the Error state (ERR4) for the booking wizard; it has no further loading/empty/success sub-states of its own beyond selecting a new slot, which returns the user to the normal Step 2/3 flow
- **Permissions:** Public
- **HIPAA/Privacy:** None — purely a scheduling-conflict message
- **Responsive:** Alternatives list stacks vertically
- **Navigation:** Not a standalone destination — an in-flow recovery state within the booking wizard (09–11)

---

# PHASE 2 — Authentication

### 15. Login
- **Purpose:** Authenticate staff or client into their respective application.
- **Role:** All roles (Admin, Therapist, Receptionist, Billing Staff, Client)
- **Pattern:** P-FORM
- **Entry:** Direct URL, "Log in" link from public site/portal, session-timeout redirect
- **Exit/Next:** MFA Verification (16) if enabled; otherwise role-appropriate Dashboard (staff) or Client Home (114)
- **Layout:** Centered card: clinic branding + email/username + password fields + "Forgot password?" link + submit
- **Hierarchy:** Credential fields are the entire content — no marketing content on this screen
- **Sections:** Login form
- **Components:** Text input, password input (show/hide toggle), submit button, forgot-password link
- **Primary CTA:** "Log In"
- **Secondary Actions:** "Forgot password?"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 on submit. Empty: N/A. Error: ERR2 — generic "Incorrect email or password" (never specifies which field is wrong, to avoid account enumeration); account-lockout message after repeated failures directs to Forgot Password. Success: redirects immediately (no dedicated success screen)
- **Permissions:** Public entry point; routes to different destinations post-auth based on role
- **HIPAA/Privacy:** No PHI on this screen; failed-login attempts are audit-logged (§0.11); password field always masked
- **Responsive:** Card centers and narrows on mobile, no layout change otherwise
- **Navigation:** Root of the authenticated experience; no back-navigation needed (it's an entry point)

### 16. MFA Verification
- **Purpose:** Second-factor verification for accounts with MFA enabled (Blueprint §26 — MFA-ready architecture).
- **Role:** All authenticated roles with MFA active
- **Pattern:** P-FORM
- **Entry:** Immediately after successful Login (15)
- **Exit/Next:** Role-appropriate Dashboard / Client Home
- **Layout:** Centered card: "Enter the code sent to [masked contact]" + code input + resend action
- **Hierarchy:** Code entry is the sole task
- **Sections:** Code entry form
- **Components:** 6-digit code input, "Resend code" link (with cooldown timer), "Verify" button
- **Primary CTA:** "Verify"
- **Secondary Actions:** "Resend code," "Use a different verification method" (if multiple configured), "Log in as someone else"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2 — "Incorrect code" with attempts-remaining indicator; lockout after repeated failures. Success: immediate redirect
- **Permissions:** Session is not fully authenticated until this step completes — no application data is reachable beforehand
- **HIPAA/Privacy:** Contact info shown is masked (e.g., "•••-•••-4821"); MFA failures are audit-logged
- **Responsive:** Same centered-card pattern as Login
- **Navigation:** Mandatory intermediate step; cannot be skipped or deep-linked around

### 17. Forgot Password
- **Purpose:** Initiate password reset via verified contact method.
- **Role:** All roles
- **Pattern:** P-FORM
- **Entry:** "Forgot password?" link on Login
- **Exit/Next:** Confirmation message (inline) → email/SMS link leads to Password Reset (18)
- **Layout:** Centered card: "Enter your email" + submit
- **Hierarchy:** Single field
- **Sections:** Request form
- **Components:** Email input, submit button
- **Primary CTA:** "Send Reset Link"
- **Secondary Actions:** "Back to Login"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2 (invalid email format only — never confirms/denies whether the address has an account, to prevent enumeration). Success: S1 — "If an account exists for that email, we've sent a reset link" (identical message regardless of match)
- **Permissions:** Public
- **HIPAA/Privacy:** Deliberately non-confirming response prevents account enumeration; reset link is single-use and time-limited
- **Responsive:** Centered card, standard
- **Navigation:** Reachable only from Login; leads externally to email/SMS

### 18. Password Reset
- **Purpose:** Set a new password via a valid reset token.
- **Role:** All roles
- **Pattern:** P-FORM
- **Entry:** Link from reset email/SMS
- **Exit/Next:** Login (15), with a success notice
- **Layout:** Centered card: new password + confirm password fields + strength indicator
- **Hierarchy:** Password fields only
- **Sections:** Reset form
- **Components:** Password input ×2, strength meter, submit button
- **Primary CTA:** "Reset Password"
- **Secondary Actions:** "Back to Login"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2 (mismatch, weak password) or ERR4 (expired/used token → "This link has expired, request a new one" with a link back to 17). Success: S1 → redirects to Login with "Password updated, please log in"
- **Permissions:** Requires a valid, unexpired, single-use token
- **HIPAA/Privacy:** Token invalidated immediately on use; all active sessions for the account are terminated on password change (forces re-login everywhere), and this event is audit-logged
- **Responsive:** Standard centered card
- **Navigation:** Terminal step of the password-recovery flow

### 19. Session / Security-Related States
- **Purpose:** Handle idle-timeout, forced logout, and concurrent-session conditions consistently across the app (staff and portal).
- **Role:** All authenticated roles
- **Pattern:** P-MODAL (warning) / P-EMPTY (post-logout)
- **Entry:** Triggered by inactivity timer, admin-forced logout, or password change elsewhere
- **Exit/Next:** Login (15)
- **Layout:** (a) Idle warning: modal appears ~2 minutes before timeout — "You'll be logged out soon due to inactivity" + "Stay logged in" / "Log out now"; (b) Timeout/forced-logout: full-screen message on next interaction — "Your session ended for your security" + "Log In" button
- **Hierarchy:** Clear reason for the interruption, then a single recovery action
- **Sections:** Warning modal; post-timeout screen
- **Components:** Countdown modal, full-screen notice
- **Primary CTA:** "Stay Logged In" (warning) / "Log In" (post-timeout)
- **Secondary Actions:** "Log Out Now" (warning state)
- **Filters/Search/Sort:** N/A
- **States:** This screen group *is* a set of states rather than a single screen — no further loading/empty states apply
- **Permissions:** Applies uniformly regardless of role
- **HIPAA/Privacy:** Idle-timeout duration is shorter for staff sessions handling clinical data than for the client portal, per §0.11; any in-progress unsaved clinical note triggers C2 (unsaved changes) before the idle warning takes over, so work isn't silently lost
- **Responsive:** Modal/full-screen notice adapt to viewport, no functional change
- **Navigation:** Cross-cutting — can interrupt any authenticated screen

---

# PHASE 3 — Clinic Dashboards

All four dashboards are the **same IA module** (`Dashboard`, per `02-information-architecture.md` §6) rendered with role-scoped widgets — not four separate top-level menus. Each answers a different question because each role's day is different, per the task's own instruction.

### 20. Therapist Dashboard
- **Purpose:** Answer "What do I need to do today?" for a clinician.
- **Role:** Psychologist/Therapist
- **Pattern:** P-LIST (widget grid), not a table
- **Entry:** Post-login landing page for this role
- **Exit/Next:** Schedule (24), Client Profile (37), Clinical Note (60), Virtual Session (88)
- **Layout:** Header (today's date, quick "New Note" action) + widget grid: Today's Sessions (ordered by time, next-up highlighted), Pending Clinical Notes, Assessments Requiring Attention, Treatment-Plan Reviews Due, Goals/Outcomes flags, Virtual Sessions (join shortcuts), Follow-ups due
- **Hierarchy:** Today's Sessions and the *next* appointment are visually dominant (top-left, largest); task widgets (notes/plans/assessments) follow; nothing financial appears here
- **Sections:** Today's Sessions, Clinical Tasks (notes/plans/assessments grouped), Virtual Sessions, Follow-ups
- **Components:** Session card (client name, time, format, Join/Start action), task list items with deep links, count badges
- **Primary CTA:** Context-dependent per widget — "Start Session" on the next appointment is the dominant action
- **Secondary Actions:** "View Full Schedule," "View Worklist" (Clinical Care)
- **Filters/Search/Sort:** N/A (curated, not a searchable list)
- **States:** Loading: L1 per widget (widgets load independently so a slow one doesn't block the rest). Empty: E3 per widget ("No sessions today," "Nothing pending — you're caught up"). Error: ERR1 per widget, isolated (one failed widget doesn't break the page). Success: N/A
- **Permissions:** Scoped to the therapist's own assigned clients (subject to Locked Decision 1 — a therapist with cross-access permission sees an additional "Shared/Coverage" filter on relevant widgets, not a separate dashboard)
- **HIPAA/Privacy:** Session cards show client name + appointment context only, no diagnosis/note content; clicking through always requires the same tab-level permission checks as the Client Profile itself
- **Responsive:** Widget grid stacks to single column on tablet/mobile, Today's Sessions widget stays first
- **Navigation:** Root landing page for this role; every widget is a shortcut, not a duplicate editor (per IA §1 Principle 1)

### 21. Reception Dashboard
- **Purpose:** Answer "What does the front desk need to move today?"
- **Role:** Receptionist
- **Pattern:** P-LIST (widget grid)
- **Entry:** Post-login landing page for this role
- **Exit/Next:** Schedule (24), Leads/New Inquiries (49), Client 360 (37), Check-in (30)
- **Layout:** Header + widget grid: Today's Appointments (with check-in status), Appointment Requests (pending confirmation), New Inquiries, Intake Pending, Cancellations/Reschedules needing attention, Quick Booking shortcut
- **Hierarchy:** Today's Appointments (operational, time-sensitive) is dominant; Requests/Inquiries next (needs triage); Intake Pending last (tracked, not urgent-by-minute)
- **Sections:** Today's Appointments, Appointment Requests, New Inquiries, Intake Pending, Cancellations/Reschedules
- **Components:** Appointment row (client, time, status chip, Check-in button), request/inquiry cards with quick-action buttons, "New Booking" quick-action button
- **Primary CTA:** "New Booking" (persistent, header-level)
- **Secondary Actions:** "Check In," "Contact" (per request/inquiry), "View Pipeline"
- **Filters/Search/Sort:** N/A on the dashboard itself (widgets are pre-filtered to "today" or "needs action"); full filtering lives on the underlying list screens
- **States:** Loading: L1 per widget. Empty: E3 ("No pending requests," "No new inquiries today"). Error: ERR1 per widget. Success: S1 toast when an inline action (e.g., check-in) completes
- **Permissions:** No Clinical Care content anywhere on this dashboard — by IA design, not by hiding a widget that would otherwise show it
- **HIPAA/Privacy:** Appointment rows show client name, time, and appointment type label only (e.g., "Individual Therapy"), never diagnosis or note status
- **Responsive:** Widgets stack; Today's Appointments stays first and becomes a scrollable list on mobile
- **Navigation:** Root landing page for this role; feeds Schedule and Intake & Leads directly

### 22. Clinic Admin Dashboard
- **Purpose:** Answer "How is the clinic doing today/this week, and does anything need my attention?"
- **Role:** Clinic Admin/Owner
- **Pattern:** P-LIST (widget grid, higher information density than other dashboards)
- **Entry:** Post-login landing page for this role
- **Exit/Next:** Reports (98), Schedule (24), Settings (104), Clients (34), Billing (90)
- **Layout:** Header + widget grid: Clinic Overview (appointments today, active clients, providers on shift), Appointment Activity (volume/cancellations trend, small chart), Client/Inquiry Activity (new leads, conversions this week), Provider Activity (sessions completed per provider), Documentation Status (unsigned notes clinic-wide, aggregate not per-client detail), Financial Overview (today's payments, outstanding total)
- **Hierarchy:** Clinic Overview strip (numbers) sits at the very top as a scannable summary row; detailed widgets follow below in a grid, no single widget dominates the way "Today's Sessions" does for the Therapist
- **Sections:** Overview strip, Appointment Activity, Client/Inquiry Activity, Provider Activity, Documentation Status, Financial Overview
- **Components:** KPI stat tiles, small trend charts (sparkline-style), provider activity table (name, sessions, docs pending — counts only)
- **Primary CTA:** None singularly dominant — this is a monitoring surface, not a task queue; each widget's "View Report"/"View List" is a secondary link
- **Secondary Actions:** "View Full Report" per widget, "Manage Staff" (Settings shortcut)
- **Filters/Search/Sort:** Date-range selector at the top (Today / This Week / This Month) governs the whole page
- **States:** Loading: L1 per widget. Empty: E3 (a genuinely quiet clinic day is a valid, positively-framed state, not an error). Error: ERR1 per widget. Success: N/A
- **Permissions:** Full visibility — the only dashboard variant with financial + operational + aggregate clinical-status data together; still no individual clinical note content (Documentation Status shows counts, not content)
- **HIPAA/Privacy:** Provider Activity and Documentation Status widgets show counts/aggregates only, never per-client clinical detail — an admin drilling into a specific client still passes through the same Client Profile permission model as anyone else
- **Responsive:** KPI strip becomes a horizontally-scrollable row on mobile; widget grid stacks
- **Navigation:** Root landing page for this role; every widget links to its full module (Reports, Schedule, Clients, Billing) rather than duplicating that module's functionality here

### 23. Billing Dashboard (Home Landing)
- **Purpose:** Answer "What money needs attention today?" — the Billing Staff's post-login landing page.
- **Role:** Billing Staff
- **Pattern:** P-LIST (widget grid)
- **Entry:** Post-login landing page for this role
- **Exit/Next:** Outstanding Balance (96), Invoice List (91), Payment History (95)
- **Layout:** Header + widget grid: Outstanding Balances (top offenders list), Today's Payments, Recent Invoices, Recent Billing Activity feed
- **Hierarchy:** Outstanding Balances widget is dominant (it's the actionable queue); Today's Payments and Recent Activity are monitoring widgets beneath it
- **Sections:** Outstanding Balances, Today's Payments, Recent Invoices, Recent Activity
- **Components:** Balance list rows (client, amount, days overdue), payment feed items, invoice mini-list
- **Primary CTA:** "Record Payment" (header-level quick action)
- **Secondary Actions:** "View All Invoices," "View All Outstanding"
- **Filters/Search/Sort:** N/A on dashboard (pre-filtered to "needs attention" / "today"); full controls live on the underlying Billing screens
- **States:** Loading: L1 per widget. Empty: E3 ("No outstanding balances — nice work"). Error: ERR1 per widget. Success: S1 toast on inline actions (e.g., marking a payment recorded)
- **Permissions:** Financial data only — no clinical module is reachable from this dashboard, and Schedule/Client widgets that appear are read-only, minimal-field views
- **HIPAA/Privacy:** Client rows show name + amount only; no appointment-type or clinical labeling beyond what's needed to identify the invoice
- **Responsive:** Widgets stack; Outstanding Balances list becomes a scrollable card list on mobile
- **Navigation:** Root landing page for this role. **Note:** distinct from screen 90 (Billing module's in-context landing page, reached by clicking "Billing" in the sidebar) — this screen (23) is the cross-role Dashboard destination at login; 90 is what Billing Staff (or Admin) see when navigating into the Billing module mid-session. They share widgets/data but serve different entry contexts, not duplicate functionality.

---

# PHASE 4 — Schedule & Appointments

Supports Individual, Couples, Family, and Group therapy (Locked Decision 2) and both In-person and Virtual formats throughout.

### 24. Calendar
- **Purpose:** Central view of the appointment lifecycle across the clinic or one provider.
- **Role:** Receptionist (primary), Therapist (own calendar), Clinic Admin
- **Pattern:** P-CAL
- **Entry:** Schedule sidebar item; Dashboard shortcuts
- **Exit/Next:** Appointment Detail (27, via drawer), Create Appointment (26)
- **Layout:** Header (view switcher: Day/Week/Month/Provider, date navigator, "New Appointment" button) + calendar grid + provider filter (multi-select, for Reception/Admin) + status color legend
- **Hierarchy:** Current day/next appointment visually anchored; status color-coding communicates lifecycle state at a glance
- **Sections:** View controls, Provider filter, Calendar grid, Legend
- **Components:** Calendar grid cells/blocks (color-coded by status: Requested/Pending/Confirmed/Checked-In/In-Session/Completed/Cancelled/No-show), provider column headers (Provider view), "New Appointment" button
- **Primary CTA:** "New Appointment"
- **Secondary Actions:** Click a slot to Create Appointment pre-filled; click an appointment to open Appointment Detail (drawer)
- **Filters/Search/Sort:** Provider filter, service-type filter, format filter (in-person/virtual); view switcher acts as the primary "sort"
- **States:** Loading: L3 (progressive — visible day/week loads first). Empty: E1 for a day with nothing scheduled ("No appointments today" + New Appointment CTA). Error: ERR1. Success: S1 toast on quick actions taken from the calendar (e.g., drag-to-reschedule confirmation)
- **Permissions:** Therapist sees own calendar by default; Receptionist/Admin see all providers; cross-therapist visibility beyond "seeing the calendar slot exists" (i.e., seeing *who* the client is) follows Locked Decision 1's permission model
- **HIPAA/Privacy:** Calendar blocks show client name + appointment type, not clinical content. **Product Owner decision:** a provider without permission to a given client's record sees the slot marked simply "Booked" — no client name, no service/appointment-type label — while still seeing that the slot is occupied, for scheduling-conflict purposes only. Only the assigned/permitted provider, Receptionist, and Admin see the full block detail (client name, service, format).
- **Responsive:** Month view drops to Week on tablet, Week drops to Day on mobile; Provider view is desktop-only (mobile defaults to the logged-in user's own calendar)
- **Navigation:** Primary entry to Appointment Detail and Create Appointment; never duplicates the Client Profile's Appointments tab (that's a filtered view of this same data, per IA §21)

### 25. Appointment Request
- **Purpose:** Reception's queue for confirming appointment requests generated by website bookings or the client portal.
- **Role:** Receptionist
- **Pattern:** P-WORKLIST
- **Entry:** Schedule > Appointment Requests; Reception Dashboard widget
- **Exit/Next:** Appointment Detail (27) on confirm; Calendar (24) once confirmed
- **Layout:** Header + list of pending requests (client/lead name, requested service/therapist/time, source: website/portal) + per-row Confirm/Decline/Suggest-alternative actions
- **Hierarchy:** Oldest/most time-sensitive requests first
- **Sections:** Pending requests list
- **Components:** Request row/card, Confirm button, Decline button, "Suggest alternative time" action
- **Primary CTA:** "Confirm" (per row)
- **Secondary Actions:** "Decline," "Suggest Alternative," "View Lead" (if from a new inquiry)
- **Filters/Search/Sort:** Filter by provider/service; sort by request date (oldest first, default)
- **States:** Loading: L1. Empty: E3 ("No pending requests"). Error: ERR1. Success: S1 toast on confirm/decline, row removed from the queue
- **Permissions:** Receptionist and Admin only
- **HIPAA/Privacy:** Request rows show contact/scheduling info only, consistent with pre-intake data minimization
- **Responsive:** List becomes stacked cards on mobile
- **Navigation:** A queue view of the same Appointment records shown on the Calendar (24) — not a separate record type (per IA §19)

### 26. Create Appointment
- **Purpose:** Staff-initiated appointment creation, supporting all four therapy formats.
- **Role:** Receptionist (primary), Therapist, Clinic Admin
- **Pattern:** P-FORM (single page, not a multi-step wizard — staff have full context already)
- **Entry:** Calendar "New Appointment," Client Profile "Book Appointment" action, Reception Dashboard quick action
- **Exit/Next:** Appointment Detail (27) or back to Calendar (24)
- **Layout:** Header + form: Client(s) selector (single client for Individual; multi-select for Couples/Family/Group, per Locked Decision 2), Service, Therapist, Format (In-person/Virtual), Date/Time (slot picker), Recurrence (optional), Notes-to-self (internal, non-clinical scheduling note)
- **Hierarchy:** Client selection first (determines everything downstream), then service/format, then slot
- **Sections:** Participants, Service & Format, Date & Time, Recurrence, Internal Note
- **Components:** Client multi-select with "Add participant" (for Couples/Family/Group), service/format selectors, slot picker, recurrence controls
- **Primary CTA:** "Create Appointment"
- **Secondary Actions:** "Cancel" (discard, C2 if fields are filled)
- **Filters/Search/Sort:** Client search-as-you-type in the participant selector
- **States:** Loading: L1 (slot availability). Empty: N/A. Error: ERR2 (validation) or ERR4 (slot conflict — same pattern as public booking's screen 14, staff-facing variant). Success: S2 confirmation, routes to Appointment Detail
- **Permissions:** Receptionist/Admin can book for any provider; Therapist can book only into their own calendar (subject to Locked Decision 1 exceptions)
- **HIPAA/Privacy:** Internal scheduling note field is explicitly labeled "not part of the clinical record" to prevent staff from drifting clinical content into a non-audited, less-restricted field
- **Responsive:** Form fields stack; slot picker becomes a full-screen picker on mobile
- **Navigation:** Reachable from Calendar and Client Profile; creates the single Appointment record that both surfaces reference

### 27. Appointment Detail
- **Purpose:** The contextual hub for one appointment — status, participants, and every action available at this stage of its lifecycle.
- **Role:** Receptionist, Therapist, Clinic Admin (Billing Staff: read-only)
- **Pattern:** P-DRAWER (opened from Calendar) — can also open full-page on mobile
- **Entry:** Calendar, Appointment Requests, Client Profile > Appointments, Dashboard session cards
- **Exit/Next:** Check-in (30), Reschedule (28), Cancel (29), Virtual Session/Join (33), Client Profile (37), Completed Appointment (32)
- **Layout:** Drawer header (client/participant names, status chip, format badge) + details (service, therapist, date/time, location or join link) + action bar (Check-in, Reschedule, Cancel, Join, Start Session) + linked-record shortcuts (Client Profile, prior notes if any)
- **Hierarchy:** Status and primary available action are most prominent; details below
- **Sections:** Header/status, Details, Actions, Linked records
- **Components:** Status chip, action buttons (contextual to current lifecycle state — e.g., "Join" only shows if Virtual and within the join window), participant list (for Couples/Family/Group)
- **Primary CTA:** The single action valid for the current state (e.g., "Check In" while Confirmed, "Start Session" once Checked-In, "Join" if Virtual)
- **Secondary Actions:** Reschedule, Cancel, View Client Profile
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: S1 toast on status-changing actions (e.g., "Checked in")
- **Permissions:** Billing Staff sees a reduced view (client name, time, billing-relevant status only — no service/clinical framing beyond the billable service name); Receptionist sees full logistics, no clinical shortcuts; Therapist sees full logistics plus the clinical action set (Start Session → Note)
- **HIPAA/Privacy:** No clinical note content appears here even for the Therapist — this stays a scheduling/logistics surface; the actual note is reached via "Start Session," not inlined
- **Responsive:** Drawer becomes a full-screen sheet on mobile
- **Navigation:** The contextual hub referenced from every other schedule-adjacent screen — one Appointment record, one detail surface (per IA §1)

### 28. Reschedule Appointment
- **Purpose:** Move an existing appointment to a new date/time without creating a duplicate record.
- **Role:** Receptionist, Therapist, Client (via Portal — screen 116)
- **Pattern:** P-MODAL or P-DRAWER extension of Appointment Detail
- **Entry:** Appointment Detail "Reschedule" action
- **Exit/Next:** Back to Appointment Detail (27) with updated time, or Calendar (24)
- **Layout:** Current appointment summary (read-only) + new date/time slot picker (same picker component as Create Appointment) + reason field (optional, internal)
- **Hierarchy:** Current details for context, new slot selection is the task
- **Sections:** Current appointment summary, New slot picker
- **Components:** Slot picker, reason textarea, Confirm/Cancel buttons
- **Primary CTA:** "Confirm Reschedule"
- **Secondary Actions:** "Cancel" (discard)
- **Filters/Search/Sort:** Date navigation within the slot picker
- **States:** Loading: L1 (new slots). Empty: E1 (no availability near original time). Error: ERR4 (slot taken during selection). Success: S1 toast, appointment updates in place (same record, per IA §1) and triggers the Communications automation for a reschedule notice
- **Permissions:** Same as Appointment Detail for staff; Client via Portal can reschedule only their own appointment and only within clinic-configured rules (e.g., minimum notice)
- **HIPAA/Privacy:** Reschedule notification sent to the client contains logistics only, no clinical content
- **Responsive:** Modal becomes full-screen on mobile
- **Navigation:** Sub-flow of Appointment Detail, not a standalone menu item

### 29. Cancel Appointment
- **Purpose:** Cancel an appointment with an auditable reason, distinct from a no-show.
- **Role:** Receptionist, Therapist, Client (via Portal, subject to clinic policy)
- **Pattern:** P-MODAL (uses Confirmation Dialog C1)
- **Entry:** Appointment Detail "Cancel" action
- **Exit/Next:** Back to Calendar (24), appointment now shown as Cancelled
- **Layout:** C1 confirmation dialog: consequence statement ("This will cancel the appointment and notify the client") + reason dropdown (Client request / Provider unavailable / Clinic closure / Other) + optional note
- **Hierarchy:** Confirmation and consequence first, reason capture second
- **Sections:** Confirmation dialog
- **Components:** C1 modal, reason dropdown, textarea, Confirm/Keep-appointment buttons
- **Primary CTA:** "Cancel Appointment" (explicit label, not "OK," per §0.6)
- **Secondary Actions:** "Keep Appointment" (dismiss)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 on confirm. Empty: N/A. Error: ERR1 (retry). Success: S1 toast, status updates to Cancelled, triggers cancellation-notice automation (Communications)
- **Permissions:** Client-initiated cancellation via Portal may be restricted by a clinic-configured cancellation-notice window (Settings > Appointment Settings)
- **HIPAA/Privacy:** Cancellation reason is internal scheduling metadata, not clinical documentation; client-facing cancellation notice contains logistics only
- **Responsive:** Standard modal, full-screen on mobile
- **Navigation:** Sub-flow of Appointment Detail

### 30. Check-in
- **Purpose:** Mark a client (or all participants, for Couples/Family/Group) as arrived and ready.
- **Role:** Receptionist
- **Pattern:** P-MODAL (lightweight) or inline action from Calendar/Appointment Detail
- **Entry:** Appointment Detail, Calendar row action, Reception Dashboard
- **Exit/Next:** Appointment status updates to Checked-In; therapist is notified
- **Layout:** For multi-participant appointments: a small per-participant checklist (each person checked in individually) rather than one blanket action; for Individual: a single-click action
- **Hierarchy:** Participant name(s) and a single check action each
- **Sections:** Participant checklist (if multi-person)
- **Components:** Checkbox/button per participant, timestamp display
- **Primary CTA:** "Check In" (per participant or as a single action for Individual)
- **Secondary Actions:** "Undo" (within a short window, in case of misclick)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR1. Success: S1 inline confirmation, status chip updates in place (visible on Calendar and Dashboard)
- **Permissions:** Receptionist and Admin; also surfaces read-only to the assigned Therapist (Dashboard "arrived" indicator) — Locked Decision 5's restricted-visibility indicator pattern (PR3) is reused here for a non-clinical purpose (arrival status), showing the pattern is general-purpose, not risk-specific
- **HIPAA/Privacy:** Check-in flag is logistics only, includes a timestamp for audit purposes (also relevant to billing/no-show policy)
- **Responsive:** Compact, works well as a single tap target on mobile/tablet at a front desk
- **Navigation:** Inline action, not a standalone destination

### 31. No-show State
- **Purpose:** Represent and record that a client did not arrive, distinct from Cancelled.
- **Role:** Receptionist, Therapist
- **Pattern:** State variant of Appointment Detail (27), triggered by an explicit action, not automatic
- **Entry:** Appointment Detail "Mark No-show" action, available once the appointment window has passed without check-in
- **Exit/Next:** Appointment shown as No-show on Calendar/Client Appointments; may trigger a follow-up-message automation
- **Layout:** Same as Appointment Detail with status chip changed to "No-show" (distinct color) + optional note field (internal)
- **Hierarchy:** Status chip communicates this at a glance across all list/calendar views
- **Sections:** Status update, optional note
- **Components:** Status chip (No-show, visually distinct from Cancelled), note field
- **Primary CTA:** "Mark as No-show"
- **Secondary Actions:** "Undo" (if marked in error, within policy window)
- **Filters/Search/Sort:** No-show is a filterable status on Calendar and Client Appointments (§0.7)
- **States:** Loading: L2. Empty: N/A. Error: ERR1. Success: S1 toast, triggers the Blueprint §19 "Missed appointment → Follow-up message" automation
- **Permissions:** Receptionist/Therapist can mark; visible clinic-wide for scheduling/billing-policy purposes (billing may apply a no-show fee, subject to Settings > Appointment Settings)
- **HIPAA/Privacy:** No-show status alone is not clinical information and can be visible to Billing Staff for fee purposes without exposing anything else about the appointment
- **Responsive:** Same as Appointment Detail
- **Navigation:** A status state of the existing Appointment record, not a new screen type

### 32. Completed Appointment
- **Purpose:** Represent the terminal successful state of an appointment and surface the next logical actions (documentation, billing).
- **Role:** Therapist, Receptionist, Billing Staff (billing-relevant fields only)
- **Pattern:** State variant of Appointment Detail (27)
- **Entry:** Automatic on session end, or manually marked by the Therapist
- **Exit/Next:** Create Clinical Note (59) if not already done, Billing (mark billable)
- **Layout:** Same Appointment Detail shell with status = Completed + a "Documentation" indicator (Note signed / Note pending) + billing status indicator
- **Hierarchy:** Documentation status is the most important follow-up signal for the Therapist; billing status matters more to Billing Staff
- **Sections:** Status, Documentation status, Billing status
- **Components:** Status chip, documentation-pending badge with "Write Note" shortcut, billing-status badge
- **Primary CTA:** "Write Note" (if pending) — surfaces here and on the Therapist Dashboard/Worklist, same deep link, not a duplicate editor
- **Secondary Actions:** "Mark Billable," "View Client Profile"
- **Filters/Search/Sort:** Completed appointments are filterable on Client > Appointments and on Calendar
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: N/A (this screen state is itself the successful outcome)
- **Permissions:** Billing Staff sees billing status only, not the documentation-pending indicator's clinical framing (it may appear generically as "session complete," without implying clinical detail)
- **HIPAA/Privacy:** Documentation-pending badge indicates status only ("Note pending"), never a content preview
- **Responsive:** Same as Appointment Detail
- **Navigation:** A status state of the existing Appointment record

### 33. Virtual Appointment / Join Session
- **Purpose:** Launch a virtual session directly from the appointment, keeping telehealth a capability of Schedule rather than a separate system (IA §15).
- **Role:** Therapist, Client
- **Pattern:** P-MODAL (pre-join check) leading to the video interface (out of scope for wireframing — third-party/embedded provider)
- **Entry:** Appointment Detail "Join" action (staff), Client Portal "Join Session" (client)
- **Exit/Next:** Pre-session Check (86) → Waiting Room (87) → Session End (89)
- **Layout:** Covered in detail under Phase 10 (screens 86–89); this entry point itself is a single button/action on Appointment Detail, active only within the clinic-configured join window (e.g., 10 minutes before start)
- **Hierarchy:** N/A (single action)
- **Sections:** N/A
- **Components:** "Join" button (disabled/hidden outside the join window, with a "Join opens 10 min before your session" note)
- **Primary CTA:** "Join Session"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 while launching. Empty: N/A. Error: ERR1 (connection failure — "Can't connect, try again" with a fallback phone-in note if configured). Success: transitions into the Waiting Room (87)
- **Permissions:** Only the assigned provider and the specific participant(s) on this appointment can join; a link is never guessable/shared
- **HIPAA/Privacy:** Video session itself is provider-abstracted per Blueprint §20 (vendor TBD, expected to be a BAA-covered, encrypted provider). **Product Owner decision: session recording is out of scope for V1** — this design includes no record/stop-recording controls and no recording-consent workflow anywhere in the telehealth flow (Phase 10); a future version that introduces recording would require its own dedicated consent workflow, not covered by this document
- **Responsive:** Full-screen on mobile once joined
- **Navigation:** Entry point only — see Phase 10 for the full flow

---

# PHASE 5 — Clients

The Client 360 (37) is the central contextual hub per the approved IA (§8). Every clinical/billing/forms screen below is either that hub's own tab or a cross-client aggregation of the same underlying data (per IA §1, §10).

### 34. Client List
- **Purpose:** Find and manage the clinic's client roster.
- **Role:** Receptionist, Therapist (scoped), Clinic Admin, Billing Staff (minimal fields)
- **Pattern:** P-TABLE
- **Entry:** Clients sidebar item
- **Exit/Next:** Client 360 (37), Create Client (36)
- **Layout:** Header ("New Client" button) + filter/search bar (35) + table: Name, Status (Active/Inactive/Discharged), Assigned Therapist, Next Appointment, Last Activity
- **Hierarchy:** Name and Status are the primary scan columns
- **Sections:** Filter bar, Client table
- **Components:** Table rows, status chip, avatar/initials, pagination controls
- **Primary CTA:** "New Client"
- **Secondary Actions:** Row click → Client 360; bulk actions (e.g., export list) for Admin only
- **Filters/Search/Sort:** See 35 (dedicated filter/search screen-behavior)
- **States:** Loading: L1. Empty: E1 ("No clients yet" + New Client CTA) or E2 (filtered to empty). Error: ERR1. Success: N/A
- **Permissions:** Therapist sees assigned clients only by default, with an additional "Shared with me" filter when cross-therapist permission is granted (Locked Decision 1); Receptionist/Billing see all clients but with reduced columns (Billing: name, status, balance only — no "Assigned Therapist" framing beyond what's needed for scheduling context)
- **HIPAA/Privacy:** No clinical summary (diagnosis, risk) appears in table columns for any role — this is a roster view, not a clinical list; Client Search results (35) follow the same rule
- **Responsive:** Table converts to a stacked card list on mobile (name, status, next appointment)
- **Navigation:** Root of the Clients module; every other Phase 5 screen is reached from a row here

### 35. Client Search / Filters
- **Purpose:** Narrow the Client List efficiently for reception (volume) and therapists (own caseload).
- **Role:** Receptionist, Therapist, Clinic Admin, Billing Staff
- **Pattern:** Control bar attached to P-TABLE (34), not a separate page
- **Entry:** Always visible atop Client List
- **Exit/Next:** Filters the table in place
- **Layout:** Search input (name/phone/email) + filter chips (Status, Assigned Therapist, Service) + Clear-all
- **Hierarchy:** Search box first (fastest path for a known client), filters second (browsing/queue-building)
- **Sections:** Search input, Filter chip row
- **Components:** Search-as-you-type input, multi-select filter chips, result count
- **Primary CTA:** N/A (search is live, no submit button)
- **Secondary Actions:** "Clear filters"
- **Filters/Search/Sort:** Status, Assigned Therapist (Admin/Reception only), Service type; sort by Name/Last Activity/Next Appointment
- **States:** Loading: L2 (debounced live search). Empty: E2 ("No matches — clear filters"). Error: ERR1. Success: N/A
- **Permissions:** Search results respect the same per-role scoping as the underlying Client List (§0.8 PR2) — a Therapist's search never surfaces a client outside their permitted scope
- **HIPAA/Privacy:** Search matches on name/contact fields only, never full-text clinical content (consistent with IA §22 Global Search rules)
- **Responsive:** Filter chips collapse into a "Filters" button opening a sheet on mobile
- **Navigation:** Not a standalone screen — a persistent control on Client List (34) and reused identically on Leads Pipeline (49) and Invoice List (91)

### 36. Create Client
- **Purpose:** Register a new client directly (bypassing the Lead pipeline — for walk-ins, phone bookings, or referrals reception enters manually).
- **Role:** Receptionist, Clinic Admin
- **Pattern:** P-FORM
- **Entry:** Client List "New Client," Convert Lead to Client (55, pre-filled)
- **Exit/Next:** Client 360 (37) for the new record
- **Layout:** Header + form: Name, DOB, Contact info, Assigned Therapist, Service, Payer Type (Self-Pay/Insurance/Other — Locked Decision 6), Status (defaults to Active)
- **Hierarchy:** Identity fields first, then care-assignment fields, then billing metadata
- **Sections:** Identity, Contact, Care Assignment, Billing Basics
- **Components:** Text/date inputs, therapist selector, payer-type select, submit button
- **Primary CTA:** "Create Client"
- **Secondary Actions:** "Cancel" (C2 if fields filled)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2 (validation, incl. duplicate-detection warning if a close name/contact match already exists — prevents duplicate records per IA §8 lead-conversion principle). Success: S2, redirects to the new Client 360
- **Permissions:** Receptionist and Admin only
- **HIPAA/Privacy:** Only identity, contact, and administrative fields are collected here — no clinical intake content; this form explicitly does not include diagnosis or history fields
- **Responsive:** Form stacks vertically
- **Navigation:** Creates the single Client record referenced everywhere else in Phase 5

### 37. Client 360 Overview
- **Purpose:** The central hub — everything about one client, entry point to every clinical/operational tab.
- **Role:** All internal roles (content varies sharply by role — see IA §8, §21)
- **Pattern:** P-DETAIL (tabbed)
- **Entry:** Client List, Calendar (via appointment), Search, deep links from Clinical Care/Billing/Forms worklists
- **Exit/Next:** Any tab (38–48); Book Appointment, New Note, Send Message, etc. (contextual actions)
- **Layout:** Header (name, status chip, assigned therapist, risk/safety banner if active — Locked Decision 5) + tab bar (Overview, Timeline, Appointments, Clinical Notes, Assessments, Treatment Plans, Forms, Consent, Documents, Messages, Billing) + Overview tab content: demographics, active diagnoses, active treatment plan summary, next appointment, recent activity snippet
- **Hierarchy:** Risk/safety banner (if active) is the single most prominent element when present, above even the name header, per Locked Decision 5's authorized-workflow visibility; otherwise name/status header leads, then next appointment, then clinical summary
- **Sections:** Header/banner, Tab bar, Overview panels (Demographics, Active Care Summary, Next Appointment, Recent Activity)
- **Components:** Tab navigation, risk banner (PR3-style indicator, detail requires clinical-role permission), summary cards, contextual action buttons
- **Primary CTA:** Role-dependent — "New Note" (Therapist), "Book Appointment" (Receptionist), "Record Payment" (Billing Staff)
- **Secondary Actions:** "Change Client Status," "Send Message," "Assign Assessment/Form"
- **Filters/Search/Sort:** N/A (this is a single-record detail page)
- **States:** Loading: L1 (header first, then tab content). Empty: N/A (a client always has at least identity data). Error: ERR1 or ERR3 (if the requesting role lacks any access at all — should not normally occur since Client List already scopes visibility, but guards direct-link access). Success: S1 toasts for inline actions (status change, etc.)
- **Permissions:** Full tab set for Therapist (assigned or permitted-shared client) and Admin; Receptionist sees Overview (reduced fields, no diagnosis/plan summary), Appointments, Forms (status only), Consent (status only), Messages, Billing — Clinical Notes/Assessments/Treatment Plan tabs are absent (PR1), not locked; Billing Staff sees Overview (name/contact/status/balance only), Appointments (read-only), Billing
- **HIPAA/Privacy:** This is the highest-sensitivity screen in the product — role-based tab visibility (PR1/PR2) is enforced identically regardless of entry point (direct link, search result, or worklist deep link); risk banner detail is gated per Locked Decision 5
- **Responsive:** Tab bar becomes a horizontally-scrollable strip on tablet, a dropdown selector on mobile; header/banner stay pinned
- **Navigation:** The hub all Phase 5 screens attach to — no tab here duplicates a global module's editing surface (per IA §10)

### 38. Client Appointments
- **Purpose:** This client's appointment history and upcoming schedule.
- **Role:** All roles with Client 360 access
- **Pattern:** P-LIST (filtered view of Schedule, per IA §7)
- **Entry:** Client 360 tab bar
- **Exit/Next:** Appointment Detail (27), Create Appointment (26, pre-filled to this client)
- **Layout:** Tab content: Upcoming section (next appointment prominent) + History list (past appointments with status)
- **Hierarchy:** Upcoming first, History below, most recent first
- **Sections:** Upcoming, History
- **Components:** Appointment row (date, time, provider, status, format), "Book Appointment" button
- **Primary CTA:** "Book Appointment"
- **Secondary Actions:** Row click → Appointment Detail
- **Filters/Search/Sort:** Filter by status (Completed/Cancelled/No-show); date-range for history
- **States:** Loading: L1. Empty: E1 ("No appointments yet" + Book CTA). Error: ERR1. Success: N/A
- **Permissions:** Billing Staff sees this tab read-only, no booking action
- **HIPAA/Privacy:** Shows scheduling data only, no session content
- **Responsive:** List stacks; standard mobile list pattern
- **Navigation:** A filtered view of the single Schedule source of truth (IA §1) — never a second appointment record

### 39. Client Clinical Notes
- **Purpose:** This client's session documentation — the authoring surface for Clinical Notes (IA §10).
- **Role:** Therapist (assigned/permitted), Clinic Admin
- **Pattern:** P-LIST leading to P-DETAIL (60)
- **Entry:** Client 360 tab bar, Completed Appointment "Write Note" shortcut, Clinical Care Worklist deep link
- **Exit/Next:** Create Clinical Note (59), Clinical Note Detail (60)
- **Layout:** Tab content: chronological list of notes (date, appointment linked, template type, sign status) + "New Note" button
- **Hierarchy:** Most recent note first; unsigned notes visually flagged
- **Sections:** Notes list
- **Components:** Note row (date, template badge — SOAP/DAP/BIRP/GIRP/Narrative/Custom, status chip: Draft/Signed), "New Note" button
- **Primary CTA:** "New Note"
- **Secondary Actions:** Row click → Note Detail; "Continue Draft" for unsigned notes
- **Filters/Search/Sort:** Filter by template type, date range, signed/unsigned
- **States:** Loading: L1. Empty: E1 ("No clinical notes yet" + New Note CTA). Error: ERR1. Success: N/A
- **Permissions:** **Entirely absent (PR1)** for Receptionist and Billing Staff — not a tab they see at all, per IA §8/§21
- **HIPAA/Privacy:** Highest-sensitivity list in the product; every access is audit-logged; note content itself is not previewed in the list row (title/template/status only)
- **Responsive:** List stacks; note editor (60) goes full-screen on mobile
- **Navigation:** Feeds Create/Detail Note; also visible cross-client (aggregated, not duplicated) at Clinical Care > Clinical Notes (58)

### 40. Client Assessments
- **Purpose:** This client's assigned, pending, and completed assessments with score history.
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Client 360 tab bar, Assessment Library deep link
- **Exit/Next:** Client Assessment (62, to complete/review), Assessment Results (63), Assessment History (64)
- **Layout:** Tab content: Assigned/Pending section + Completed section with score trend mini-chart per instrument (e.g., PHQ-9 over time, per Blueprint §15) + "Assign Assessment" button
- **Hierarchy:** Pending items first (need action), then completed history with trends
- **Sections:** Pending, Completed & Trends
- **Components:** Assessment row, trend sparkline, "Assign Assessment" button, score badge
- **Primary CTA:** "Assign Assessment"
- **Secondary Actions:** Row click → results/history detail
- **Filters/Search/Sort:** Filter by instrument, status
- **States:** Loading: L1. Empty: E1 ("No assessments assigned yet" + Assign CTA). Error: ERR1. Success: S1 toast on assignment
- **Permissions:** Absent (PR1) for Receptionist and Billing Staff
- **HIPAA/Privacy:** Scores are clinical data; same audit/access rules as Clinical Notes
- **Responsive:** Trend charts simplify to a compact sparkline on mobile; list stacks
- **Navigation:** Client-scoped view of the same results aggregated at Clinical Care > Assessments (61–64)

### 41. Client Treatment Plans
- **Purpose:** This client's treatment plan(s) — supporting multiple plans with only relevant ones active (Locked Decision 4).
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-LIST leading to P-DETAIL (67)
- **Entry:** Client 360 tab bar, Clinical Care > Treatment Plans deep link
- **Exit/Next:** Create Treatment Plan (66), Treatment Plan Detail (67)
- **Layout:** Tab content: **Active Plan(s)** section (prominent, one card per active plan — e.g., separate plans for Individual vs. Couples engagements) + **Inactive/Completed Plans** section (collapsed by default, historical)
- **Hierarchy:** Active plan(s) dominant and expanded by default; history collapsed to avoid clutter, per the "only relevant plans should be active" decision
- **Sections:** Active Plans, Plan History (collapsed)
- **Components:** Plan card (problem/goal summary, service/engagement tag, target/review dates, status), "New Plan" button, "View History" toggle
- **Primary CTA:** "New Treatment Plan"
- **Secondary Actions:** Card click → Plan Detail; "Mark Inactive" / "Reactivate" per plan
- **Filters/Search/Sort:** Filter history by date/service
- **States:** Loading: L1. Empty: E1 ("No treatment plan yet" + New Plan CTA). Error: ERR1. Success: S1 toast on status changes
- **Permissions:** Absent (PR1) for Receptionist and Billing Staff
- **HIPAA/Privacy:** Same clinical-data protections as Clinical Notes
- **Responsive:** Cards stack; history section remains collapsed by default on mobile to save space
- **Navigation:** Client-scoped authoring surface; Clinical Care > Treatment Plans (65) is the cross-client list that deep-links back here, never a second editor (IA §12)

### 42. Client Goals & Outcomes
- **Purpose:** Progress view — read-oriented tracking of goal status and outcome trends, as a sub-view of Treatment Plan (per IA §8, merged rather than a separate tab).
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-DETAIL sub-view (nested under Treatment Plan, 41/67), not an independent tab
- **Entry:** Treatment Plan Detail "Progress & Outcomes" sub-tab
- **Exit/Next:** Back to Plan (definition sub-view), Client Assessments (for score detail)
- **Layout:** Goal status list (On Track/At Risk/Achieved per goal) + outcome trend charts (linked assessment scores over time) + session-milestone markers
- **Hierarchy:** Overall progress summary first, then per-goal detail, then trend charts
- **Sections:** Progress summary, Per-goal status, Outcome trends
- **Components:** Progress status chips, trend charts, milestone timeline markers
- **Primary CTA:** "Update Progress" (opens the Plan definition sub-view to log a status change — this view itself stays read-oriented)
- **Secondary Actions:** "View Assessment Detail"
- **Filters/Search/Sort:** Date-range on trend charts
- **States:** Loading: L1. Empty: E1 ("No goals defined yet — add goals in the Treatment Plan"). Error: ERR1. Success: N/A (read view)
- **Permissions:** Same as Treatment Plan (absent for Reception/Billing)
- **HIPAA/Privacy:** Same protections as Treatment Plan
- **Responsive:** Charts simplify on mobile; goal list stacks
- **Navigation:** Confirmed as a sub-view, not a duplicate top-level screen — listed here (per the task's screen enumeration) but implemented as part of screen 67, consistent with the approved IA's explicit merge decision

### 43. Client Forms
- **Purpose:** This client's assigned and completed forms (intake, consent, questionnaires, custom) — supports multiple intake cycles/re-intakes (Locked Decision 3).
- **Role:** Receptionist (status only), Therapist, Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Client 360 tab bar, Forms & Documents pending-queue deep link
- **Exit/Next:** Assign Form (73), Client Form Completion (74, staff-preview or client-facing)
- **Layout:** Tab content: Outstanding section + Completed section, grouped by **intake cycle** where more than one exists (e.g., "Initial Intake — 2025," "Re-intake — 2026") so history doesn't blur together
- **Hierarchy:** Outstanding items first; completed history grouped by cycle, most recent cycle expanded
- **Sections:** Outstanding, Completed (by cycle)
- **Components:** Form row (name, cycle tag, status: Not Started/In Progress/Complete), "Assign Form" button, "Start New Intake Cycle" action (links to 56)
- **Primary CTA:** "Assign Form"
- **Secondary Actions:** "Start Re-intake," row click → response detail
- **Filters/Search/Sort:** Filter by cycle, status, form type
- **States:** Loading: L1. Empty: E1 ("No forms assigned yet"). Error: ERR1. Success: S1 toast on assignment
- **Permissions:** Receptionist sees status only (PR2 — Not Started/In Progress/Complete, no response content); Therapist/Admin see full responses where clinically relevant (e.g., questionnaire answers)
- **HIPAA/Privacy:** Response content for clinical questionnaires is treated with the same protection as Assessments; Consent forms specifically are also mirrored on the dedicated Consent tab (47) for compliance visibility, per IA §13
- **Responsive:** List stacks; cycle grouping collapses to accordion sections on mobile
- **Navigation:** Client-scoped responses; Forms & Documents module (70–79) owns templates/library, not responses (IA §13)

### 44. Client Documents
- **Purpose:** Unstructured files associated with this client.
- **Role:** Receptionist (upload/view non-clinical), Therapist, Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Client 360 tab bar
- **Exit/Next:** Document Detail (77), Upload Document (78)
- **Layout:** Tab content: file list (name, type, uploaded by, date) + "Upload" button
- **Hierarchy:** Most recently uploaded first
- **Sections:** Document list
- **Components:** File row (icon by type, name, size, uploader, date), "Upload" button
- **Primary CTA:** "Upload Document"
- **Secondary Actions:** Row click → Document Detail; download/view action
- **Filters/Search/Sort:** Filter by uploader, type; search by filename
- **States:** Loading: L1. Empty: E1 ("No documents yet" + Upload CTA). Error: ERR1 (upload failure — retry). Success: S1 toast on upload
- **Permissions:** A document can itself be tagged clinical or administrative at upload time; Receptionist sees administrative documents only (PR2), clinically-tagged documents are absent from their view (PR1)
- **HIPAA/Privacy:** Every document view/download is audit-logged (§0.11); file storage is encrypted at rest (backend concern, noted here as a screen-level expectation)
- **Responsive:** List stacks; upload uses the device's native file picker on mobile
- **Navigation:** Client-scoped files; Forms & Documents module owns clinic-wide templates, not client files (IA §13)

### 45. Client Messages
- **Purpose:** Secure messages with this client — a filtered view of the global Communications inbox (IA §14).
- **Role:** Therapist, Receptionist, Clinic Admin
- **Pattern:** P-TIMELINE (thread list within the tab)
- **Entry:** Client 360 tab bar
- **Exit/Next:** Message Thread (81), Compose Message (82)
- **Layout:** Tab content: message thread(s) with this client, most recent first + "New Message" action
- **Hierarchy:** Most recent message/thread at top
- **Sections:** Thread list (usually a single ongoing thread per client)
- **Components:** Message bubbles/preview rows, compose box
- **Primary CTA:** "New Message"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** Search within thread
- **States:** Loading: L1. Empty: E1 ("No messages yet" + New Message CTA). Error: ERR1 (send failure — retry, message not lost). Success: S1 (message sent indicator)
- **Permissions:** Billing Staff has no access to this tab by default (per IA §21, unless a billing-specific thread exception is configured)
- **HIPAA/Privacy:** Message content is PHI-capable — never surfaced in notification previews (§0.11); this tab is the same underlying data as Communications > Inbox (14), filtered, not duplicated
- **Responsive:** Standard chat-thread mobile pattern
- **Navigation:** Filtered view of Communications (IA §14) — no separate message store

### 46. Client Billing
- **Purpose:** This client's invoices, payments, and balance — a filtered view of the global Billing ledger (IA §16).
- **Role:** Billing Staff (full), Clinic Admin (full), Therapist (read-only balance), Receptionist (create/view invoice, take payment)
- **Pattern:** P-LIST
- **Entry:** Client 360 tab bar
- **Exit/Next:** Invoice Detail (93), Create Invoice (92), Payment (94)
- **Layout:** Tab content: current balance summary (prominent) + invoice list + payment history
- **Hierarchy:** Balance summary first, then invoices, then payment history
- **Sections:** Balance summary, Invoices, Payment history
- **Components:** Balance card, invoice row (date, amount, status, payer type), "New Invoice" / "Record Payment" buttons
- **Primary CTA:** "Record Payment" (Billing/Reception) or none (Therapist, read-only)
- **Secondary Actions:** "New Invoice," row click → Invoice Detail
- **Filters/Search/Sort:** Filter by status (Paid/Outstanding), date range
- **States:** Loading: L1. Empty: E1 ("No billing activity yet"). Error: ERR1. Success: S1 toast on payment recorded
- **Permissions:** Therapist sees balance figure only, no invoice line-item editing (per IA §21)
- **HIPAA/Privacy:** Billing data references service names (e.g., "Individual Therapy Session") but not diagnosis/note content; payer type shown per Locked Decision 6 without any claims-processing fields
- **Responsive:** List stacks; balance summary stays pinned at top on mobile
- **Navigation:** Filtered view of the global Billing module (90–97), not a second ledger

### 47. Client Consent
- **Purpose:** Signed consent documents, versions, and status — kept visible as its own tab for compliance reasons even though it shares infrastructure with Forms (IA §8, §13).
- **Role:** Receptionist (status only), Therapist, Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Client 360 tab bar
- **Exit/Next:** Consent Form (75) to review/re-sign
- **Layout:** Tab content: current consent status (signed/outstanding, version, date) + history of prior versions
- **Hierarchy:** Current/active consent status first, most prominent; history below
- **Sections:** Current consent, History
- **Components:** Consent status card, version history list, "Request Signature" button (if outstanding)
- **Primary CTA:** "Request Signature" (if outstanding)
- **Secondary Actions:** "View Signed Document"
- **Filters/Search/Sort:** N/A (typically a short list)
- **States:** Loading: L1. Empty: E1 ("No consent on file — request signature" — flagged prominently, this is a compliance gap, not a neutral empty state). Error: ERR1. Success: S1 toast on request sent
- **Permissions:** Receptionist sees status only (signed/outstanding + date), not document content (PR2). For a client with a Guardian/Authorized Representative on file (Product Owner decision, screen 75), this tab shows the guardian's name/relationship alongside the consent record; a guardian's own portal account, if granted, sees only this tab's equivalent in the Client Portal (123) — never any clinical tab.
- **HIPAA/Privacy:** Signed consent documents are legally significant records — access is audit-logged; version history is immutable (no overwriting a prior signed version)
- **Responsive:** List stacks
- **Navigation:** Shares template/e-signature infrastructure with Forms & Documents (70–79) but stays a distinct tab for compliance visibility, per IA §13

### 48. Client Timeline
- **Purpose:** Full chronological activity feed across every module, for reconstructing "what happened and when" at a glance.
- **Role:** Therapist, Clinic Admin (Receptionist/Billing see a reduced-event-type feed consistent with their tab access)
- **Pattern:** P-TIMELINE
- **Entry:** Client 360 tab bar
- **Exit/Next:** Deep links into whichever tab/record an event belongs to (note, appointment, invoice, message, form)
- **Layout:** Vertical chronological feed, most recent first, each entry showing event type icon, short label, timestamp, and actor
- **Hierarchy:** Recency is the only ordering — no re-sorting by importance
- **Sections:** Chronological feed (infinite scroll)
- **Components:** Timeline entry (icon, label, timestamp, actor, deep-link), event-type filter chips
- **Primary CTA:** N/A (read-only feed)
- **Secondary Actions:** Filter by event type (Appointments, Notes, Forms, Billing, Messages)
- **Filters/Search/Sort:** Event-type filter, date-range
- **States:** Loading: L1 initial, L3 progressive on scroll. Empty: E1 ("No activity yet"). Error: ERR1. Success: N/A
- **Permissions:** Reduced-visibility roles see only event types their tab access already permits (e.g., Receptionist's Timeline never shows a "Clinical Note signed" entry) — PR2 applied at the event-type level, not a redacted feed
- **HIPAA/Privacy:** Timeline entries show event *type* and metadata, not content (e.g., "Clinical note signed" not the note text) — clicking through still passes the normal tab-level permission check
- **Responsive:** Feed remains single-column at all breakpoints (it's already a vertical list)
- **Navigation:** A read-only aggregation view — every entry deep-links to its true source-of-truth tab, never a second record (IA §1)

---

# PHASE 6 — Intake & Leads

Implements the lifecycle `New Inquiry → Contacted → Interested → Appointment Requested → Booked → Intake → Client` (IA §9) as one combined module, and supports re-intake cycles for existing clients (Locked Decision 3).

### 49. Leads / New Inquiries
- **Purpose:** Reception's pipeline view of everyone who has expressed interest but isn't yet a Client.
- **Role:** Receptionist, Clinic Admin
- **Pattern:** P-WORKLIST — a searchable/filterable list with stage filters. **Product Owner decision:** this is the sole V1 pattern; a kanban/drag-between-stages board is explicitly not used
- **Entry:** Intake & Leads sidebar item, Reception Dashboard "New Inquiries" widget
- **Exit/Next:** Lead Detail (50)
- **Layout:** Header ("New Lead" manual-entry button) + search box + stage filter (tabs or dropdown: New Inquiry, Contacted, Interested, Appointment Requested, Booked, Intake Started — a filter dimension on one list, not separate kanban columns) + single sortable/searchable lead list
- **Hierarchy:** Oldest-untouched leads surfaced first within the current stage filter (risk of going cold)
- **Sections:** Search & stage filter, Lead list
- **Components:** Lead row (name, contact, source, stage, days-in-stage), stage-change control (dropdown/menu on the row — no drag-and-drop)
- **Primary CTA:** "New Lead" (manual entry, e.g., phone inquiry)
- **Secondary Actions:** Row click → Lead Detail; change-stage action via the row's dropdown/menu
- **Filters/Search/Sort:** Filter by source (website/phone/referral), sort by days-in-stage
- **States:** Loading: L1. Empty: E3 ("No new inquiries" — positive framing). Error: ERR1. Success: S1 toast on stage change
- **Permissions:** Receptionist and Admin only — absent from Therapist/Billing navigation entirely (IA §9)
- **HIPAA/Privacy:** Contact/inquiry info only, no clinical content; a lead's free-text inquiry message (from Contact form, screen 08) is visible here but the UI reminds staff not to add clinical detail into lead notes
- **Responsive:** Stage tabs become a dropdown selector on mobile; cards stack
- **Navigation:** Root of the Intake & Leads module

### 50. Lead Detail
- **Purpose:** Full context on one lead and the actions to move them forward.
- **Role:** Receptionist, Clinic Admin
- **Pattern:** P-DETAIL
- **Entry:** Leads pipeline row click
- **Exit/Next:** Convert to Client (55), Create Appointment (26)
- **Layout:** Header (name, stage chip, source) + contact info + inquiry notes + activity log (contact attempts) + stage-progression actions
- **Hierarchy:** Stage and next action are most prominent
- **Sections:** Contact info, Inquiry notes, Activity log, Stage actions
- **Components:** Stage progression control, "Log Contact Attempt" action, "Book Appointment" button, "Convert to Client" button (enabled once eligible — e.g., appointment booked)
- **Primary CTA:** Stage-appropriate — "Book Appointment" (early stages) or "Convert to Client" (post-booking/intake stages)
- **Secondary Actions:** "Log Contact Attempt," "Mark Not Interested" (archives the lead)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: S1 toast on actions
- **Permissions:** Receptionist and Admin only
- **HIPAA/Privacy:** Same data-minimization rule as the pipeline list
- **Responsive:** Stacks vertically on mobile
- **Navigation:** Child of Leads pipeline; "Convert to Client" is the bridge into Phase 5

### 51. Appointment Requests
- **Purpose:** Same screen as Phase 4's screen 25 — a request generated by a Lead surfaces here and on Schedule identically (one Appointment record, two entry points, per IA §19).
- **Role:** Receptionist
- **Pattern:** P-WORKLIST
- **Entry:** Leads Pipeline "Appointment Requested" stage, Schedule > Appointment Requests
- **Exit/Next:** Appointment Detail (27); advances the linked Lead's stage automatically on confirm
- **Layout / Components / States / Permissions / HIPAA / Responsive:** Identical to screen 25 — documented once there to avoid a duplicate spec, per the "no duplicate feature ownership" navigation rule
- **Navigation:** Cross-referenced from both Intake & Leads and Schedule; not a second record or a second screen implementation

### 52. Intake Pending
- **Purpose:** Reception's queue of clients/leads who have an appointment booked but haven't completed required intake forms.
- **Role:** Receptionist, Clinic Admin
- **Pattern:** P-WORKLIST
- **Entry:** Intake & Leads module, Reception Dashboard "Intake Pending" widget
- **Exit/Next:** Lead Detail (50) or Client Forms (43) depending on conversion status; "Send Reminder" action
- **Layout:** Header + list: name, appointment date, forms outstanding count, days until appointment
- **Hierarchy:** Soonest appointment date first (most urgent to chase)
- **Sections:** Pending intake list
- **Components:** Row (name, appt date, outstanding count badge), "Send Reminder" button
- **Primary CTA:** "Send Reminder" (per row or bulk)
- **Secondary Actions:** Row click → Lead Detail or Client Forms
- **Filters/Search/Sort:** Sort by appointment date (soonest first, default), filter by days-outstanding
- **States:** Loading: L1. Empty: E3 ("Everyone's intake is up to date"). Error: ERR1. Success: S1 toast on reminder sent
- **Permissions:** Receptionist and Admin
- **HIPAA/Privacy:** Shows completion status/counts only, never form content (PR2, consistent with Client Forms tab's reception view)
- **Responsive:** List stacks
- **Navigation:** Aggregates the same underlying Forms & Documents data shown per-client on screen 43 — a queue, not a duplicate store

### 53. Intake In Progress
- **Purpose:** Track a client actively completing their intake forms (partial completion state).
- **Role:** Receptionist, Clinic Admin (staff-facing status view); Client sees the actual form via Client Form Completion (74)
- **Pattern:** State variant of Intake Pending (52) row, or a detail expansion of Lead Detail/Client Forms
- **Entry:** Intake Pending list, Lead Detail
- **Exit/Next:** Intake Completion (54) once all items are done
- **Layout:** Per-form progress indicator (e.g., "3 of 4 sections complete") rather than a separate full-page screen
- **Hierarchy:** Progress fraction is the single key data point
- **Sections:** Progress indicator, outstanding items list
- **Components:** Progress bar/fraction, outstanding-item list
- **Primary CTA:** "Send Reminder"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: transitions automatically to Intake Completion (54) when the last item finishes
- **Permissions:** Receptionist sees progress only, never partial-response content
- **HIPAA/Privacy:** Progress fraction only — no partial answers are visible to staff mid-completion
- **Responsive:** Compact, fits inline in a list row or detail panel
- **Navigation:** A status state, not a standalone destination

### 54. Intake Completion
- **Purpose:** Confirm all required intake items are done and the client is ready for their first session.
- **Role:** Receptionist, Clinic Admin, Therapist (notified)
- **Pattern:** State variant / S2-style confirmation within Lead Detail or Client Forms
- **Entry:** Automatic when the last outstanding intake item completes
- **Exit/Next:** Convert to Client (55) if not already converted; otherwise the client's Forms tab (43) simply reflects "Complete"
- **Layout:** Status banner "Intake complete" + summary of what was completed + prompt to convert (if still a Lead)
- **Hierarchy:** Completion confirmation first, conversion prompt second
- **Sections:** Completion summary, Convert prompt (if applicable)
- **Components:** Status banner, "Convert to Client" button (if applicable)
- **Primary CTA:** "Convert to Client" (if still a Lead) or none (already a Client)
- **Secondary Actions:** "View Forms"
- **Filters/Search/Sort:** N/A
- **States:** This screen state *is* the Success state (S2) for the intake sub-flow
- **Permissions:** Receptionist and Admin
- **HIPAA/Privacy:** Confirms completion status only
- **Responsive:** Standard confirmation-banner layout
- **Navigation:** Bridges directly into Convert to Client (55)

### 55. Convert Lead to Client
- **Purpose:** Promote a Lead into a full Client record without creating a duplicate (IA §9 — the Lead is promoted, not copied).
- **Role:** Receptionist, Clinic Admin
- **Pattern:** P-FORM (pre-filled confirmation, not a blank form)
- **Entry:** Lead Detail "Convert to Client," Intake Completion prompt
- **Exit/Next:** Client 360 (37) for the newly-created Client record
- **Layout:** Pre-filled review form: contact info (from the Lead, editable), assigned therapist, service, payer type, status (defaults Active) + a visible "Source: [Website inquiry / Phone / Referral], [date]" field that will persist onto the new Client's Overview
- **Hierarchy:** Review-and-confirm framing, not "start from scratch"
- **Sections:** Review fields, Source metadata
- **Components:** Pre-filled inputs, "Confirm & Convert" button
- **Primary CTA:** "Confirm & Convert"
- **Secondary Actions:** "Cancel" (returns to Lead Detail, Lead unchanged)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2 (validation) or a duplicate-match warning (same detection as Create Client, 36) if a Client record already appears to exist for this contact — surfaces a "Link to existing Client instead?" option to guarantee no duplicate records are created. Success: S2, redirects to the new Client 360
- **Permissions:** Receptionist and Admin
- **HIPAA/Privacy:** The Lead's inquiry notes are not automatically copied into any clinical field — they remain as non-clinical "Source" metadata only
- **Responsive:** Standard form layout
- **Navigation:** Terminal step of the Lead lifecycle; the Lead record becomes historical/archived, linked from the new Client's Overview

### 56. Re-intake / New Intake Cycle
- **Purpose:** Support existing clients who need a new intake cycle later — e.g., returning after a gap in care, a required periodic clinical update, or simply refreshed contact/insurance information (Locked Decision 3). **Product Owner decision:** this splits into two distinct cycle types with different initiators and different form-sets.
- **Role:** Therapist, Clinic Admin (**Clinical Re-intake**); Receptionist, Clinic Admin (**Administrative Re-intake** only); Client completes the actual forms via Portal
- **Pattern:** P-MODAL (initiation) leading into the same Client Form Completion flow (74) used for first-time intake
- **Entry:** Client 360 > Forms tab "Start Re-intake" action
- **Exit/Next:** Client Forms (43), now showing a second cycle grouped separately from the original
- **Layout:** Modal: "Start a new intake cycle for [Client]?" + **Cycle Type selector** — *Clinical Re-intake* (visible only to Therapist/Admin; form-set may include clinical questionnaires and assessments) or *Administrative Re-intake* (visible to Receptionist/Admin; form-set is restricted to non-clinical items only — contact info, insurance/payer update, general administrative consent) + form-set selector (options shown depend on the chosen Cycle Type) + reason (Returning client / Periodic clinical update / Contact & Insurance Update / Other)
- **Hierarchy:** Cycle Type is the first decision, since it gates every option after it
- **Sections:** Cycle Type, Reason, Form-set selection
- **Components:** Cycle Type toggle (role-gated — Receptionist never sees the Clinical option at all), reason dropdown, form checklist selector, "Start Cycle" button
- **Primary CTA:** "Start Intake Cycle"
- **Secondary Actions:** "Cancel"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR1. Success: S1 toast, new cycle appears on Client Forms (43) and the client is notified to complete it
- **Permissions:** Therapist/Admin can initiate either cycle type; Receptionist can initiate **Administrative Re-intake only** — the Cycle Type selector and form-set selector present just one option to Receptionist, with Clinical Re-intake and all clinical questionnaire items entirely absent (PR1), not merely disabled or unselectable. Receptionist cannot view or configure clinical questionnaire content anywhere in this flow.
- **HIPAA/Privacy:** Prior intake cycles remain intact and separately viewable — a new cycle never overwrites history; Administrative cycles initiated by Receptionist are enforced at the form-set level to never include clinical content, not merely by staff training/convention
- **Responsive:** Standard modal
- **Navigation:** Reuses the existing Forms infrastructure (Phase 8) rather than creating a parallel intake system, consistent with IA §13

---

# PHASE 7 — Clinical Care

Clinical Care is the cross-client worklist and template library; all client-specific authoring happens on the corresponding Client 360 tab (IA §10). Screens below are documented once and cross-referenced rather than duplicated where they are the same authoring surface reached from two entry points.

### 57. Clinical Care Worklist
- **Purpose:** A therapist's single view of everything outstanding across their whole caseload.
- **Role:** Therapist (own worklist, plus permitted-shared items per Locked Decision 1), Clinic Admin (oversight, all providers)
- **Pattern:** P-WORKLIST
- **Entry:** Clinical Care sidebar item (default landing tab), Dashboard "Clinical Tasks" widget
- **Exit/Next:** Deep-links into the relevant Client 360 tab (Clinical Notes, Assessments, or Treatment Plan) — never its own inline editor
- **Layout:** Header + grouped sections: Unsigned Notes, Assessments Due, Treatment Plans Due for Review, each as a count-badged list
- **Hierarchy:** Oldest/most-overdue items first within each group
- **Sections:** Unsigned Notes, Assessments Due, Plans Due for Review
- **Components:** Task row (client name, item type, due/overdue indicator), deep-link action
- **Primary CTA:** N/A (a worklist of many small actions, not one dominant CTA)
- **Secondary Actions:** Row click → Client 360 tab, pre-scrolled/opened to the relevant item
- **Filters/Search/Sort:** Filter by task type; for Admin, filter by provider
- **States:** Loading: L1 per group. Empty: E3 ("You're caught up" — per group and overall). Error: ERR1 per group. Success: N/A (items simply leave the list once resolved)
- **Permissions:** Therapist sees own caseload by default; Admin sees all providers' worklists with a provider filter; Reception/Billing have no access to this module at all (IA §10, §21)
- **HIPAA/Privacy:** Row text is item-type + client name only ("Unsigned note — [Client]"), no content preview
- **Responsive:** Groups stack; each becomes a collapsible section on mobile
- **Navigation:** Root of Clinical Care; every item resolves in the Client 360, per the worklist/library boundary (IA §10)

### 58. Clinical Notes List (Cross-Client)
- **Purpose:** Searchable list of clinical notes across the whole caseload, for finding a specific note without navigating client-by-client.
- **Role:** Therapist (own caseload), Clinic Admin
- **Pattern:** P-TABLE
- **Entry:** Clinical Care sidebar > Clinical Notes
- **Exit/Next:** Clinical Note Detail (60) — same detail screen as reached from Client 360, not a duplicate
- **Layout:** Header + search/filter bar (client, date range, template type, signed status) + table (client, date, template, status)
- **Hierarchy:** Most recent first by default
- **Sections:** Filter bar, Notes table
- **Components:** Table rows, filter chips, search box
- **Primary CTA:** N/A (a browse/search surface)
- **Secondary Actions:** Row click → Note Detail
- **Filters/Search/Sort:** Client, date range, template type, signed/unsigned; sort by date
- **States:** Loading: L1. Empty: E1 or E2 (filtered). Error: ERR1. Success: N/A
- **Permissions:** Scoped to permitted clients only (Locked Decision 1); Reception/Billing absent entirely
- **HIPAA/Privacy:** Same list-row minimization as Client Clinical Notes (39) — no content preview; every open is audit-logged
- **Responsive:** Table → card list on mobile
- **Navigation:** A cross-client aggregation of the exact same records shown on each Client 360 > Clinical Notes tab (IA §10) — opening a row leads to the one true Note Detail screen (60)

### 59. Create Clinical Note
- **Purpose:** Author a new session note, choosing among configurable documentation styles.
- **Role:** Therapist
- **Pattern:** P-FORM (template-driven)
- **Entry:** Client 360 > Clinical Notes "New Note," Completed Appointment "Write Note" shortcut, Dashboard/Worklist deep link
- **Exit/Next:** Clinical Note Detail (60) in Draft, or Signed & Locked
- **Layout:** Header (client name, linked appointment, template selector defaulting to the therapist's preferred style) + template-driven form body (SOAP: Subjective/Objective/Assessment/Plan sections; DAP: Data/Assessment/Plan; BIRP: Behavior/Intervention/Response/Plan; GIRP: Goal/Intervention/Response/Plan; Narrative: free text; Custom: clinic-defined fields) + linked-goals/interventions reference panel (inline, pulling from the active Treatment Plan without leaving the note — the one justified exception to "no cross-tab preview," per IA §6) + Sign & Lock action
- **Hierarchy:** Template fields are the primary content; linked-plan reference panel is secondary/collapsible
- **Sections:** Header, Template body (varies by style), Linked Goals/Interventions panel, Risk/Safety flag toggle, Sign & Lock
- **Components:** Template selector, structured fields (varies), rich-text areas, goal-linking multi-select, risk-flag toggle, Save Draft / Sign & Lock buttons
- **Primary CTA:** "Sign & Lock"
- **Secondary Actions:** "Save Draft," "Cancel" (C2 if content entered)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1 (template load). Empty: N/A (blank template is the starting state). Error: ERR2 (required fields per template) or ERR1 (save failure — draft auto-saves defensively). Success: S2 confirmation on Sign & Lock — note becomes read-only, C1 confirms this is intentional ("Signing locks this note — it cannot be edited afterward")
- **Permissions:** Therapist authoring their own session's note (or a permitted co-therapist for shared/family cases). **Product Owner decision:** once signed, the original note is permanently locked and can never be edited by anyone, including the author — the only way to add or correct information is to create an **Addendum**, a separate record with its own author, timestamp, content, and independent Sign & Lock action (not a re-opening or merge of the original)
- **HIPAA/Privacy:** Auto-save drafts are stored encrypted and are not visible to any other role; the Sign & Lock action is audit-logged with timestamp and author; toggling the risk/safety flag here is what populates the Overview banner and Clinical Care > Risk & Safety queue (69)
- **Responsive:** Full-screen editor on mobile/tablet; template sections become sequential accordions rather than a long single scroll
- **Navigation:** The single authoring surface for notes, reached identically from Client 360, Appointment, Dashboard, and Worklist — never duplicated (IA §10)

### 60. Clinical Note Detail
- **Purpose:** View a signed note (read-only) or resume a draft.
- **Role:** Therapist (own/permitted), Clinic Admin
- **Pattern:** P-DETAIL
- **Entry:** Client Clinical Notes (39), Clinical Notes List (58)
- **Exit/Next:** Back to list; "Add Addendum" (if signed); "Continue Editing" (if draft)
- **Layout:** Header (client, date, template type, signed status/author/timestamp) + rendered note content (structured per template, permanently read-only once signed — no edit affordance exists, not even a disabled one) + linked goals/interventions + an **Addenda** section listing each addendum as its own distinct, independently-signed record (own author, own timestamp, own content block) stacked chronologically beneath the original — never merged into or overwriting it
- **Hierarchy:** Signed status and author/timestamp are prominent (compliance relevance), then content, then addenda (each addendum's own signed status is equally prominent within its block)
- **Sections:** Header, Note content (locked), Linked items, Addenda (each a separate signed sub-record)
- **Components:** Read-only rendered fields, addendum list (each item shows its own author/timestamp/signed-status), "Add Addendum" button (opens a new addendum authoring form — never an edit of the original note)
- **Primary CTA:** "Add Addendum" (signed notes) or "Continue Editing" (drafts only, before first signature)
- **Secondary Actions:** "Print" (audit-logged, per §0.11), "Back to List"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1 or ERR3 (permission). Success: N/A
- **Permissions:** Same scoping as the list screens it's reached from
- **HIPAA/Privacy:** Print/export is audit-logged; a signed note's immutability is visually reinforced (no edit affordances present at all, not just disabled); each addendum is independently signed and audit-logged, preserving a complete, tamper-evident chronological history rather than a mutable record
- **Responsive:** Single-column read view on mobile
- **Navigation:** The one true note-viewing surface, reached from either entry point without duplication

### 61. Assessment Library
- **Purpose:** Clinic-wide catalog of assessment instruments (standard + custom), the source for assigning assessments.
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Clinical Care sidebar > Assessments > Library
- **Exit/Next:** Client Assessment (62, to assign)
- **Layout:** Header ("New Custom Assessment") + instrument list (name, type, scoring method) + search
- **Hierarchy:** Standard instruments (PHQ-9, GAD-7, etc.) alongside clinic-custom ones, clearly labeled
- **Sections:** Instrument list
- **Components:** Instrument card/row, "Assign to Client" action, "Create Custom" button
- **Primary CTA:** "Assign to Client"
- **Secondary Actions:** "Create Custom Assessment"
- **Filters/Search/Sort:** Search by name; filter by category (Depression, Anxiety, etc.) and Standard/Custom
- **States:** Loading: L1. Empty: E1 (unlikely — clinic ships with standard instruments preloaded). Error: ERR1. Success: N/A
- **Permissions:** Therapist and Admin; Reception/Billing absent
- **HIPAA/Privacy:** The library itself (instrument definitions) is not PHI — it becomes PHI only once a result is attached to a client
- **Responsive:** List stacks
- **Navigation:** Global library referenced by Client Assessments (40) and Assign actions clinic-wide (IA §11)

### 62. Client Assessment
- **Purpose:** Assign an instrument to a client, or the client's/provider's completion interface for a pending assessment.
- **Role:** Therapist (assign), Client (complete, via Portal), Therapist (provider-completed instruments)
- **Pattern:** P-FORM
- **Entry:** Assessment Library, Client 360 > Assessments "Assign Assessment"
- **Exit/Next:** Assessment Results (63) once submitted
- **Layout:** Assign mode: instrument + client + optional goal-link (Locked Decision reference: ties to a Treatment Plan goal) + due date. Completion mode: the instrument's actual items, one section at a time for longer instruments
- **Hierarchy:** For completion: item questions are the entire content, minimal chrome, progress indicator
- **Sections:** Assign form (staff) / Instrument items (completion)
- **Components:** Client/goal selectors (assign), question items with response controls (completion), progress bar
- **Primary CTA:** "Assign" (staff) / "Submit" (completion)
- **Secondary Actions:** "Save & Continue Later" (completion, client-facing)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1/L2. Empty: N/A. Error: ERR2 (incomplete required items). Success: S2, auto-scores where applicable and routes to Results (63)
- **Permissions:** Client only ever sees/completes their own assigned instrument, reached via a scoped Portal link — never a general instrument browser
- **HIPAA/Privacy:** Completion happens in an authenticated, encrypted context; partial in-progress responses are not visible to staff until submitted (consistent with Intake In Progress, 53)
- **Responsive:** Completion mode is mobile-first (clients often complete on phones) — large touch targets, one question group per screen on small viewports
- **Navigation:** Bridges Clinical Care (assign) and Client Portal (complete) — one record, two authorized entry points

### 63. Assessment Results
- **Purpose:** View a completed assessment's score and responses.
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-DETAIL
- **Entry:** Client Assessments (40), Clinical Care > Assessments
- **Exit/Next:** Assessment History (64), Treatment Plan (to reference in Progress & Outcomes)
- **Layout:** Header (instrument, date, score, severity band if applicable) + item-level responses (collapsible) + "Compare to previous" link
- **Hierarchy:** Score/severity is the headline; item detail is secondary/collapsed by default
- **Sections:** Score summary, Item responses (collapsed), Compare-to-previous
- **Components:** Score badge, severity indicator, collapsible response list
- **Primary CTA:** N/A (read view)
- **Secondary Actions:** "View History," "Link to Treatment Plan Goal"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: N/A
- **Permissions:** Therapist/Admin only
- **HIPAA/Privacy:** Clinical scoring data; audit-logged access
- **Responsive:** Stacks vertically
- **Navigation:** Child of Client Assessments; feeds History (64)

### 64. Assessment History
- **Purpose:** Trend view of one instrument's scores over time for a client (e.g., the Blueprint's PHQ-9 example, §15).
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-TIMELINE / trend chart
- **Entry:** Assessment Results "View History," Client Assessments trend sparkline
- **Exit/Next:** Individual Assessment Results (63) per data point
- **Layout:** Line/trend chart (score over time) + a table of each administration below for precise values
- **Hierarchy:** Chart first (pattern-recognition), table second (precision)
- **Sections:** Trend chart, Administration table
- **Components:** Chart, table rows
- **Primary CTA:** N/A (read view)
- **Secondary Actions:** Table row click → that administration's Results (63)
- **Filters/Search/Sort:** Date range
- **States:** Loading: L1. Empty: E1 ("Only one administration so far — trends appear after the next") if fewer than 2 data points. Error: ERR1. Success: N/A
- **Permissions:** Therapist/Admin only
- **HIPAA/Privacy:** Same as Results
- **Responsive:** Chart simplifies (fewer gridlines/labels) on mobile; table becomes a stacked list
- **Navigation:** Feeds the Treatment Plan's Progress & Outcomes sub-view (42) with the same underlying data, not a duplicate

### 65. Treatment Plans List (Cross-Client)
- **Purpose:** Cross-caseload view of active plans and plans due for review.
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-TABLE
- **Entry:** Clinical Care sidebar > Treatment Plans
- **Exit/Next:** Treatment Plan Detail (67) — same screen as reached from Client 360
- **Layout:** Header + filter (client, review-date range, Active/Inactive) + table (client, plan summary, target/review dates, status)
- **Hierarchy:** Plans due for review soonest, first
- **Sections:** Filter bar, Plans table
- **Components:** Table rows, status chip, "Templates" tab/link
- **Primary CTA:** N/A (browse surface)
- **Secondary Actions:** Row click → Plan Detail; "Manage Templates"
- **Filters/Search/Sort:** Status, review-date range; sort by review date
- **States:** Loading: L1. Empty: E1/E2. Error: ERR1. Success: N/A
- **Permissions:** Scoped per Locked Decision 1; Reception/Billing absent
- **HIPAA/Privacy:** List rows show plan status/dates, not full plan content
- **Responsive:** Table → card list
- **Navigation:** Aggregates the same records as Client Treatment Plans (41); deep-links, never a second editor (IA §12)

### 66. Create Treatment Plan
- **Purpose:** Author a new treatment plan for a client, supporting multiple concurrent plans per engagement (Locked Decision 4).
- **Role:** Therapist
- **Pattern:** P-FORM
- **Entry:** Client 360 > Treatment Plan "New Plan," Clinical Care > Treatment Plans
- **Exit/Next:** Treatment Plan Detail (67)
- **Layout:** Header (client, service/engagement this plan is for — e.g., "Individual Therapy" vs. "Couples Therapy" if the client has both) + form: Diagnosis, Problem(s), Goals, Objectives, Interventions, Target date, Review date + template selector (start from a clinic template or blank)
- **Hierarchy:** Diagnosis/Problem first (grounds the plan), then Goals/Objectives/Interventions in sequence, matching the Blueprint's causal chain (§16)
- **Sections:** Engagement/Service tag, Diagnosis & Problems, Goals & Objectives, Interventions, Dates, Provider sign-off
- **Components:** Template picker, structured goal/objective builder (repeatable rows), date pickers, sign-off action
- **Primary CTA:** "Save Plan"
- **Secondary Actions:** "Save as Draft," "Cancel" (C2)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1 (template load). Empty: N/A. Error: ERR2. Success: S2, plan becomes Active and appears on Client Treatment Plans (41)
- **Permissions:** Therapist authoring for their own/permitted client
- **HIPAA/Privacy:** Same protection tier as Clinical Notes
- **Responsive:** Long form breaks into accordioned sections on mobile
- **Navigation:** Creates the record shown on both Client 360 (41) and the cross-client list (65) — one plan, two views

### 67. Treatment Plan Detail
- **Purpose:** View/edit an existing plan; hosts the Plan and Progress & Outcomes sub-views (merging Goals & Outcomes per IA §8).
- **Role:** Therapist, Clinic Admin
- **Pattern:** P-DETAIL with two sub-tabs
- **Entry:** Client Treatment Plans (41), Treatment Plans List (65)
- **Exit/Next:** Client Assessments (to link), Clinical Note (to reference)
- **Layout:** Header (client, engagement tag, status: Active/Inactive/Completed, review date) + sub-tabs: **Plan** (definition, editable) | **Progress & Outcomes** (screen 42/68, read-oriented)
- **Hierarchy:** Status and next-review-date prominent in header; sub-tab content follows
- **Sections:** Header, Plan sub-tab, Progress & Outcomes sub-tab
- **Components:** Sub-tab switcher, editable plan fields, "Mark Inactive"/"Reactivate" action, "Schedule Review" action
- **Primary CTA:** "Save Changes" (Plan sub-tab) / "Update Progress" (Progress sub-tab)
- **Secondary Actions:** "Mark Inactive," "Duplicate as New Plan" (for a new engagement)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR2/ERR1. Success: S1
- **Permissions:** Therapist/Admin only
- **HIPAA/Privacy:** Same tier as Clinical Notes; status changes (Active/Inactive) are audit-logged since they affect which plan governs current care
- **Responsive:** Sub-tabs become a segmented control on mobile
- **Navigation:** The single editing surface, reached identically from Client 360 and Clinical Care (IA §12) — screen 68 (Goals & Outcomes) is this screen's Progress & Outcomes sub-tab, not a separate screen

### 68. Goals & Outcomes
- **Purpose:** Same content as screen 42 / the Progress & Outcomes sub-tab of screen 67 — listed separately in the task's enumeration but implemented as one sub-view, per the approved IA's explicit merge decision (IA §8).
- **Navigation:** See screen 42 for the full spec; documented once to honor "no duplicate feature ownership."

### 69. Risk / Safety Indicator
- **Purpose:** Represent risk/safety status with restricted visibility and an appropriate indicator for authorized workflows (Locked Decision 5) — this is a cross-cutting component, not a single page.
- **Role:** Therapist/Admin (full detail), Receptionist (indicator only, in authorized workflows), Billing Staff (no access)
- **Pattern:** Component appearing in three places: (a) Client 360 Overview banner (full detail, clinical roles), (b) Clinical Care > Risk & Safety cross-caseload queue (full detail, clinical roles), (c) a minimal flag indicator surfaced to Reception specifically at Check-in (30) and Appointment Detail (27) — presence/absence only, no clinical text
- **Entry:** Set from within a Clinical Note (59) or Treatment Plan; surfaced automatically wherever the component appears
- **Exit/Next:** Full detail → relevant Clinical Note entries; indicator-only → no drill-down available to Reception
- **Layout:** (a)/(b): a colored banner/badge with a short clinical descriptor and a link to the relevant note(s). (c): a small icon/badge with no accompanying text beyond a generic label like "Safety consideration on file" — no diagnosis, no narrative
- **Hierarchy:** When present, this is the single most prominent element on any screen it appears on — deliberately overriding normal layout priority, given the stakes
- **Sections:** N/A (component, not a page)
- **Components:** Risk banner (clinical view), minimal flag badge (restricted view), "Acknowledge" action for urgent-notification workflows (§0.11 Notification Center)
- **Primary CTA:** "View Details" (clinical roles only)
- **Secondary Actions:** "Update Status" (clinical roles, from within a Clinical Note)
- **Filters/Search/Sort:** Clinical Care > Risk & Safety queue is filterable by provider/urgency
- **States:** Loading: L1. Empty: absence of the indicator entirely (no "no risk" badge is shown — silence is the neutral state, avoiding a false sense of a completed clearance check). Error: ERR1. Success: N/A
- **Permissions:** This is the canonical implementation of PR3 (§0.8) — Reception gets awareness without detail, exactly per Locked Decision 5; Billing Staff never sees this component in any form
- **HIPAA/Privacy:** The single most sensitive indicator in the product — every view of the full-detail version is audit-logged; the restricted indicator is designed so it cannot be reverse-engineered into clinical detail (no hover tooltip with a preview, no expandable summary for unauthorized roles)
- **Responsive:** Banner remains full-width and prominent at every breakpoint; restricted badge stays a small persistent icon at every breakpoint
- **Navigation:** A shared component referenced from Client 360, Clinical Care, and Schedule/Check-in — not a standalone screen, listed here because the task enumerates it explicitly

---

# PHASE 8 — Forms & Documents

Distinguishes Clinical Notes vs. Forms vs. Assessments vs. Documents vs. Consent per IA §13 — this phase owns the latter four's templates/library; response content renders on the Client 360 (43, 44, 47).

### 70. Forms Dashboard
- **Purpose:** Module landing page for Forms & Documents — library, outstanding queue, and templates in one place.
- **Role:** Receptionist (assign/track), Therapist (assign clinical forms), Clinic Admin (templates)
- **Pattern:** P-LIST (module landing, not a widget dashboard)
- **Entry:** Forms & Documents sidebar item
- **Exit/Next:** Forms Library (71), Pending/Assigned queue, Create Form (72)
- **Layout:** Header + secondary nav (Library, Documents, Pending/Assigned, Templates & E-signature) + default view: Pending/Assigned queue (the most actionable daily surface)
- **Hierarchy:** Outstanding items first (operational), library/templates are configuration, browsed less often
- **Sections:** Secondary nav, Pending/Assigned queue (default)
- **Components:** Secondary nav tabs, queue list (client, form, days outstanding)
- **Primary CTA:** "Assign Form"
- **Secondary Actions:** "Manage Templates," "Upload Document"
- **Filters/Search/Sort:** Filter by form type, status; sort by days-outstanding
- **States:** Loading: L1. Empty: E3 ("Nothing outstanding"). Error: ERR1. Success: S1 toast on assignment
- **Permissions:** Receptionist sees status only (PR2); clinical form content is Therapist/Admin only
- **HIPAA/Privacy:** Same minimization as Client Forms (43)
- **Responsive:** Secondary nav becomes a dropdown on mobile
- **Navigation:** Root of the Forms & Documents module

### 71. Form Templates
- **Purpose:** Clinic-wide library of form templates (intake, consent, questionnaires, custom).
- **Role:** Clinic Admin (manage), Therapist (browse/assign)
- **Pattern:** P-LIST
- **Entry:** Forms Dashboard secondary nav, Settings > Forms & Templates (shared destination)
- **Exit/Next:** Create Form (72), Assign Form (73)
- **Layout:** Header ("New Template") + template list (name, type, last updated) + category filter (Intake/Consent/Questionnaire/Custom)
- **Hierarchy:** Most-used templates surfaced via a "Recently used" section above the full alphabetical list
- **Sections:** Recently used, Full template list
- **Components:** Template card/row, category filter chips
- **Primary CTA:** "New Template"
- **Secondary Actions:** "Duplicate Template," "Assign to Client"
- **Filters/Search/Sort:** Category filter, search by name
- **States:** Loading: L1. Empty: E1 (clinic ships with default intake/consent templates, so true emptiness is rare — applies mainly to Custom category). Error: ERR1. Success: N/A
- **Permissions:** Admin edits; Therapist can view/assign but not alter shared templates (prevents accidental clinic-wide changes)
- **HIPAA/Privacy:** Templates are structure only, not PHI, until a response is attached to a client
- **Responsive:** List stacks
- **Navigation:** Same destination whether reached via Forms & Documents or Settings > Forms & Templates (IA §5 note — one config surface, not duplicated)

### 72. Create Form
- **Purpose:** Build a new form template (custom questionnaire, intake variant, etc.).
- **Role:** Clinic Admin
- **Pattern:** P-FORM (builder)
- **Entry:** Form Templates "New Template"
- **Exit/Next:** Form Templates (71) with the new template listed
- **Layout:** Header (template name, category) + field builder (add/reorder/remove fields: text, choice, scale, signature block) + preview pane
- **Hierarchy:** Field builder is the primary workspace; preview is secondary/collapsible
- **Sections:** Template metadata, Field builder, Preview
- **Components:** Field-type picker, drag-to-reorder list, live preview panel, "Save Template" button
- **Primary CTA:** "Save Template"
- **Secondary Actions:** "Preview," "Cancel" (C2)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 on save. Empty: N/A (starts blank by design). Error: ERR2 (e.g., duplicate field labels). Success: S1 toast, redirects to Templates list
- **Permissions:** Admin only
- **HIPAA/Privacy:** Builder itself handles no PHI; a warning appears if a field type suggests sensitive data collection inappropriate for a public-facing form (e.g., a diagnosis field on an intake form used pre-appointment)
- **Responsive:** Builder becomes single-column; preview accessible via a toggle rather than a side-by-side pane on mobile
- **Navigation:** Feeds the Templates list; distinct from filling out a form (74)

### 73. Assign Form
- **Purpose:** Send a specific form to a specific client.
- **Role:** Receptionist, Therapist, Clinic Admin
- **Pattern:** P-MODAL
- **Entry:** Forms Dashboard, Client 360 > Forms "Assign Form," Form Templates "Assign to Client"
- **Exit/Next:** Client Forms (43) shows the new outstanding item; client is notified
- **Layout:** Modal: Client selector (pre-filled if launched from Client 360) + Template selector + due date + delivery method note (portal + email/SMS link)
- **Hierarchy:** Client and Template are the only required decisions
- **Sections:** Client, Template, Due date
- **Components:** Selectors, date picker, "Assign" button
- **Primary CTA:** "Assign"
- **Secondary Actions:** "Cancel"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2. Success: S1 toast, triggers the Communications "form assigned" notification (logistics-only per §0.11)
- **Permissions:** Clinical-category templates (e.g., a clinical questionnaire) can only be assigned by Therapist/Admin; Receptionist can assign administrative/intake templates
- **HIPAA/Privacy:** Notification sent to client says only "You have a new form to complete," never the form's clinical subject matter
- **Responsive:** Standard modal
- **Navigation:** Sub-action reachable from three entry points, one underlying assignment record

### 74. Client Form Completion
- **Purpose:** The client's own interface for completing an assigned form.
- **Role:** Client (via Portal or secure email/SMS link)
- **Pattern:** P-FORM
- **Entry:** Client Portal > Forms (117), Intake pre-appointment link (13), reminder notification
- **Exit/Next:** Confirmation (S2), form status updates to Complete everywhere it's referenced
- **Layout:** Header (form name, clinic branding) + form fields per the template, one logical section per screen on mobile + progress indicator for multi-section forms + "Save & Continue Later"
- **Hierarchy:** Current section's fields only — no overwhelming single long scroll for lengthy intake forms
- **Sections:** Per-template (varies)
- **Components:** Form fields (varies by type), progress indicator, Save/Submit buttons, e-signature block where applicable
- **Primary CTA:** "Submit" (final section) / "Continue" (intermediate sections)
- **Secondary Actions:** "Save & Continue Later"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A (blank form is the start state). Error: ERR2 (validation, plain language, no clinical jargon in error text). Success: S2 confirmation screen, redirects to Portal Forms list or Intake checklist (13)
- **Permissions:** Client can only access their own assigned forms via a token-scoped or authenticated-session link
- **HIPAA/Privacy:** In-progress responses save encrypted and are not visible to staff until submitted (consistent with §53); a plain-language disclosure of how responses are used appears before clinical questionnaire sections
- **Responsive:** Mobile-first — this is disproportionately completed on phones
- **Navigation:** Terminal client-facing screen for form assignments created anywhere in the staff app

### 75. Consent Form
- **Purpose:** Present and capture signature on a consent document specifically — kept distinct from generic forms for compliance visibility (IA §13, §8).
- **Role:** Client (sign), Therapist/Admin (review), Receptionist (status only)
- **Pattern:** P-FORM, specialized variant of Client Form Completion
- **Entry:** Client 360 > Consent "Request Signature," Intake checklist, Portal > Consent (123)
- **Exit/Next:** Client Consent tab (47) reflects Signed status and version
- **Layout:** Full consent document text (scrollable, must-reach-bottom before signing on first view) + signature capture block + version/date stamp. **Product Owner decision — Guardian/Authorized Representative variant:** for a client flagged as a minor or otherwise requiring guardian consent (flagged at the Client record level, not decided ad hoc at signing time), this screen instead presents guardian identity/relationship fields (name, relationship to client) immediately before the signature block; the consent document itself remains the same general treatment-consent text — no clinical questionnaire content, diagnosis, or session-specific detail is ever surfaced through this screen, to either the client or the guardian
- **Hierarchy:** Document text is the primary content — signature action is deliberately not reachable until the document has been scrolled/reviewed; guardian identity fields (when applicable) appear before, not instead of, the document
- **Sections:** Consent document text, Guardian identity (when applicable), Signature capture
- **Components:** Scrollable document viewer, guardian relationship field (conditional), signature pad/typed-signature field, "I have read and agree" checkbox, "Sign" button (disabled until document is reviewed)
- **Primary CTA:** "Sign & Submit"
- **Secondary Actions:** "Download a copy," "Decline" (routes to a staff-notification, since a declined consent may block scheduling per clinic policy)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR2 (signature missing/incomplete, or guardian relationship field missing when required). Success: S2, version is locked/immutable, appears in Client Consent history
- **Permissions:** Only the named client — or, for a minor/dependent client, their designated Guardian/Authorized Representative — can sign consent; staff can view status but never sign on anyone's behalf. Where the clinic grants a guardian their own portal account, that account's access is strictly limited to consent and administrative records — Clinical Notes, Assessments, and Treatment Plan tabs are entirely absent from a guardian account (PR1), the same rule applied to Receptionist.
- **HIPAA/Privacy:** Signed documents are legally significant — every view/download audit-logged; superseded versions remain in history, never deleted; guardian-signed consent never exposes clinical content, consistent with minimum-necessary access
- **Responsive:** Document viewer remains full-height and scrollable at every breakpoint; signature pad adapts to touch input on mobile/tablet
- **Navigation:** A specialized Form Completion variant, surfaces its result on the Consent tab (47), not a duplicate record

### 76. Documents List
- **Purpose:** Clinic-wide document templates and shared files (distinct from client-specific files, which live on Client Documents, 44).
- **Role:** Clinic Admin, Therapist (view), Receptionist (administrative documents)
- **Pattern:** P-LIST
- **Entry:** Forms Dashboard secondary nav
- **Exit/Next:** Document Detail (77), Upload Document (78)
- **Layout:** Header ("Upload") + document list (name, type, category, uploaded by/date)
- **Hierarchy:** Most recently added first
- **Sections:** Document list
- **Components:** File row, category filter, "Upload" button
- **Primary CTA:** "Upload Document"
- **Secondary Actions:** Row click → Document Detail
- **Filters/Search/Sort:** Category filter, search by filename
- **States:** Loading: L1. Empty: E1 ("No shared documents yet"). Error: ERR1. Success: S1 on upload
- **Permissions:** Clinically-tagged shared documents (e.g., a clinical handout) visible to Therapist/Admin; administrative documents visible clinic-wide
- **HIPAA/Privacy:** This list holds clinic-wide templates/handouts, not client PHI — client files stay exclusively on Client Documents (44), never mixed into this list
- **Responsive:** List stacks
- **Navigation:** Distinct from Client Documents (44) — global templates vs. client-specific files, per IA §13

### 77. Document Detail
- **Purpose:** View/download a document and its metadata.
- **Role:** Same as the list it's reached from (76 or 44)
- **Pattern:** P-DETAIL
- **Entry:** Documents List (76), Client Documents (44)
- **Exit/Next:** Back to the originating list
- **Layout:** Header (filename, type, uploader, date) + preview (where the file type supports inline preview) + download action
- **Hierarchy:** Preview dominant if available; metadata secondary
- **Sections:** Preview, Metadata
- **Components:** Preview pane, download button, "Replace" (Admin, for shared templates only)
- **Primary CTA:** "Download"
- **Secondary Actions:** "Replace" (shared documents only), "Delete" (C1 confirmation)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1 (preview unavailable → download-only fallback). Success: N/A
- **Permissions:** Matches the originating list's scoping
- **HIPAA/Privacy:** Every view/download of a client-specific document is audit-logged (§0.11); shared/template documents are not PHI
- **Responsive:** Preview scales to viewport; download remains a persistent action
- **Navigation:** Reached from either Documents List or Client Documents, same detail surface

### 78. Upload Document
- **Purpose:** Add a new file, either clinic-wide or to a specific client.
- **Role:** Receptionist, Therapist, Clinic Admin
- **Pattern:** P-MODAL
- **Entry:** Documents List, Client Documents "Upload"
- **Exit/Next:** Back to the originating list, new file appears
- **Layout:** Modal: file picker/drag-drop + category/tag (Clinical/Administrative) + client selector (if uploading to a client's file, pre-filled from context) + description
- **Hierarchy:** File selection first, tagging second (tagging determines future visibility, so it's not optional)
- **Sections:** File picker, Tagging, Description
- **Components:** Drag-drop zone, category selector, client selector (contextual), "Upload" button
- **Primary CTA:** "Upload"
- **Secondary Actions:** "Cancel"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 (upload progress bar for larger files). Empty: N/A. Error: ERR1 (upload failure, file-type/size rejection with a clear reason). Success: S1 toast, file appears in the relevant list
- **Permissions:** Receptionist can only tag Administrative; Clinical tagging requires Therapist/Admin
- **HIPAA/Privacy:** The mandatory Clinical/Administrative tag at upload time is what drives PR1/PR2 visibility downstream on Client Documents (44) — this is a deliberate, load-bearing step, not a formality
- **Responsive:** File picker uses native device picker/camera on mobile
- **Navigation:** Sub-action of both Documents List and Client Documents

### 79. Signature Status
- **Purpose:** Cross-client view of e-signature completion — which consents/forms are signed, outstanding, or expired.
- **Role:** Clinic Admin, Receptionist (status only)
- **Pattern:** P-TABLE
- **Entry:** Forms Dashboard > Templates & E-signature
- **Exit/Next:** Client Consent (47) or Client Forms (43) for a specific record
- **Layout:** Header + table: client, document, status (Signed/Outstanding/Expired), date
- **Hierarchy:** Outstanding/Expired surfaced above Signed (actionable first)
- **Sections:** Status table
- **Components:** Table rows, status chip, "Send Reminder" action
- **Primary CTA:** "Send Reminder" (bulk or per-row)
- **Secondary Actions:** Row click → the client's Consent/Forms tab
- **Filters/Search/Sort:** Filter by status, document type; sort by date
- **States:** Loading: L1. Empty: E3 ("Everything's signed and current"). Error: ERR1. Success: S1 on reminder sent
- **Permissions:** Receptionist sees status only, no document content (PR2)
- **HIPAA/Privacy:** Same audit rules as Consent (47); this is a compliance-monitoring surface, treated with the same rigor
- **Responsive:** Table → card list
- **Navigation:** Cross-client aggregation of the same signature records shown per-client on Consent (47) and Forms (43)

---

# PHASE 9 — Communication

Global inbox as source of truth; Client 360 > Messages (45) is a filtered view, per IA §14.

### 80. Communication Inbox
- **Purpose:** Clinic-wide view of every conversation across every client and channel.
- **Role:** Receptionist (primary), Clinic Admin, Therapist (own clients only)
- **Pattern:** P-LIST (two-pane: thread list + selected thread)
- **Entry:** Communications sidebar item
- **Exit/Next:** Message Thread (81), Compose Message (82)
- **Layout:** Header ("New Message") + thread list (client name, last message preview — preview text kept generic per HIPAA note below, timestamp, unread indicator) + selected thread pane
- **Hierarchy:** Unread/most recent threads at top
- **Sections:** Thread list, Selected thread pane
- **Components:** Thread row, unread badge, thread pane (see 81)
- **Primary CTA:** "New Message"
- **Secondary Actions:** Mark read/unread, archive thread
- **Filters/Search/Sort:** Search by client name, filter by channel (secure message/SMS/email), unread-only toggle
- **States:** Loading: L1. Empty: E1 ("No messages yet"). Error: ERR1. Success: N/A (inline per-thread success covered in 81)
- **Permissions:** Therapist's inbox is pre-filtered to their own clients only, not a clinic-wide view; Billing Staff has no access by default (IA §21)
- **HIPAA/Privacy:** Thread list preview text is generic/truncated in a way that avoids surfacing sensitive content in a glanceable list (e.g., "New message" rather than a raw content snippet, configurable) — consistent with not exposing PHI in low-friction surfaces
- **Responsive:** Two-pane collapses to thread-list-then-thread (drill-in) on mobile
- **Navigation:** Root of Communications; source of truth referenced by Client Messages (45)

### 81. Message Thread
- **Purpose:** View and reply within one client's conversation.
- **Role:** Receptionist, Therapist, Clinic Admin
- **Pattern:** P-TIMELINE (chat-style)
- **Entry:** Communication Inbox, Client 360 > Messages
- **Exit/Next:** Reply inline; "View Client Profile" shortcut
- **Layout:** Header (client name, channel indicator) + message bubbles chronological + reply composer at bottom
- **Hierarchy:** Most recent message visible on load, scroll up for history
- **Sections:** Message history, Composer
- **Components:** Message bubble, composer (text + attach), send button
- **Primary CTA:** "Send"
- **Secondary Actions:** "View Client Profile," attach a document/form
- **Filters/Search/Sort:** Search within thread
- **States:** Loading: L1. Empty: N/A (a thread only exists once a first message has been sent). Error: ERR1 (send failure — message stays in composer, not lost). Success: S1 (message appears in thread, delivery indicator)
- **Permissions:** Same as Inbox
- **HIPAA/Privacy:** This is the same underlying data as Client Messages (45) — one thread, two entry points, not duplicated
- **Responsive:** Full-screen chat view on mobile
- **Navigation:** Reached from Inbox or Client 360, identical screen

### 82. Compose Message
- **Purpose:** Start a new conversation with a client (as opposed to replying within an existing thread).
- **Role:** Receptionist, Therapist, Clinic Admin
- **Pattern:** P-MODAL leading into Message Thread (81)
- **Entry:** Inbox "New Message," Client 360 "Send Message"
- **Exit/Next:** Message Thread (81) for the client, now with the first message sent
- **Layout:** Modal: Client selector (pre-filled if launched from Client 360) + message body + optional template picker
- **Hierarchy:** Client selection first if not pre-filled, then message body
- **Sections:** Client selector, Message body, Template picker
- **Components:** Client search-select, textarea, template dropdown, "Send" button
- **Primary CTA:** "Send"
- **Secondary Actions:** "Use Template," "Cancel" (C2 if text entered)
- **Filters/Search/Sort:** Client search-as-you-type
- **States:** Loading: L2. Empty: N/A. Error: ERR2 (no client selected) or ERR1 (send failure). Success: S1, opens the new/updated thread
- **Permissions:** Therapist can only compose to their own permitted clients
- **HIPAA/Privacy:** A visible reminder appears before sending: "This message may be visible in delivery previews on the client's device" — encourages appropriately general phrasing for anything sent outside the secure portal channel
- **Responsive:** Standard modal, full-screen on mobile
- **Navigation:** Feeds directly into Message Thread — creates no separate record type

### 83. Communication Templates
- **Purpose:** Reusable message templates for common communications (appointment reminders, welcome messages, etc.).
- **Role:** Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Communications sidebar > Templates
- **Exit/Next:** Used within Compose Message (82) and Automation Rules (config, in Settings)
- **Layout:** Header ("New Template") + template list (name, channel, category)
- **Hierarchy:** Grouped by category (Appointment, Billing, Intake, General)
- **Sections:** Template list, grouped
- **Components:** Template row, category filter
- **Primary CTA:** "New Template"
- **Secondary Actions:** Edit, Duplicate, Delete (C1)
- **Filters/Search/Sort:** Category filter, search by name
- **States:** Loading: L1. Empty: E1 (clinic ships with default templates — Confirmation, Reminder, Cancellation, No-show follow-up, Form reminder, per Blueprint §19). Error: ERR1. Success: S1 on save
- **Permissions:** Admin only
- **HIPAA/Privacy:** Templates are reviewed for a standing rule: no merge-field may pull clinical content into an outbound message, only logistics fields (name, date, time)
- **Responsive:** List stacks
- **Navigation:** Referenced by Compose Message and the Automation Rules configuration; not a duplicate of either

### 84. Communication History
- **Purpose:** Unified log of every SMS/email/secure-message sent, for audit and troubleshooting ("did the reminder actually go out?").
- **Role:** Clinic Admin, Receptionist (broader operational history); Therapist (own/permitted clients only)
- **Pattern:** P-TABLE
- **Entry:** Communications sidebar > History
- **Exit/Next:** Message Thread (81) or Client 360 for context
- **Layout:** Header + table: client, channel, type (manual/automated), sent time, delivery status
- **Hierarchy:** Most recent first
- **Sections:** History table
- **Components:** Table rows, delivery-status chip (Sent/Delivered/Failed)
- **Primary CTA:** N/A (audit/read surface)
- **Secondary Actions:** Row click → thread/client context; "Resend" for failed items
- **Filters/Search/Sort:** Filter by channel, status, date range; search by client
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** **Product Owner decision:** Therapist has access to this screen, strictly scoped to their own/permitted clients' communication history (per Locked Decision 1's permission model — never a clinic-wide view); Admin and Receptionist have access to the appropriate broader operational history across all clients, for delivery-confirmation/troubleshooting purposes; Billing Staff has no access to this screen at all
- **HIPAA/Privacy:** Log entries show metadata (channel, status, timestamp) not full message content, to keep this audit surface lower-sensitivity than the Inbox itself
- **Responsive:** Table → card list
- **Navigation:** A log/audit view distinct from the Inbox (which is for active conversation, not history browsing)

### 85. Notification Center
- **Purpose:** Cross-cutting, filterable panel of system notifications, per IA §23 categories.
- **Role:** All authenticated roles (content scoped per role)
- **Pattern:** P-DRAWER (dropdown panel, not a full page)
- **Entry:** Persistent header icon on every authenticated screen
- **Exit/Next:** Deep-links into the relevant record (appointment, note, invoice, message, risk flag)
- **Layout:** Header ("Notifications," "Mark all read") + category-filterable list (Appointment, Intake, Clinical Task, Risk/Safety, Billing, Communication, Security) + per-item timestamp and read state
- **Hierarchy:** Risk/Safety and Security notifications (if any) pin to the top regardless of recency, per their "Immediate" urgency tier (IA §23)
- **Sections:** Filter chips, Notification list
- **Components:** Notification row (icon, text, timestamp), category filter chips, "Mark all read"
- **Primary CTA:** N/A (a panel of shortcuts, not a task itself)
- **Secondary Actions:** Dismiss, Mark read, category filter
- **Filters/Search/Sort:** Category filter
- **States:** Loading: L1. Empty: E3 ("No new notifications"). Error: ERR1. Success: N/A
- **Permissions:** Scoped to what the role would otherwise be permitted to see — a Receptionist never receives a "Clinical task" notification with clinical framing, and Risk/Safety notifications reaching Reception (if configured at all) follow the same PR3 indicator-only rule as screen 69
- **HIPAA/Privacy:** Notification text is deliberately generic ("New secure message," "Note pending signature") never clinical content, consistent with §0.11 baseline
- **Responsive:** Full-width dropdown on desktop/tablet; full-screen panel on mobile
- **Navigation:** A cross-cutting overlay reachable from every screen, not a top-level menu (per IA §23)

---

# PHASE 10 — Telehealth

Per the approved IA (§15), telehealth is reached through Schedule → Appointment → Join, and Client → Upcoming Appointment → Join — not a separate management module. Only the four screens the task calls for are specified; no additional telehealth administration screens are introduced. **Product Owner decision: session recording is out of scope for V1** — no screen in this phase includes recording controls or a recording-consent workflow.

### 86. Pre-session Check
- **Purpose:** Verify camera/microphone/connection before entering the session, reducing mid-session technical friction.
- **Role:** Therapist, Client
- **Pattern:** P-MODAL
- **Entry:** Immediately after "Join" is triggered (screen 33 / Portal Join)
- **Exit/Next:** Virtual Session/Waiting Room (87)
- **Layout:** Camera preview + mic level indicator + connection-quality indicator + device selectors
- **Hierarchy:** Camera preview dominant (visual confirmation), technical indicators secondary
- **Sections:** Camera/mic preview, Device selection, Connection status
- **Components:** Video preview tile, mic level meter, device dropdowns, "Join Now" button
- **Primary CTA:** "Join Now"
- **Secondary Actions:** "Test Audio," device switch
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2 (device permission/initialization). Empty: N/A. Error: ERR1 (camera/mic permission denied — clear instructions to enable, with a "Join with audio only" fallback). Success: transitions to Waiting Room
- **Permissions:** Only the authenticated participant on this specific appointment reaches this screen
- **HIPAA/Privacy:** No session content yet at this stage; device-permission prompts follow standard browser patterns
- **Responsive:** Preview scales to viewport, functions identically on mobile
- **Navigation:** Mandatory step between Join and Waiting Room, cannot be skipped

### 87. Virtual Session / Waiting Room
- **Purpose:** Hold participants until the provider is ready (or hold the provider's view of who has arrived).
- **Role:** Therapist, Client
- **Pattern:** P-EMPTY-style holding screen (client view) / P-WORKLIST-style arrivals list (therapist/reception cross-provider view, per IA §7's "Virtual Sessions" Schedule filter)
- **Entry:** Pre-session Check (86)
- **Exit/Next:** Video Consultation (embedded, out of wireframe scope) once the provider admits the client
- **Layout:** Client view: "You're in the waiting room — [Therapist] will join shortly" + appointment details, no controls beyond leave. Therapist/Reception view: list of arrived participants across today's virtual sessions with an "Admit" action per appointment (this is the same view as Schedule > Virtual Sessions, screen 24/7, not a separate screen)
- **Hierarchy:** Client: reassurance message dominant. Staff: arrival list, oldest-waiting first
- **Sections:** Client: waiting message. Staff: arrivals list
- **Components:** Waiting message + appointment summary (client); arrival row + "Admit" button (staff)
- **Primary CTA:** "Admit" (staff) / none — passive wait (client)
- **Secondary Actions:** "Leave Waiting Room" (client)
- **Filters/Search/Sort:** N/A (client); provider filter (staff cross-provider view)
- **States:** Loading: L1. Empty: E3 for staff ("No one waiting"). Error: ERR1 (connection dropped — auto-retry with a visible indicator). Success: transitions both parties into the video consultation
- **Permissions:** A client can only see their own waiting-room state, never other participants'; staff arrivals list is scoped per Locked Decision 1 for cross-provider visibility
- **HIPAA/Privacy:** No participant sees any other client's presence; the video consultation itself carries the same vendor/BAA expectations noted on screen 33
- **Responsive:** Full-screen on mobile for the client view
- **Navigation:** Client-side view is a state, not a menu destination; staff-side view is literally Schedule's Virtual Sessions filter (IA §7), not a duplicate screen

### 88. Join Session
- **Purpose:** Same action as documented on screen 33 (Appointment Detail's "Join") and the trigger into Pre-session Check (86) — listed separately in the task's enumeration but implemented as one action, not a distinct screen, to avoid duplicate feature ownership.
- **Navigation:** See screen 33 for the full spec.

### 89. Session End / Completion State
- **Purpose:** Confirm the virtual session has ended and route to the next logical action.
- **Role:** Therapist, Client
- **Pattern:** P-CONFIRM (S2-style, brief)
- **Entry:** Automatic when either participant ends the video call
- **Exit/Next:** Therapist → Create Clinical Note (59) / Completed Appointment (32); Client → Client Home (114) or Client Billing if payment is due
- **Layout:** Therapist: "Session ended" + prompt "Write your clinical note now?" + appointment marked Completed automatically. Client: "Your session has ended, thank you" + any post-session next steps (e.g., outstanding balance, next appointment)
- **Hierarchy:** For the therapist, the note-writing prompt is the dominant element (this is the moment least likely to be forgotten later)
- **Sections:** End confirmation, Next-step prompt
- **Components:** Confirmation message, "Write Note" button (therapist), "Done" button (client)
- **Primary CTA:** "Write Note" (therapist) / "Done" (client)
- **Secondary Actions:** "Back to Dashboard"
- **Filters/Search/Sort:** N/A
- **States:** This screen state *is* the Success state (S2) for the session
- **Permissions:** Standard role scoping
- **HIPAA/Privacy:** No session recording artifact exists or is referenced here — recording is out of scope for V1 (Product Owner decision, screen 33); this screen's only outputs are the note-writing and billing prompts
- **Responsive:** Standard confirmation layout
- **Navigation:** Terminal state of the telehealth flow; hands off directly into Clinical Notes (Phase 7) or Billing (Phase 11) — no telehealth-specific documentation screen exists, per IA §15

---

# PHASE 11 — Billing

V1 scope: Invoices, Payments, Outstanding Balances, basic payer type (Self-Pay/Insurance/Other, Locked Decision 6). No claims processing anywhere in this phase.

### 90. Billing Dashboard (Module Landing)
- **Purpose:** In-context landing page reached by clicking "Billing" in the sidebar — distinct from screen 23 (the cross-role Dashboard's login landing for Billing Staff), though both surface similar KPIs.
- **Role:** Billing Staff, Clinic Admin
- **Pattern:** P-LIST (module landing)
- **Entry:** Billing sidebar item
- **Exit/Next:** Invoice List (91), Outstanding Balance (96), Payment History (95)
- **Layout:** Header (KPI strip: total outstanding, this month's revenue, overdue count) + secondary nav (Invoices, Payments, Outstanding Balances) + quick "Record Payment" / "New Invoice" actions
- **Hierarchy:** KPI strip first (orientation), then the secondary nav into the specific worklist needed
- **Sections:** KPI strip, Secondary nav
- **Components:** Stat tiles, secondary nav tabs
- **Primary CTA:** "New Invoice"
- **Secondary Actions:** "Record Payment"
- **Filters/Search/Sort:** N/A (this landing page itself; filters live on the sub-screens)
- **States:** Loading: L1. Empty: E3 if genuinely nothing outstanding. Error: ERR1. Success: N/A
- **Permissions:** Billing Staff and Admin full; Receptionist reaches Invoice creation/payment-taking but not this KPI landing (their entry point is the Client 360 Billing tab or a direct "Take Payment" action, not this module home)
- **HIPAA/Privacy:** KPI strip is financial-only, no service/clinical framing beyond amounts
- **Responsive:** KPI strip scrolls horizontally on mobile
- **Navigation:** Module home; distinct entry point from screen 23 per the reasoning in IA §4/§28.14 note — same data, different context, not a duplicate

### 91. Invoice List
- **Purpose:** Browse/search all invoices clinic-wide.
- **Role:** Billing Staff, Clinic Admin
- **Pattern:** P-TABLE
- **Entry:** Billing Dashboard secondary nav
- **Exit/Next:** Invoice Detail (93), Create Invoice (92)
- **Layout:** Header ("New Invoice") + filter/search bar (client, status, date range, payer type) + table (client, date, amount, status, payer type)
- **Hierarchy:** Outstanding/overdue surfaced via default sort or a visual flag, not buried
- **Sections:** Filter bar, Invoice table
- **Components:** Table rows, status chip (Paid/Outstanding/Overdue), payer-type badge
- **Primary CTA:** "New Invoice"
- **Secondary Actions:** Row click → Invoice Detail
- **Filters/Search/Sort:** Status, payer type, date range; search by client name/invoice number
- **States:** Loading: L1. Empty: E1/E2. Error: ERR1. Success: N/A
- **Permissions:** Billing Staff/Admin only
- **HIPAA/Privacy:** Invoice rows reference service names (e.g., "Individual Therapy — 45 min") but never diagnosis or note content
- **Responsive:** Table → card list
- **Navigation:** Root list; Client Billing (46) is the same data filtered to one client

### 92. Create Invoice
- **Purpose:** Generate an invoice for a completed (or scheduled) service.
- **Role:** Billing Staff, Receptionist, Clinic Admin
- **Pattern:** P-FORM
- **Entry:** Invoice List "New Invoice," Client Billing "New Invoice," Completed Appointment "Mark Billable"
- **Exit/Next:** Invoice Detail (93)
- **Layout:** Header (client, pre-filled if launched from an appointment/client context) + form: linked appointment/service, amount (auto-populated from Services pricing, editable), payer type (Self-Pay/Insurance/Other), due date, notes
- **Hierarchy:** Client and linked service first, amount/payer type next
- **Sections:** Client & Service, Amount & Payer Type, Due Date, Notes
- **Components:** Client selector, service/appointment linker, amount field, payer-type select, date picker
- **Primary CTA:** "Create Invoice"
- **Secondary Actions:** "Save as Draft," "Cancel" (C2)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2. Success: S2, routes to Invoice Detail
- **Permissions:** Receptionist can create for standard services; Billing Staff/Admin have full override on amount
- **HIPAA/Privacy:** Service name is the only clinical-adjacent field, and it's a billing code/label (e.g., "Individual Therapy Session"), not clinical narrative
- **Responsive:** Form stacks
- **Navigation:** Creates the record shown on Invoice List (91) and Client Billing (46) — one invoice, two views

### 93. Invoice Detail
- **Purpose:** View/manage a single invoice.
- **Role:** Billing Staff, Clinic Admin, Therapist (read-only balance-relevant view, reduced), Client (Portal, their own invoice only)
- **Pattern:** P-DETAIL
- **Entry:** Invoice List, Client Billing
- **Exit/Next:** Payment (94), Transaction Detail (97)
- **Layout:** Header (invoice number, client, status, amount) + line items + payer type + payment history for this invoice + "Record Payment" action
- **Hierarchy:** Amount due and status are most prominent
- **Sections:** Header, Line items, Payer type, Payment history
- **Components:** Line item table, status chip, "Record Payment" button, "Send to Client" action
- **Primary CTA:** "Record Payment"
- **Secondary Actions:** "Send to Client," "Edit" (if unpaid/draft), "Void" (C1, if issued in error)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: S1 on actions
- **Permissions:** Client Portal view is read-only, shows their own invoice only, no internal notes field
- **HIPAA/Privacy:** No clinical content; audit-logged for Void actions specifically given financial-record integrity requirements
- **Responsive:** Stacks vertically
- **Navigation:** The one detail surface reached from both Invoice List and Client Billing

### 94. Payment
- **Purpose:** Record a payment against an invoice or balance.
- **Role:** Billing Staff, Receptionist, Client (Portal, self-service payment)
- **Pattern:** P-FORM / P-MODAL
- **Entry:** Invoice Detail "Record Payment," Client Billing, Billing Dashboard quick action, Client Portal Billing (120)
- **Exit/Next:** Payment History (95), Invoice Detail updates to Paid/Partially Paid
- **Layout:** Modal: amount (pre-filled to balance due, editable for partial payment), method (Card/Cash/Check/Other), reference/note
- **Hierarchy:** Amount is the primary field
- **Sections:** Amount, Method, Reference
- **Components:** Amount input, method selector, "Confirm Payment" button
- **Primary CTA:** "Confirm Payment"
- **Secondary Actions:** "Cancel"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L2. Empty: N/A. Error: ERR2 (invalid amount) or ERR1 (processing failure for card payments — clear retry, no double-charge risk communicated). Success: S2 confirmation, invoice/balance updates immediately
- **Permissions:** Client Portal self-service payment is restricted to card/approved methods only, no ability to record cash/check on their own behalf
- **HIPAA/Privacy:** Payment processing itself is PCI-scope, not HIPAA-PHI — this screen collects no clinical information; card details are handled via a compliant processor, never stored directly in the app database (flagged as an integration/backend expectation)
- **Responsive:** Standard modal, full-screen on mobile (especially relevant for client self-service payment)
- **Navigation:** Sub-action reachable from multiple entry points, one payment record

### 95. Payment History
- **Purpose:** Chronological log of all payments received.
- **Role:** Billing Staff, Clinic Admin
- **Pattern:** P-TABLE
- **Entry:** Billing Dashboard secondary nav
- **Exit/Next:** Transaction Detail (97)
- **Layout:** Header + filter bar (date range, method, client) + table (date, client, amount, method, invoice reference)
- **Hierarchy:** Most recent first
- **Sections:** Filter bar, Payment table
- **Components:** Table rows
- **Primary CTA:** N/A (a log/browse surface)
- **Secondary Actions:** Row click → Transaction Detail
- **Filters/Search/Sort:** Date range, method, client search
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** Billing Staff/Admin only
- **HIPAA/Privacy:** Financial data only
- **Responsive:** Table → card list
- **Navigation:** Feeds Transaction Detail; aggregates the same records shown per-client on Client Billing (46)

### 96. Outstanding Balance
- **Purpose:** The collections-focused worklist — who owes money, how much, how overdue.
- **Role:** Billing Staff, Clinic Admin
- **Pattern:** P-WORKLIST
- **Entry:** Billing Dashboard secondary nav, Billing Dashboard (23/90) widget
- **Exit/Next:** Client Billing (46), Payment (94)
- **Layout:** Header + table/list: client, balance amount, days overdue, last payment date, sorted by days-overdue descending
- **Hierarchy:** Most overdue first
- **Sections:** Outstanding list
- **Components:** Row (client, amount, overdue badge), "Record Payment" / "Send Reminder" actions
- **Primary CTA:** "Send Reminder" (bulk or per-row, routes through Communications)
- **Secondary Actions:** "Record Payment," row click → Client Billing
- **Filters/Search/Sort:** Filter by days-overdue threshold, payer type; sort by amount or days overdue
- **States:** Loading: L1. Empty: E3 ("No outstanding balances"). Error: ERR1. Success: S1 on reminder sent
- **Permissions:** Billing Staff/Admin only
- **HIPAA/Privacy:** Client name + amount only, no service/clinical detail beyond what Invoice List already shows
- **Responsive:** List stacks
- **Navigation:** A filtered worklist over the same Invoice data (91), not a separate ledger

### 97. Transaction Detail
- **Purpose:** Full detail on a single financial transaction (payment, refund, adjustment).
- **Role:** Billing Staff, Clinic Admin
- **Pattern:** P-DETAIL
- **Entry:** Payment History, Invoice Detail
- **Exit/Next:** Back to Payment History or Invoice Detail
- **Layout:** Header (transaction type, amount, date) + linked invoice + method/reference + processor confirmation ID (if card)
- **Hierarchy:** Amount and linked invoice are primary
- **Sections:** Transaction summary, Linked invoice
- **Components:** Detail fields, "View Invoice" link
- **Primary CTA:** N/A (read view) — "Issue Refund" if applicable (C1 confirmation)
- **Secondary Actions:** "Issue Refund," "Print Receipt"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR1. Success: S1 on refund action
- **Permissions:** Billing Staff/Admin only; refund issuance may be Admin-only depending on Settings > Roles & Permissions configuration
- **HIPAA/Privacy:** Financial data only; refund actions are audit-logged given their financial-integrity significance
- **Responsive:** Stacks vertically
- **Navigation:** Terminal detail screen reached from Payment History or Invoice Detail

---

# PHASE 12 — Reports

Four categories on one module, per IA §17 — kept practical for a single clinic, not an analytics suite.

### 98. Reports Dashboard
- **Purpose:** Module landing page with category navigation into the four report types.
- **Role:** Clinic Admin (all categories), Therapist (Provider — own stats), Billing Staff (Financial only)
- **Pattern:** P-LIST (module landing with tabs)
- **Entry:** Reports sidebar item
- **Exit/Next:** Appointment Reports (99), Client Reports (100), Clinical Outcome Reports (101), Provider Reports (102), Financial Reports (103)
- **Layout:** Header (date-range selector, applies clinic-wide to whichever category is active) + category tabs (Operational, Clinical, Financial, Provider) + active category's report content inline
- **Hierarchy:** Category tabs are the primary navigation device — this is one page with four contents, not four pages
- **Sections:** Date-range selector, Category tabs, Active report content
- **Components:** Tab bar, date-range picker, chart/table components (per category)
- **Primary CTA:** "Export" (CSV, where applicable)
- **Secondary Actions:** Change date range, switch category
- **Filters/Search/Sort:** Date range; category-specific filters (e.g., by provider) within each tab
- **States:** Loading: L1 per report. Empty: E1 ("No data for this period"). Error: ERR1. Success: N/A
- **Permissions:** Tab visibility itself is role-scoped — Billing Staff only ever sees the Financial tab exist; Therapist sees Provider (own stats only, no other providers listed)
- **HIPAA/Privacy:** All reports are aggregate/statistical — no report drills down to individual clinical note content; Clinical Reports show trend/status counts (e.g., "12 treatment plans due for review"), never client-identified clinical detail beyond what a role's other permissions already allow
- **Responsive:** Tabs become a dropdown on mobile; charts simplify
- **Navigation:** Root of Reports; the only module where "screens" 99–103 are genuinely tabs of one page rather than distinct destinations

### 99. Appointment Reports
- **Purpose:** Operational reporting on scheduling patterns.
- **Role:** Clinic Admin, Receptionist (if granted)
- **Pattern:** Tab content within Reports Dashboard (98)
- **Entry:** Reports > Operational tab
- **Exit/Next:** N/A (terminal analytical view); "Export"
- **Layout:** Stat tiles (appointment volume, cancellation rate, no-show rate, new vs. returning clients) + trend chart over the selected date range
- **Hierarchy:** Stat tiles first (headline numbers), chart below (trend over time)
- **Sections:** Stat tiles, Trend chart
- **Components:** Stat tiles, line/bar chart
- **Primary CTA:** "Export"
- **Secondary Actions:** Change date range
- **Filters/Search/Sort:** Date range, provider filter
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** Clinic-wide by default; Admin only unless Reception is explicitly granted (Settings > Roles & Permissions)
- **HIPAA/Privacy:** Aggregate counts only, no client-identified rows
- **Responsive:** Stat tiles wrap; chart scales down
- **Navigation:** Operational category within Reports Dashboard

### 100. Client Reports
- **Purpose:** New-client and client-activity reporting.
- **Role:** Clinic Admin
- **Pattern:** Tab content within Reports Dashboard (98) (grouped under Operational, per IA §17's four-category structure)
- **Entry:** Reports > Operational tab (Client Activity section)
- **Exit/Next:** "Export"
- **Layout:** Stat tiles (new clients this period, returning clients, active vs. inactive/discharged breakdown) + trend chart
- **Hierarchy:** Same pattern as 99
- **Sections:** Stat tiles, Trend chart
- **Components:** Stat tiles, chart
- **Primary CTA:** "Export"
- **Secondary Actions:** Change date range
- **Filters/Search/Sort:** Date range
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** Admin only
- **HIPAA/Privacy:** Aggregate counts only, no client-identified rows
- **Responsive:** Same as 99
- **Navigation:** A section within the Operational category, not a separate top-level report

### 101. Clinical Outcome Reports
- **Purpose:** Clinical-category reporting — assessment trends, treatment-plan status, outcomes, at the aggregate clinic level.
- **Role:** Clinic Admin, Therapist (own caseload aggregate)
- **Pattern:** Tab content within Reports Dashboard (98)
- **Entry:** Reports > Clinical tab
- **Exit/Next:** "Export"
- **Layout:** Stat tiles (assessments completed this period, treatment plans due for review, average outcome trend direction) + aggregate trend chart (e.g., average score change across the caseload)
- **Hierarchy:** Aggregate stats first, chart second
- **Sections:** Stat tiles, Aggregate trend chart
- **Components:** Stat tiles, chart
- **Primary CTA:** "Export"
- **Secondary Actions:** Change date range, filter by provider (Admin only)
- **Filters/Search/Sort:** Date range, provider filter (Admin)
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** Therapist sees only their own caseload's aggregate, never client-identified rows or other providers' data; Admin sees clinic-wide aggregate with a provider filter
- **HIPAA/Privacy:** This is the most sensitive report category — enforced strictly aggregate/statistical, no drill-through to an individual client's assessment result from this screen (that path only exists via the permitted Client 360)
- **Responsive:** Same pattern as other report tabs
- **Navigation:** Clinical category within Reports Dashboard

### 102. Provider Reports
- **Purpose:** Per-provider activity and documentation-compliance reporting.
- **Role:** Clinic Admin (all providers), Therapist (own stats only)
- **Pattern:** Tab content within Reports Dashboard (98)
- **Entry:** Reports > Provider tab
- **Exit/Next:** "Export"
- **Layout:** Table/stat view: appointment volume, completed sessions, documentation-pending count, per provider (Admin) or just self (Therapist)
- **Hierarchy:** Documentation-pending column surfaced prominently (operationally the most actionable metric)
- **Sections:** Provider stat table
- **Components:** Table rows (Admin) or single stat-tile set (Therapist)
- **Primary CTA:** "Export" (Admin)
- **Secondary Actions:** Change date range
- **Filters/Search/Sort:** Date range; provider filter (Admin)
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** Therapist view is hard-scoped to self, cannot select another provider from a dropdown that doesn't exist for them
- **HIPAA/Privacy:** Documentation-pending is a count, not a list of which specific notes/clients — avoids exposing one provider's caseload detail to another
- **Responsive:** Table → stacked cards
- **Navigation:** Provider category within Reports Dashboard

### 103. Financial Reports
- **Purpose:** Revenue, payments, and outstanding-balance reporting.
- **Role:** Billing Staff, Clinic Admin
- **Pattern:** Tab content within Reports Dashboard (98)
- **Entry:** Reports > Financial tab
- **Exit/Next:** "Export"
- **Layout:** Stat tiles (revenue this period, payments received, outstanding total) + trend chart (revenue over time) + payer-type breakdown (Self-Pay/Insurance/Other split)
- **Hierarchy:** Revenue and Outstanding totals lead; trend and breakdown follow
- **Sections:** Stat tiles, Trend chart, Payer-type breakdown
- **Components:** Stat tiles, chart, simple breakdown chart (pie/bar)
- **Primary CTA:** "Export"
- **Secondary Actions:** Change date range
- **Filters/Search/Sort:** Date range
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: N/A
- **Permissions:** Billing Staff and Admin only — this is the one category Billing Staff has full access to (IA §21)
- **HIPAA/Privacy:** Financial data only; payer-type breakdown is billing metadata, not a step toward claims reporting (explicitly out of scope per Locked Decision 6)
- **Responsive:** Same pattern as other report tabs
- **Navigation:** Financial category within Reports Dashboard

---

# PHASE 13 — Settings

Per IA §18 — clinic-wide configuration, mostly Admin-only, with a reduced "My Settings" scope for Therapists.

### 104. Clinic Profile
- **Purpose:** Core clinic identity/contact info used across the app and public site.
- **Role:** Clinic Admin
- **Pattern:** P-FORM
- **Entry:** Settings sidebar item (default landing)
- **Exit/Next:** Saves in place
- **Layout:** Header + form: clinic name, address, phone, hours, logo upload, public-site copy (About text)
- **Hierarchy:** Identity fields first
- **Sections:** Identity, Contact, Hours, Branding
- **Components:** Text inputs, logo uploader, hours picker
- **Primary CTA:** "Save Changes"
- **Secondary Actions:** "Preview Public Site"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A (pre-filled at clinic setup). Error: ERR2. Success: S1
- **Permissions:** Admin only
- **HIPAA/Privacy:** No PHI; purely clinic-identity data
- **Responsive:** Form stacks
- **Navigation:** Root of Settings

### 105. Providers & Staff
- **Purpose:** Manage the clinic's staff roster and their roles.
- **Role:** Clinic Admin
- **Pattern:** P-TABLE
- **Entry:** Settings sidebar
- **Exit/Next:** Staff detail (edit role/permissions), Roles & Permissions (112)
- **Layout:** Header ("Invite Staff") + table: name, role, status (Active/Inactive), specialties (for Therapists)
- **Hierarchy:** Active staff first
- **Sections:** Staff table
- **Components:** Table rows, "Invite Staff" button, role badge
- **Primary CTA:** "Invite Staff"
- **Secondary Actions:** Row click → edit staff detail, Deactivate (C1)
- **Filters/Search/Sort:** Filter by role, status; search by name
- **States:** Loading: L1. Empty: E1 (unlikely — Admin's own account always exists). Error: ERR1. Success: S1 on invite/save
- **Permissions:** Admin only
- **HIPAA/Privacy:** Staff records are administrative, not PHI; deactivation immediately revokes access (audit-logged, §0.11)
- **Responsive:** Table → card list
- **Navigation:** Feeds Roles & Permissions and per-provider Availability config

### 106. Services
- **Purpose:** Define the therapy services the clinic offers (Individual, Couples, Family, Group, Assessment, etc., per Blueprint §6).
- **Role:** Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Settings sidebar
- **Exit/Next:** Referenced by Create Appointment (26), Create Invoice (92), public Services page (02)
- **Layout:** Header ("New Service") + service list (name, duration, default price, format support: in-person/virtual)
- **Hierarchy:** Alphabetical or usage-frequency order
- **Sections:** Service list
- **Components:** Service row, "New Service" button
- **Primary CTA:** "New Service"
- **Secondary Actions:** Edit, Deactivate (C1 — retains history, doesn't delete)
- **Filters/Search/Sort:** Search by name
- **States:** Loading: L1. Empty: E1 (clinic must configure at least one to use Scheduling/Billing — onboarding-critical empty state). Error: ERR1. Success: S1
- **Permissions:** Admin only
- **HIPAA/Privacy:** No PHI
- **Responsive:** List stacks
- **Navigation:** Single source of truth referenced across Schedule, Billing, and the public website

### 107. Availability
- **Purpose:** Configure clinic-wide default hours and per-provider schedules.
- **Role:** Clinic Admin (clinic defaults), Therapist (own schedule — the "My Settings" scope)
- **Pattern:** P-FORM (calendar-style editor)
- **Entry:** Settings sidebar (Admin), My Settings (Therapist)
- **Exit/Next:** Feeds available slots on Calendar (24) and public Booking (10)
- **Layout:** Weekly recurring-hours grid + exceptions/time-off calendar + per-provider override toggle (Admin view only)
- **Hierarchy:** Weekly grid is the primary editing surface
- **Sections:** Weekly hours, Exceptions/time-off
- **Components:** Hours grid (drag-to-set), exception date picker, provider selector (Admin)
- **Primary CTA:** "Save Availability"
- **Secondary Actions:** "Add Time Off"
- **Filters/Search/Sort:** Provider selector (Admin only)
- **States:** Loading: L1. Empty: E1 (must be configured before booking works — onboarding-critical). Error: ERR2. Success: S1
- **Permissions:** Therapist can only edit their own; Admin can edit any provider's or set clinic-wide defaults
- **HIPAA/Privacy:** No PHI — scheduling capacity only
- **Responsive:** Grid becomes a day-by-day list on mobile
- **Navigation:** Directly feeds slot availability on Schedule and public Booking — one source of truth

### 108. Appointment Settings
- **Purpose:** Clinic-wide scheduling rules — appointment types, buffers, cancellation policy, booking-window rules.
- **Role:** Clinic Admin
- **Pattern:** P-FORM
- **Entry:** Settings sidebar
- **Exit/Next:** Saves in place; governs behavior across Schedule and public Booking
- **Layout:** Sections: Appointment Types (link to Services), Buffers between sessions, Cancellation policy (notice window, fee if any), Booking window (how far in advance clients can book)
- **Hierarchy:** Grouped by concern, not a single long form
- **Sections:** Types, Buffers, Cancellation Policy, Booking Window
- **Components:** Toggles, numeric inputs, policy text editor
- **Primary CTA:** "Save Changes"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A (defaults pre-set). Error: ERR2. Success: S1
- **Permissions:** Admin only
- **HIPAA/Privacy:** No PHI
- **Responsive:** Sections stack
- **Navigation:** Governs behavior on Schedule (Phase 4) and public Booking (Phase 1) without duplicating those screens' logic

### 109. Notifications
- **Purpose:** Configure reminder timing and channel defaults.
- **Role:** Clinic Admin
- **Pattern:** P-FORM
- **Entry:** Settings sidebar
- **Exit/Next:** Governs Communications > Automation Rules (83) behavior
- **Layout:** List of notification types (Appointment reminder, Cancellation notice, Form reminder, No-show follow-up) each with channel toggles (Email/SMS) and timing (e.g., "24 hours before")
- **Hierarchy:** Grouped by notification type
- **Sections:** Notification type list
- **Components:** Toggle switches, timing selectors
- **Primary CTA:** "Save Changes"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A (defaults pre-set per Blueprint §19). Error: ERR2. Success: S1
- **Permissions:** Admin only
- **HIPAA/Privacy:** Configuring channel/timing only — the content itself is governed by Communication Templates (83), with the same no-PHI-in-notifications rule
- **Responsive:** List stacks
- **Navigation:** Configuration layer behind Communications' automation behavior — not a duplicate of screen 83

### 110. Forms & Templates
- **Purpose:** Same destination as Form Templates (71) — clinic-wide template library for forms and clinical documentation styles (SOAP/DAP/BIRP/GIRP/Narrative/Custom note templates, plus treatment plan templates).
- **Role:** Clinic Admin
- **Additional content beyond screen 71:** also hosts **Clinical Note Template** management (which the Forms module itself doesn't own, since Clinical Notes are explicitly not Forms per IA §13) — default template per style, and the clinic's set of Custom note templates
- **Layout addition:** a second section, "Clinical Documentation Templates," alongside the Form Templates list — Note template rows show style (SOAP/DAP/BIRP/GIRP/Narrative/Custom) and a "Set as default" action
- **Permissions:** Admin only for edits; Therapist's My Settings (personal scope) can select their own *default* style without editing the template itself
- **Navigation:** One configuration surface reached from both Settings and Forms & Documents (71), per IA §5 — not a duplicate

### 111. Integrations
- **Purpose:** Connect third-party services (e.g., telehealth vendor, payment processor, calendar sync).
- **Role:** Clinic Admin
- **Pattern:** P-LIST
- **Entry:** Settings sidebar
- **Exit/Next:** Vendor-specific connection flow (external OAuth or API-key entry)
- **Layout:** Header + integration cards (Telehealth vendor, Payment processor, Email/SMS provider) each with Connected/Not Connected status
- **Hierarchy:** Connected integrations first, or grouped by category
- **Sections:** Integration cards
- **Components:** Integration card, "Connect"/"Disconnect" action, status badge
- **Primary CTA:** "Connect" (per integration)
- **Secondary Actions:** "Disconnect" (C1 — warns of functional impact, e.g., "Disconnecting Telehealth will disable Join actions clinic-wide")
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1 (no integrations connected yet — clinic can still operate with reduced functionality). Error: ERR1 (connection failure — vendor-specific message where possible). Success: S1
- **Permissions:** Admin only
- **HIPAA/Privacy:** A BAA-status indicator is shown per integration category where relevant (e.g., Telehealth, Email/SMS) as a visible reminder, not a formal compliance guarantee (per the task's HIPAA-awareness framing — the wireframe surfaces the consideration, doesn't claim compliance)
- **Responsive:** Cards stack
- **Navigation:** This is also where the Telehealth vendor is configured (IA §5's note that Settings retains a Telehealth page despite no top-level Telehealth menu)

### 112. Roles & Permissions
- **Purpose:** Configure what each role can see/do — including the granular exceptions the Locked Decisions require (cross-therapist access, per Locked Decision 1).
- **Role:** Clinic Admin
- **Pattern:** P-TABLE / P-FORM hybrid
- **Entry:** Settings sidebar, Providers & Staff (per-person override)
- **Exit/Next:** Saves in place
- **Layout:** Role selector (Admin/Therapist/Receptionist/Billing Staff) + permission matrix for that role (module-level toggles) + a dedicated "Cross-Therapist Access" section listing specific grant exceptions (Therapist A ↔ Therapist B's caseload) rather than a blanket setting
- **Hierarchy:** Role selector first, then that role's matrix; cross-therapist exceptions in a clearly separated section since they're person-specific, not role-wide
- **Sections:** Role selector, Permission matrix, Cross-Therapist Access exceptions
- **Components:** Role tabs, toggle matrix, exception-grant rows ("Dr. A can view Dr. B's clients" with a reason field, start/end date optional)
- **Primary CTA:** "Save Changes"
- **Secondary Actions:** "Add Exception" (cross-therapist grant)
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A (default role permissions pre-set per the approved IA). Error: ERR2 (e.g., attempting to remove the last Admin). Success: S1
- **Permissions:** Admin only — and this screen is itself the most consequential permission-editing surface in the app, so every change is audit-logged
- **HIPAA/Privacy:** This screen is the direct implementation surface for Locked Decision 1 — cross-therapist access must be an explicit, auditable, reversible grant, never a default-on setting
- **Responsive:** Matrix becomes a stacked per-module list on mobile
- **Navigation:** Governs visibility across every other screen in the product (§0.8 baseline) — the source of truth PR1/PR2/PR3 decisions are checked against

### 113. Security Settings
- **Purpose:** MFA policy, session timeout, and audit log access.
- **Role:** Clinic Admin
- **Pattern:** P-FORM + P-TABLE (audit log)
- **Entry:** Settings sidebar
- **Exit/Next:** Audit Log view (within this screen)
- **Layout:** Sections: MFA policy (required/optional per role), session timeout duration, password policy, Audit Log (searchable table of security-relevant events: logins, permission changes, failed attempts, clinical-record exports)
- **Hierarchy:** Policy configuration first, Audit Log below as a secondary, browsable section
- **Sections:** MFA Policy, Session Policy, Password Policy, Audit Log
- **Components:** Toggle switches, numeric inputs, audit log table with filters
- **Primary CTA:** "Save Changes" (policy sections)
- **Secondary Actions:** "Export Audit Log"
- **Filters/Search/Sort:** Audit log: filter by event type, user, date range
- **States:** Loading: L1. Empty: N/A (policy has defaults; audit log empty only immediately post-launch — E1). Error: ERR2. Success: S1
- **Permissions:** Admin only; this screen is itself one of the most sensitive in Settings
- **HIPAA/Privacy:** This screen *is* the visible surface of the audit-logging foundation referenced throughout this document (§0.11) — it does not itself make the system compliant, but it's where the compliance-relevant configuration and evidence live
- **Responsive:** Audit log table → card list on mobile
- **Navigation:** Terminal Settings screen; referenced conceptually by every "audit-logged" note throughout this document

---

# PHASE 14 — Client Portal

Deliberately much simpler than the staff app — a client-scoped lens on the same underlying data (IA §20), five core destinations plus profile/consent, no clinical authoring surfaces of any kind.

### 114. Client Home
- **Purpose:** The client's landing page — "what's next for my care."
- **Role:** Client
- **Pattern:** P-LIST (simple widget stack, far lighter than staff Dashboards)
- **Entry:** Post-login landing for Client role
- **Exit/Next:** Client Appointments (115), Client Forms (117), Client Telehealth (122)
- **Layout:** Header (welcome, clinic branding) + next appointment card (prominent) + outstanding items (forms/balance, if any) + quick actions
- **Hierarchy:** Next appointment is the single most prominent element; outstanding items follow
- **Sections:** Next appointment, Outstanding items, Quick actions
- **Components:** Appointment card, outstanding-item badges, quick-action buttons (Book, Message, Pay)
- **Primary CTA:** "Join Session" (if a virtual appointment is within the join window) or "View Appointment" otherwise
- **Secondary Actions:** "Book Appointment," "Message my therapist"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1 ("No upcoming appointments" + Book CTA). Error: ERR1. Success: N/A
- **Permissions:** Strictly self-scoped — a client can never see any other client's data, enforced identically to staff-side scoping but with zero exceptions (no "shared access" concept exists for clients)
- **HIPAA/Privacy:** No clinical content appears here — appointment logistics and administrative items only
- **Responsive:** Single column at every breakpoint (portal is mobile-first by design)
- **Navigation:** Root of the Client Portal

### 115. Client Appointments
- **Purpose:** The client's own appointment history and upcoming schedule.
- **Role:** Client
- **Pattern:** P-LIST
- **Entry:** Client Home, Portal nav
- **Exit/Next:** Client Booking/Rescheduling (116)
- **Layout:** Upcoming section + History section (past appointments, completed/cancelled/no-show status shown plainly)
- **Hierarchy:** Upcoming first
- **Sections:** Upcoming, History
- **Components:** Appointment card/row, "Book" / "Reschedule" / "Cancel" actions
- **Primary CTA:** "Book Appointment"
- **Secondary Actions:** "Reschedule," "Cancel" (subject to clinic policy window, Settings > Appointment Settings)
- **Filters/Search/Sort:** N/A (typically a short list for one client)
- **States:** Loading: L1. Empty: E1. Error: ERR1. Success: S1 on reschedule/cancel
- **Permissions:** Client's own appointments only
- **HIPAA/Privacy:** Logistics only, consistent with the rest of the portal
- **Responsive:** Single column
- **Navigation:** Feeds Booking/Rescheduling (116)

### 116. Client Booking / Rescheduling
- **Purpose:** Existing-client self-service booking, skipping the Lead pipeline entirely (IA §19/§20).
- **Role:** Client
- **Pattern:** P-WIZARD (shorter than the public wizard — no contact-info step, since the client is already known)
- **Entry:** Client Home, Client Appointments "Book"/"Reschedule"
- **Exit/Next:** Confirmation (inline S2), appointment appears on Schedule (24) immediately
- **Layout:** Select Service → Select Therapist (their existing therapist is offered first as a convenient default, but the full eligible therapist directory is equally browsable and unrestricted) → Select Slot → Confirm — three short steps, reusing the same slot-picker component as public Booking (10) and staff Create Appointment (26)
- **Hierarchy:** Existing therapist is a convenience default, not a restriction — switching to any other eligible therapist/service is a first-class, equally-prominent path, not a hidden or secondary option
- **Sections:** Service, Therapist, Slot, Confirm
- **Components:** Same slot-picker component as screens 10/26; full therapist/service directory (same component as the public Therapist Directory, 03)
- **Primary CTA:** "Confirm Booking"
- **Secondary Actions:** "Browse all therapists/services"
- **Filters/Search/Sort:** Filter therapist list by service/specialty/format, same as screen 03
- **States:** Loading: L1. Empty: E1 (no availability — offers Contact/waitlist). Error: ERR4 (slot conflict, same pattern as screen 14). Success: S2 confirmation
- **Permissions:** **Product Owner decision:** a client may self-book with any therapist/service they are eligible for under clinic-configured rules and current availability — not limited to a therapist they've previously seen. Eligibility itself (e.g., a service requiring a referral, or a therapist not accepting new clients) is governed by Settings > Appointment Settings / Services (108/106), not by prior-treatment history. The client can only ever book/reschedule their own appointments.
- **HIPAA/Privacy:** No clinical data collected; same minimization as public Booking
- **Responsive:** Mobile-first, full-screen wizard
- **Navigation:** Attaches directly to the existing Client record — no Lead created, per IA §20

### 117. Client Forms
- **Purpose:** Complete assigned intake/consent/questionnaires; view completion history across intake cycles.
- **Role:** Client
- **Pattern:** P-LIST leading to Client Form Completion (74)
- **Entry:** Client Home, Portal nav
- **Exit/Next:** Client Form Completion (74)
- **Layout:** Outstanding section + Completed section (grouped by intake cycle if more than one exists, mirroring Client Forms tab 43's staff-side grouping)
- **Hierarchy:** Outstanding first
- **Sections:** Outstanding, Completed
- **Components:** Form row, status chip, "Start"/"Continue" button
- **Primary CTA:** "Start" (on the oldest outstanding item)
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E3 ("Nothing outstanding — you're all set"). Error: ERR1. Success: checklist item completes (S1)
- **Permissions:** Client's own forms only
- **HIPAA/Privacy:** Same protections as screen 74
- **Responsive:** Single column
- **Navigation:** Same underlying assignment records as Client 360 > Forms (43), filtered to this one client — not duplicated

### 118. Client Messages
- **Purpose:** Secure messaging with the care team.
- **Role:** Client
- **Pattern:** P-TIMELINE (chat-style)
- **Entry:** Client Home, Portal nav
- **Exit/Next:** N/A (self-contained)
- **Layout:** Thread view (typically one ongoing thread with their therapist/clinic) + composer
- **Hierarchy:** Most recent message visible
- **Sections:** Message history, Composer
- **Components:** Message bubble, composer
- **Primary CTA:** "Send"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1 ("Send a message to get started"). Error: ERR1 (send failure, message preserved in composer). Success: S1
- **Permissions:** Client's own thread(s) only
- **HIPAA/Privacy:** Same underlying data as Client Messages (45)/Message Thread (81), filtered; a visible note reminds the client this channel is for non-urgent communication, with crisis-resource information surfaced separately (not a substitute for emergency services)
- **Responsive:** Full-screen chat on mobile
- **Navigation:** Client-facing view of Communications (IA §14)

### 119. Client Documents
- **Purpose:** View documents shared by the clinic; upload requested files.
- **Role:** Client
- **Pattern:** P-LIST
- **Entry:** Client Home, Portal nav
- **Exit/Next:** N/A
- **Layout:** Shared-by-clinic section + Uploaded-by-me section + "Upload" button
- **Hierarchy:** Most recent first within each section
- **Sections:** Shared documents, My uploads
- **Components:** File row, "Upload" button
- **Primary CTA:** "Upload Document" (when the clinic has requested one)
- **Secondary Actions:** Download
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1. Error: ERR1 (upload failure). Success: S1
- **Permissions:** Client's own documents only
- **HIPAA/Privacy:** Same audit-logging as staff-side Document access (§0.11)
- **Responsive:** Single column; native file picker on mobile
- **Navigation:** Client-facing view of Client Documents (44)

### 120. Client Billing
- **Purpose:** View balance and pay invoices.
- **Role:** Client
- **Pattern:** P-LIST
- **Entry:** Client Home (if balance outstanding), Portal nav
- **Exit/Next:** Payment (94, client-facing variant)
- **Layout:** Balance summary (prominent if nonzero) + invoice list + payment history
- **Hierarchy:** Balance first
- **Sections:** Balance, Invoices, Payment history
- **Components:** Balance card, invoice row, "Pay Now" button
- **Primary CTA:** "Pay Now" (if balance > 0)
- **Secondary Actions:** "View Invoice"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E3 ("No balance due"). Error: ERR1. Success: S2 on payment (same pattern as screen 94)
- **Permissions:** Client's own billing only, self-service payment methods only (per screen 94's permission note)
- **HIPAA/Privacy:** Financial data only, same PCI-scope handling as staff-side Payment (94)
- **Responsive:** Single column
- **Navigation:** Client-facing view of Client Billing (46)

### 121. Client Profile
- **Purpose:** Client's own account/contact settings — not to be confused with the staff-side Client 360 (this is account management, not a clinical record view).
- **Role:** Client
- **Pattern:** P-FORM
- **Entry:** Portal nav (account/profile icon)
- **Exit/Next:** Saves in place
- **Layout:** Contact info (editable), notification preferences (email/SMS opt-in), password/security (link to change password, MFA setup)
- **Hierarchy:** Contact info first, security settings clearly separated
- **Sections:** Contact Info, Notification Preferences, Security
- **Components:** Text inputs, toggle switches, "Change Password" link
- **Primary CTA:** "Save Changes"
- **Secondary Actions:** "Change Password," "Set Up MFA"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: N/A. Error: ERR2. Success: S1
- **Permissions:** Client can edit their own contact/preference info; cannot edit clinical fields (none are exposed here at all)
- **HIPAA/Privacy:** A change to contact info that could affect appointment reminders is confirmed before saving
- **Responsive:** Form stacks
- **Navigation:** Distinct from Client 360 (37) — this is self-service account management, not the clinical record

### 122. Client Telehealth
- **Purpose:** Join an upcoming virtual session — the one telehealth destination the portal keeps as its own nav item (IA §20), since a client only ever needs to join their own session.
- **Role:** Client
- **Pattern:** Single action / P-CONFIRM leading into Pre-session Check (86)
- **Entry:** Client Home, Portal nav
- **Exit/Next:** Pre-session Check (86) → Waiting Room (87)
- **Layout:** Upcoming virtual appointment card + "Join" button (active only within the join window, same rule as screen 33)
- **Hierarchy:** Single card, single action
- **Sections:** Upcoming virtual appointment
- **Components:** Appointment card, "Join" button (disabled state with "Opens 10 min before" note outside the window)
- **Primary CTA:** "Join Session"
- **Secondary Actions:** N/A
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1 ("No upcoming virtual sessions"). Error: ERR1. Success: transitions into Pre-session Check
- **Permissions:** Client's own upcoming virtual appointment(s) only
- **HIPAA/Privacy:** Same as screen 33/86-89
- **Responsive:** Single column, large touch target for the Join button
- **Navigation:** Portal-side entry into the same telehealth flow as the staff side (Phase 10) — one flow, two authorized entry points

### 123. Client Consent
- **Purpose:** Review and sign consent documents.
- **Role:** Client
- **Pattern:** P-LIST leading to Consent Form (75)
- **Entry:** Client Home (if action needed), Portal nav
- **Exit/Next:** Consent Form (75)
- **Layout:** Current consent status + history of prior signed versions
- **Hierarchy:** Outstanding/needs-signature items surfaced prominently
- **Sections:** Current status, History
- **Components:** Consent status card, "Review & Sign" button, history list
- **Primary CTA:** "Review & Sign" (if outstanding)
- **Secondary Actions:** "Download my copy"
- **Filters/Search/Sort:** N/A
- **States:** Loading: L1. Empty: E1 flagged prominently if truly nothing on file (compliance gap, mirrors staff-side screen 47's framing). Error: ERR1. Success: S2 on signing (same as screen 75)
- **Permissions:** Client's own consent records only. For a minor/dependent client, this screen (and the signing action within it) is presented to the Guardian/Authorized Representative's account instead — per the guardian-consent decision on screen 75 — and that guardian account's access is limited to this tab plus other administrative Portal screens, never clinical ones.
- **HIPAA/Privacy:** Same protections as screen 75/47 — signed documents are immutable, audit-logged
- **Responsive:** Single column
- **Navigation:** Client-facing view of Client Consent (47)

---

## Wireframe Coverage Summary

| Phase | Screens | Count | Primary IA Module(s) |
|---|---|---|---|
| 1. Public Website | 01–14 | 14 | Public site, Intake & Leads (entry) |
| 2. Authentication | 15–19 | 5 | Cross-cutting |
| 3. Clinic Dashboards | 20–23 | 4 | Dashboard |
| 4. Schedule & Appointments | 24–33 | 10 | Schedule |
| 5. Clients | 34–48 | 15 | Clients |
| 6. Intake & Leads | 49–56 | 8 | Intake & Leads |
| 7. Clinical Care | 57–69 | 13 | Clinical Care, Client Profile |
| 8. Forms & Documents | 70–79 | 10 | Forms & Documents |
| 9. Communication | 80–85 | 6 | Communications |
| 10. Telehealth | 86–89 | 4 | Schedule (Virtual Sessions capability) |
| 11. Billing | 90–97 | 8 | Billing |
| 12. Reports | 98–103 | 6 | Reports |
| 13. Settings | 104–113 | 10 | Settings |
| 14. Client Portal | 114–123 | 10 | Client Portal (separate surface) |
| **Total** | | **123** | Maps exactly to the 10-item Final V1 Sidebar in `02-information-architecture.md` |

Screens documented by cross-reference rather than full duplicate spec (explicitly, to satisfy "no duplicate feature ownership"): 21 (references 25), 42 (references 68's content, and vice versa — merged Treatment Plan sub-view), 68 (references 42/67), 88 (references 33), 90 (distinct entry point from 23, cross-referenced), 110 (cross-referenced with 71), 116/117/118/119/120/122/123 (each a client-facing filtered view of a staff-side source of truth).

## Screens by Role

| Role | Screens with primary or notable access |
|---|---|
| **Public Visitor** | 01–14 |
| **Clinic Admin** | All staff screens (15–113), full access |
| **Psychologist/Therapist** | 15–20, 24, 26–28, 30–33 (view), 34–48 (own caseload), 57–69, 80–85 (own clients), 86–89, 98–99 (own), 101–102 (own), 104 (view), 107 (own availability), 110 (personal default only) |
| **Receptionist** | 15, 20–21, 24–31, 34–38, 43 (status), 46–47 (status/booking), 49–56, 70, 73, 76, 78–79 (status), 80–85, 90 (limited), 92, 94, 105 (view only) |
| **Billing Staff** | 15, 20, 23, 27 (read-only), 32 (billing status), 34 (minimal), 38 (read-only), 46, 90–97, 98, 103 |
| **Client** | 15–19 (portal variant), 114–123 |

## Screens by User Journey

**New client acquisition:** 01 → 02/03/04 → 09 → 10 → 11 → 12 → 13 → 74/75 → 55 → 37

**Reception's daily loop:** 21 → 49/50 → 25 → 24 → 30 → 46/94

**Therapist's session loop:** 20 → 27 → 30 (awareness) → 33/86–89 (if virtual) or in-person check-in → 37 → 59/60 → 32 → 46 (mark billable)

**Re-engagement / re-intake:** 34/35 → 37 → 43 → 56 → 74 → 41/66 (new or updated plan)

**Billing collections loop:** 23/90 → 96 → 46/94 → 95/97

**Client self-service:** 15/16 → 114 → 115/116, 117, 118, 120, 122, 123

## Cross-Screen UX Rules

1. Every list/table screen uses the shared Search/Filter/Sort pattern (§0.7) — filters persist across navigation.
2. Every destructive or irreversible action uses Confirmation Dialog C1 with a specific consequence statement and a specific confirm label — never a bare "Are you sure?"/"OK" pair.
3. Every multi-step flow (booking, intake, note-signing) warns on navigation-away with unsaved changes (C2).
4. No screen invents a new top-level menu; every screen in this document maps to a module in the approved `02-information-architecture.md`.
5. No client-specific data is ever shown on a public or unauthenticated screen (Phase 1 collects only contact/logistics data, never clinical content).
6. Every "global module + client-context" pair (e.g., Clinical Care ↔ Client Clinical Notes, Billing ↔ Client Billing) has exactly one editing surface; the other is always a filtered, read-consistent view.
7. Loading/Empty/Error/Success states are drawn from the shared pattern library (§0) on every screen; a screen only defines a custom variant when its behavior genuinely differs (e.g., the Risk/Safety indicator's deliberate absence-as-neutral-state, §69).

## Accessibility Requirements

Applies to all 123 screens, per §0.10: full keyboard operability with visible focus states; real form labels (not placeholder-only); status never conveyed by color alone; 44×44px minimum touch targets; ARIA live regions for async status changes; single H1 per screen with logical heading order; sufficient color contrast in both light and dark contexts if theming is supported; all data tables have accessible headers and are navigable without a mouse; all modals trap focus and are dismissible via keyboard (Esc); video/telehealth interface (Phase 10) provides captioning support as a vendor-capability expectation, flagged for confirmation during vendor selection (Settings > Integrations, 111).

## HIPAA/Privacy UX Considerations

This document does not claim any screen makes CareNexa HIPAA compliant — that depends on backend controls (encryption, BAAs, infrastructure) outside wireframe scope. At the UX layer, every screen in this document was designed against the baseline in §0.11 and the following recurring rules:
- **No PHI in low-friction surfaces:** notifications, email/SMS previews, browser tab titles, and URLs never carry clinical content (enforced on every Dashboard widget, every notification in 85, every automated message referenced in 83/109).
- **Role-based visibility is structural, not cosmetic:** restricted tabs/screens are absent (PR1), not greyed out — applied consistently across Client 360 (37) and every module built on top of it.
- **Restricted-but-aware patterns (PR3)** are used deliberately and sparingly — the Risk/Safety indicator (69) is the canonical example, giving Reception awareness without clinical detail per Locked Decision 5.
- **Audit-sensitive actions are called out per screen**, not assumed: signing a note (59), viewing/downloading a document (44/77), voiding an invoice (93), changing permissions (112), and every login/MFA event (15/16) are explicitly flagged as audit-logged.
- **Data minimization at the point of collection:** the public website and booking flow (Phase 1) collect only what's needed to hold an appointment — no clinical intake before the client is actually a scheduled or converted client.
- **Sensitive data masking:** MFA contact info is masked (16), signed documents are immutable rather than editable-in-place (75/47), and clinical questionnaire responses are invisible mid-completion even to staff (53/62).

## Resolved Wireframe Decisions (Product Owner)

The eight items previously listed under Open Wireframe Decisions have all been resolved by explicit Product Owner decision and applied to the affected screens:

1. **Calendar name-hiding (24)** — resolved: unpermitted providers see "Booked" only, no client name/service label.
2. **Note addendum UX (59/60)** — resolved: signed notes are permanently locked; addenda are separate records with their own author, timestamp, and independent sign-off.
3. **Who initiates re-intake (56)** — resolved: Therapist/Admin may initiate Clinical Re-intake; Receptionist/Admin may initiate Administrative Re-intake only; Receptionist cannot access or configure clinical questionnaire content.
4. **Guardianship/minor consent (75)** — resolved: V1 supports a Guardian/Authorized Representative signing variant; guardian access is limited to consent/administrative records, never clinical tabs.
5. **Session recording (33/86–89)** — resolved: explicitly out of scope for V1; no recording controls or recording-consent workflow are designed anywhere in the telehealth flow.
6. **Leads Pipeline visual pattern (49)** — resolved: a searchable/filterable list with stage filters is the sole V1 pattern; kanban is not used.
7. **Therapist access to Communication History (84)** — resolved: Therapist has access, scoped to own/permitted clients; Admin/Reception see the broader operational history; Billing has no access.
8. **Client booking therapist restriction (116)** — resolved: clients may book any eligible therapist/service under clinic-configured rules and availability, not limited to a previously-seen therapist.

## Open Wireframe Decisions

No unresolved wireframe-level decisions remain. All items raised during the prior review have been resolved above and reflected in their respective screen specifications.

## Verification Against Product Owner Decisions

- **Dashboards remain extremely user-friendly:** none of the eight decisions touched Dashboard layout (20–23); each role's widget-first, task-oriented design is unchanged.
- **Public website booking remains low-friction:** Phase 1 (01–14) is untouched by this round; no clinical data collection was introduced. The Client Portal booking flow (116) gained *more* freedom (any eligible therapist), not more friction.
- **Client 360 remains the central contextual hub:** Client Profile (37) and its tabs are unchanged in structure; the guardian-consent and addendum decisions reinforce the hub model by keeping all record history (signed notes, addenda, consent versions) visible in one place rather than fragmenting it.
- **Clinical information remains role-restricted:** every applied decision *tightens* this — Receptionist is now explicitly barred from clinical questionnaire content during re-intake (56), and guardian portal accounts are explicitly barred from all clinical tabs (75/47/123), extending the existing PR1 pattern rather than weakening it.
- **HIPAA/privacy considerations remain explicit:** each affected screen's HIPAA/Privacy bullet was updated in place, not removed; addenda and consent versioning now explicitly describe tamper-evident, audit-logged history.
- **No multi-tenant/enterprise UI introduced:** none of the eight decisions reference organizations, locations, or tenants; all changes are scoped to existing single-clinic screens.
- **No new top-level menus added:** all eight fixes were applied within existing screens (Calendar, Clinical Notes, Forms, Consent, Telehealth, Intake & Leads, Communications, Client Portal Booking) — the Final V1 Sidebar and Final Module Tree in `02-information-architecture.md` are unchanged.
- **No competitor UI/design copied:** changes were structural/behavioral (permission logic, record immutability, form-set gating), not visual — original UX structure is preserved throughout.

## Cross-Screen UX Rules (Addendum)

9. Signed clinical and consent records are immutable; any correction or update takes the form of a new, separately-signed record (a Clinical Note addendum, a new Consent version) — never an in-place edit of the original, per Product Owner decision.
10. Where a role's access is restricted to a subset of a screen's options (e.g., Receptionist's Administrative-only Re-intake, a Guardian account's consent-only Portal access), the restricted option set is presented as that role's complete, unremarkable experience — never as a visibly reduced version of someone else's screen (consistent with PR1/PR2, §0.8).

---

**05-wireframes.md FINALIZED FOR HTML/CSS PROTOTYPE**







