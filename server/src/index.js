import app, { hasDb } from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`MindCare API listening on http://localhost:${PORT}`);
  if (!hasDb) {
    console.warn('');
    console.warn('ℹ  DEMO MODE (no Neon DB) — sign in at /dashboard/login');
    console.warn('   Admin / Doctor / Help desk / Patient password: mindcare123');
    console.warn('   Or click one-click Enter buttons on the login page.');
    console.warn('');
  }
});
