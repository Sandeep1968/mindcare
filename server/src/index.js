import http from 'node:http';
import app, { hasDb } from './app.js';

const PORT = Number(process.env.PORT) || 4000;
const server = http.createServer(app);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other MindCare API and retry.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`MindCare API listening on http://localhost:${PORT}`);
  if (!hasDb) {
    console.warn('');
    console.warn('ℹ  DEMO MODE (no Neon DB) — sign in at /dashboard/login');
    console.warn('   Admin / Doctor / Help desk / Patient password: mindcare123');
    console.warn('   Or click one-click Enter buttons on the login page.');
    console.warn('');
  }
});
