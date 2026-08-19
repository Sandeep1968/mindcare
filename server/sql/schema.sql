-- MindCare schema for Neon Postgres

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'practitioner', 'staff', 'patient');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- If enum already existed without admin, add it
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_type AS ENUM ('video', 'in-person');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('new', 'confirmed', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  password_hash TEXT NOT NULL,
  patient_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  dob DATE,
  insurance TEXT,
  emergency TEXT,
  notes TEXT DEFAULT '',
  payer_type TEXT DEFAULT 'self-pay',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_type TEXT DEFAULT 'Individual Therapy';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS therapist TEXT DEFAULT 'Dr. Sarah Williams';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS visit_pref TEXT DEFAULT 'Virtual';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'Weekly';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_concern TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_comm TEXT DEFAULT 'Email';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS client_code TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_phone TEXT DEFAULT '';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_patient_id_fkey;
ALTER TABLE users
  ADD CONSTRAINT users_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS clinical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  symptoms TEXT,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appt_date DATE NOT NULL,
  appt_time TIME NOT NULL,
  duration_min INT NOT NULL DEFAULT 50,
  session_type session_type NOT NULL DEFAULT 'video',
  reason TEXT,
  location TEXT DEFAULT '',
  video_link TEXT DEFAULT '',
  video_host_link TEXT DEFAULT '',
  checked_in BOOLEAN NOT NULL DEFAULT false,
  from_request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  payer_type TEXT DEFAULT 'self-pay',
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  service TEXT,
  session_type session_type NOT NULL DEFAULT 'video',
  session_pref TEXT DEFAULT 'video',
  notes TEXT DEFAULT '',
  match_audience TEXT DEFAULT 'individual',
  therapist_pref TEXT DEFAULT 'any',
  sliding_scale BOOLEAN NOT NULL DEFAULT false,
  preferred_therapist TEXT DEFAULT '',
  match_completed BOOLEAN NOT NULL DEFAULT false,
  crisis TEXT DEFAULT 'no',
  match_json JSONB,
  assessment_json JSONB,
  status request_status NOT NULL DEFAULT 'new',
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL
);

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_from_request_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_from_request_id_fkey
  FOREIGN KEY (from_request_id) REFERENCES appointment_requests(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'Card'
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cpt_code TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

CREATE TABLE IF NOT EXISTS clinic_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  clinic_name TEXT NOT NULL DEFAULT 'MindCare Practice',
  video_provider TEXT NOT NULL DEFAULT 'zoom',
  zoom_link TEXT DEFAULT '',
  zoom_host_email TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS waiting_message TEXT DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS zoom_host_email TEXT DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_host_link TEXT DEFAULT '';

INSERT INTO clinic_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

UPDATE clinic_settings SET video_provider = 'zoom' WHERE id = 1 AND video_provider = 'jitsi';

CREATE INDEX IF NOT EXISTS idx_appts_date ON appointments(appt_date);
CREATE INDEX IF NOT EXISTS idx_requests_status ON appointment_requests(status);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);

CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reporter_name TEXT DEFAULT '',
  reporter_email TEXT DEFAULT '',
  reporter_role TEXT DEFAULT '',
  page_name TEXT NOT NULL,
  page_route TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected TEXT DEFAULT '',
  steps TEXT DEFAULT '',
  severity TEXT DEFAULT 'major',
  frequency TEXT DEFAULT 'always',
  browser TEXT DEFAULT '',
  viewport TEXT DEFAULT '',
  screenshot_name TEXT DEFAULT '',
  screenshot_data TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC);

ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'DAP';

CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  goal TEXT NOT NULL DEFAULT '',
  focus TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  review_date DATE,
  goals_json TEXT DEFAULT '[]',
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS patient_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  form_key TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending',
  form_date DATE NOT NULL DEFAULT CURRENT_DATE,
  signed_name TEXT DEFAULT '',
  signed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current',
  start_date DATE,
  end_date DATE,
  provider TEXT DEFAULT '',
  updated_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS assigned_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at DATE,
  assigned_by TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author TEXT DEFAULT '',
  note_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS portal_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'invite',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  channel TEXT NOT NULL DEFAULT 'portal',
  priority TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'unread',
  assigned_to TEXT DEFAULT '',
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'portal',
  author TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
