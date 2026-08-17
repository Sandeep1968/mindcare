# MindCare

This repository holds two implementations of MindCare, at different stages of maturity.

| | Where | Stack |
|---|---|---|
| **v2 (active)** | `client/`, `server/`, `docs/`, `prototype/` | React (Vite) + Tailwind, Node/Express, Postgres (Neon) |
| **v1 (legacy)** | repo root — `index.html`, `dashboard.html`, `app.js`, `styles.css`, `images/` | Zero-dependency static HTML/CSS/JS, localStorage only |

v1 is a complete, working solo-practice manager (see [Legacy v1: MindCare static app](#legacy-v1-mindcare-static-app) below) and is kept as-is for reference and as a fallback that needs no server or database. v2 is the full-stack rebuild under active development.

---

## v2 — React + Express + Neon Postgres

Full-stack rebuild of MindCare:
- **Client:** React (Vite) + Tailwind CSS v4
- **Server:** Node.js + Express
- **Database:** PostgreSQL on [Neon](https://neon.tech)

### Prerequisites

- Node.js 20+
- A Neon project (free tier is fine)

### 1. Neon setup

1. Create a project at https://console.neon.tech
2. Copy the **connection string** (URI), e.g.
   `postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. In this repo:

```bash
cd server
copy .env.example .env
```

Paste your URI into `DATABASE_URL` and set a strong `JWT_SECRET`.

### 2. Install & migrate

From the repo root:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

npm run db:migrate
npm run db:seed
```

Seed creates:
- Practitioner: `practitioner@mindcare.local` / `mindcare123` (or values from `.env`)
- Sample website bookings (one virtual, one in-person)

**Without Neon:** the API runs in **demo mode**. Open `/dashboard/login` and use one-click **Admin / Doctor / Help desk** (password `mindcare123`).

### 3. Run locally

```bash
npm install concurrently --save-dev
npm run dev
```

Or in two terminals:

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

Vite proxies `/api` → Express.

### App routes

#### Public website (no login)
| URL | Purpose |
|---|---|
| `/` | Public clinic site |
| `/book` | Book / find support |
| `/groups`, `/therapy`, `/assessments`, … | Marketing pages |

#### Separate workspace (admin, staff/doctors, existing patients)
| URL | Purpose |
|---|---|
| `/dashboard/login` | Staff / admin sign-in |
| `/dashboard/login?intent=patient` | Existing patient portal sign-in |
| `/dashboard` | Staff dashboard |
| `/dashboard/bookings` | Website bookings (virtual + in-person) |
| `/dashboard/patients` | Patients |
| `/dashboard/schedule` | Confirmed appointments |
| `/dashboard/portal` | Existing patient portal |

Legacy `/login`, `/app`, `/portal` redirect into `/dashboard/*`.

### API sketch

- `POST /api/bookings` — public booking (no auth)
- `GET /api/bookings` — staff list
- `POST /api/bookings/:id/confirm|decline`
- `GET/POST /api/patients`
- `GET/POST /api/appointments`
- `GET /api/dashboard/overview`
- `POST /api/auth/login|setup` · `GET /api/auth/me`

### Next steps (not in this pass)

- Match quiz + assessments UI ported from static site
- Billing / invoices UI
- Video visit settings
- Clinical notes detail pages
- Deploy client (Vercel) + API (Railway/Render) with Neon production branch

---

## Legacy v1: MindCare static app

A zero-dependency, single-user practice manager for an individual therapist.
Plain HTML + CSS + JavaScript. No server, no database, no build step, no accounts.
All data is stored in the browser's local storage on your own device.

### Run it

Open `index.html` directly in a browser, or serve the repo root:

```bash
python -m http.server 8742
```

then visit http://localhost:8742 — the public site is `/`, the app is `/dashboard.html`.

> Tip: always use the **same browser on the same machine** — that's where your data lives.

### Features

| Module | What it does |
|---|---|
| Login & roles | Practitioner (super user), Staff, and Patient accounts with salted+hashed passwords. Staff see patients, scheduling, video and billing; clinical entries, health reports, backups and user management are practitioner-only. Patient logins are linked to one patient record and see a portal with only their own visits (join video, copy link) and billing. Sign-out ends the session. |
| Dashboard | Today's appointments, week ahead, outstanding balances |
| Patients | Demographics, emergency contact, insurance, searchable list |
| Clinical entries | Dated symptom + diagnosis + session-note records per patient |
| Schedule | Video and in-person visit scheduler — list view with filters, plus a week-calendar grid with prev/next navigation |
| Session notes | One-click SOAP or DAP templates in every clinical entry |
| Video visits | One-press Zoom launch: save your Zoom Personal Meeting Room link once, then every 🎥 button activates the Zoom meeting instantly (app deep link with browser fallback). Jitsi Meet available as a no-account fallback. |
| Billing & payments | Invoices per service, partial/full payment recording, balance tracking, printable statement/superbill per invoice |
| Health reports | Full per-patient report on screen; **Download PDF** uses the browser's print-to-PDF with a clean print stylesheet |
| Data & backup | One-click JSON export/import, full data wipe |

### Best practices baked in

- **Local-only data** — nothing leaves the device; there is no server to breach.
- **Backups** — export a JSON backup regularly (Data & Backup page); restore replaces all data atomically.
- **Escape-everything rendering** — all user-entered text is HTML-escaped before display.
- **Confirmation on destructive actions** — deletes and wipes require explicit confirmation (wipe requires two).
- **Immutable audit-friendly records** — clinical entries are dated and listed newest-first; reports show the full history.
- **Print-ready reports** — a dedicated print stylesheet strips navigation so the PDF contains only the report.

### Important limitations (read before clinical use)

- **Not a certified EHR** and not HIPAA-compliant out of the box. For real PHI:
  - use full-disk encryption (FileVault/BitLocker) and a password-protected OS account;
  - store exported backups in an encrypted location;
  - for telehealth under HIPAA, use a provider that signs a BAA (Zoom for Healthcare, doxy.me,
    SimplePractice Telehealth). The built-in Zoom integration uses your Personal Meeting Room link —
    pair it with a Zoom for Healthcare account and enable the waiting room so patients can't join early.
- Login is **device-level access control**, not server-grade security: passwords are salted and hashed and the
  UI is role-gated, but a technically skilled person with access to the browser could still reach the stored data.
  It is designed to keep a shared office computer honest, not to repel attackers.
- Local storage is per-browser: clearing browser data erases the app's data. **Back up weekly.**
- Single practitioner, single device by design. If you outgrow it, the JSON export gives you a clean migration path.

### File layout

```
index.html       # public website (route: /)
dashboard.html   # the app — sidebar + views + modals (route: /dashboard)
styles.css       # shared design system + print (PDF) stylesheet
app.js           # shared logic + localStorage persistence
site-catalog.js  # public-site content (services, therapists, etc.)
images/, logo.png
```
