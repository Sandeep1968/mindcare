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

const app = express();
export const hasDb = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('USER:PASSWORD'));

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
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

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.code === 'NO_DATABASE_URL' ? 503 : 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

export default app;
