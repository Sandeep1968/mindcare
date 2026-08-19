import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import dashboardRoutes from './routes/dashboard.js';
import billingRoutes from './routes/billing.js';
import videoRoutes from './routes/video.js';
import notificationRoutes from './routes/notifications.js';
import bugRoutes from './routes/bugs.js';
import settingsRoutes from './routes/settings.js';
import portalRoutes from './routes/portal.js';
import clinicalRoutes from './routes/clinical.js';
import messageRoutes from './routes/messages.js';

const app = express();
export const hasDb = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('USER:PASSWORD'));

// The client always calls the API via a relative `/api` path — same-origin in
// production (single Vercel project) and proxied by Vite in local dev/preview —
// so these requests never actually need CORS. This allowlist only matters if
// the API is ever hit from a *different* origin (a separate client deployment,
// a custom domain, or testing straight against the API from a browser).
const devOrigins = ['http://localhost:5173', 'http://localhost:4173'];
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...devOrigins, ...configuredOrigins]);

app.use(cors({
  origin(origin, callback) {
    // No Origin header = same-origin call, curl, server-to-server, etc.
    if (!origin || allowedOrigins.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    const err = new Error(`Not allowed by CORS: ${origin}`);
    err.code = 'CORS_NOT_ALLOWED';
    callback(err);
  },
  credentials: true,
}));
app.use(express.json({ limit: '4mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'MindCare API',
    database: hasDb ? 'configured' : 'missing',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/messages', messageRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.code === 'NO_DATABASE_URL' ? 503 : err.code === 'CORS_NOT_ALLOWED' ? 403 : 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

export default app;
