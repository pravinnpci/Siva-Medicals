-- =========================================================
-- SIVA MEDICALS - SUPABASE POSTGRESQL SCHEMA
-- =========================================================

-- 1. Users Table (Admin Authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Contact Submissions Table (Customer Inquiries, Orders, Prescriptions)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  address TEXT,
  gpay VARCHAR(50),
  whatsapp VARCHAR(20),
  prescription_path VARCHAR(500),
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'unread',
  read_by VARCHAR(100),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_contacts_submitted_at" ON contact_submissions (submitted_at DESC);

-- 3. File Uploads Table
CREATE TABLE IF NOT EXISTS file_uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  upload_path VARCHAR(500) NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. WhatsApp Messages Table (Twilio Webhook Logs)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  direction VARCHAR(10) DEFAULT 'inbound',
  status VARCHAR(20) DEFAULT 'received',
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  twilio_sid VARCHAR(50)
);

-- 5. Site Settings Table (Dynamic Contact Info)
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Insert Default Site Settings
INSERT INTO site_settings (key, value)
VALUES 
  ('company_email', 'sapravin46@gmail.com'),
  ('company_phone', '9952930484'),
  ('company_whatsapp', '9952930484'),
  ('company_gpay', '9097732213'),
  ('company_address', '1/47, Perumal Kovil Street, Madampakkam - Guduvancheri, Kanchipuram Dist - 603 202'),
  ('company_hours', 'Mon - Sun, 8 AM - 10 PM')
ON CONFLICT (key) DO NOTHING;

-- 7. Insert Default Admin User (admin / admin123 and pravin / admin)
INSERT INTO users (username, email, password_hash, role)
VALUES 
  ('admin', 'admin@sivamedicals.com', '.07B3q7p5N6C8d0y5z8F9a0B1c2D3e4F', 'super_admin'),
  ('pravin', 'sapravin46@gmail.com', '/Uf.fS4gR3vO8gq.f8yJ1a5K8b2L9c0M1d2E3F4G5H6I7J', 'super_admin')
ON CONFLICT (username) DO NOTHING;