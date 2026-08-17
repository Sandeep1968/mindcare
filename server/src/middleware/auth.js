import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email, patientId: user.patient_id || null },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireStaff(req, res, next) {
  const role = req.user?.role;
  if (!role || role === 'patient') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

export function requirePractitioner(req, res, next) {
  if (req.user?.role !== 'practitioner' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Practitioner access required' });
  }
  next();
}
