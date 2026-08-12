# MindCare — Lightweight Solo-Therapist Practice Manager

A zero-dependency, single-user practice manager for an individual therapist.
Plain HTML + CSS + JavaScript. No server, no database, no build step, no accounts.
All data is stored in the browser's local storage on your own device.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8742 -d therapist-practice
```

then visit http://localhost:8742.

> Tip: always use the **same browser on the same machine** — that's where your data lives.

## Features

| Module | What it does |
|---|---|
| Dashboard | Today's appointments, week ahead, outstanding balances |
| Patients | Demographics, emergency contact, insurance, searchable list |
| Clinical entries | Dated symptom + diagnosis + session-note records per patient |
| Schedule | Video and in-person visit scheduler — list view with filters, plus a week-calendar grid with prev/next navigation |
| Session notes | One-click SOAP or DAP templates in every clinical entry |
| Video visits | One-press Zoom launch: save your Zoom Personal Meeting Room link once, then every 🎥 button activates the Zoom meeting instantly (app deep link with browser fallback). Jitsi Meet available as a no-account fallback. |
| Billing & payments | Invoices per service, partial/full payment recording, balance tracking, printable statement/superbill per invoice |
| Health reports | Full per-patient report on screen; **Download PDF** uses the browser's print-to-PDF with a clean print stylesheet |
| Data & backup | One-click JSON export/import, full data wipe |

## Best practices baked in

- **Local-only data** — nothing leaves the device; there is no server to breach.
- **Backups** — export a JSON backup regularly (Data & Backup page); restore replaces all data atomically.
- **Escape-everything rendering** — all user-entered text is HTML-escaped before display.
- **Confirmation on destructive actions** — deletes and wipes require explicit confirmation (wipe requires two).
- **Immutable audit-friendly records** — clinical entries are dated and listed newest-first; reports show the full history.
- **Print-ready reports** — a dedicated print stylesheet strips navigation so the PDF contains only the report.

## Important limitations (read before clinical use)

- **Not a certified EHR** and not HIPAA-compliant out of the box. For real PHI:
  - use full-disk encryption (FileVault/BitLocker) and a password-protected OS account;
  - store exported backups in an encrypted location;
  - for telehealth under HIPAA, use a provider that signs a BAA (Zoom for Healthcare, doxy.me,
    SimplePractice Telehealth). The built-in Zoom integration uses your Personal Meeting Room link —
    pair it with a Zoom for Healthcare account and enable the waiting room so patients can't join early.
- Local storage is per-browser: clearing browser data erases the app's data. **Back up weekly.**
- Single practitioner, single device by design. If you outgrow it, the JSON export gives you a clean migration path.

## File layout

```
therapist-practice/
├── index.html   # layout: left sidebar + views + modals
├── styles.css   # design system + print (PDF) stylesheet
├── app.js       # all logic + localStorage persistence
└── README.md
```
