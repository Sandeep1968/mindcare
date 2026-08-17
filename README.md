# MindCare — React + Express + Neon Postgres

Full-stack rebuild of MindCare:
- **Client:** React (Vite) + Tailwind CSS v4
- **Server:** Node.js + Express
- **Database:** PostgreSQL on [Neon](https://neon.tech)

The older static prototype remains in `mindcare/` for reference.

## Prerequisites

- Node.js 20+
- A Neon project (free tier is fine)

## 1. Neon setup

1. Create a project at https://console.neon.tech
2. Copy the **connection string** (URI), e.g.  
   `postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. In this repo:

```bash
cd server
copy .env.example .env
```

Paste your URI into `DATABASE_URL` and set a strong `JWT_SECRET`.

## 2. Install & migrate

From the repo root (`TherapyMS`):

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

## 3. Run locally

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

## App routes

### Public website (no login)
| URL | Purpose |
|---|---|
| `/` | Public clinic site |
| `/book` | Book / find support |
| `/groups`, `/therapy`, `/assessments`, … | Marketing pages |

### Separate workspace (admin, staff/doctors, existing patients)
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

## API sketch

- `POST /api/bookings` — public booking (no auth)
- `GET /api/bookings` — staff list
- `POST /api/bookings/:id/confirm|decline`
- `GET/POST /api/patients`
- `GET/POST /api/appointments`
- `GET /api/dashboard/overview`
- `POST /api/auth/login|setup` · `GET /api/auth/me`

## Project layout

```
TherapyMS/
  client/          React + Tailwind
  server/          Express + Neon
  mindcare/        Previous static HTML prototype
  docs/            Product architecture docs
```

## Next steps (not in this pass)

- Match quiz + assessments UI ported from static site
- Billing / invoices UI
- Video visit settings
- Clinical notes detail pages
- Deploy client (Vercel) + API (Railway/Render) with Neon production branch
