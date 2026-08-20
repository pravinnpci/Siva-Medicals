require('dotenv').config({ path: ['.env.local', '.env'] });
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const cors = require('cors');

const app = express();
const PORT = process.env.SIVA_PORT || process.env.PORT || 3001;

// ========================================
// 1. DATABASE CONFIGURATION (SUPABASE / POSTGRES)
// ========================================
let pool = null;
try {
  const dbUrl = process.env.SIVA_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres.vdccpnmlnppqdxgdhuok:siva-medicals01@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
  
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000
  });

  pool.on('error', (err) => console.error('Unexpected error on idle DB client:', err.message));

  const initializeSchema = async () => {
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connected successfully. Initializing schema...');

      const initSql = `
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

        CREATE INDEX IF NOT EXISTS idx_contacts_submitted_at ON contact_submissions (submitted_at DESC);

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

        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        ) WITH (OIDS=FALSE);

        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `;

      await pool.query(initSql);

      const defaultSettings = [
        ['company_email', process.env.SIVA_COMPANY_EMAIL || 'sapravin46@gmail.com'],
        ['company_phone', process.env.SIVA_WEBSITE_WHATSAPP_NUMBER || '9952930484'],
        ['company_whatsapp', process.env.SIVA_WEBSITE_WHATSAPP_NUMBER || '9952930484'],
        ['company_gpay', '9097732213'],
        ['company_address', '1/47, Perumal Kovil Street, Madampakkam - Guduvancheri, Kanchipuram Dist - 603 202'],
        ['company_hours', 'Mon - Sun, 8 AM - 10 PM'],
        ['social_facebook', 'https://facebook.com/sivamedicals'],
        ['social_instagram', 'https://instagram.com/sivamedicals'],
        ['social_whatsapp', 'https://wa.me/919952930484'],
        ['social_twitter', 'https://twitter.com/sivamedicals']
      ];

      for (const [key, val] of defaultSettings) {
        await pool.query(
          'INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING;',
          [key, val]
        );
      }

      const adminHash = await bcrypt.hash('admin123', 10);
      const pravinHash = await bcrypt.hash('admin', 10);
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ('admin', 'admin@sivamedicals.com', $1, 'super_admin')
        ON CONFLICT (username) DO NOTHING;
      `, [adminHash]);
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ('pravin', 'sapravin46@gmail.com', $1, 'super_admin')
        ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `, [pravinHash]);

      console.log('Database schema and seeding initialized successfully');
    } catch (err) {
      console.warn('DB initialization error:', err.message);
    }
  };

  initializeSchema();
} catch (err) {
  console.warn('DB configuration error:', err.message);
  pool = null;
}

// ========================================
// 2. HELPER FUNCTIONS
// ========================================
async function getSiteSettings() {
  const defaults = {
    company_email: process.env.SIVA_COMPANY_EMAIL || 'sapravin46@gmail.com',
    company_phone: process.env.SIVA_WEBSITE_WHATSAPP_NUMBER || '9952930484',
    company_whatsapp: process.env.SIVA_WEBSITE_WHATSAPP_NUMBER || '9952930484',
    company_gpay: '9097732213',
    company_address: '1/47, Perumal Kovil Street, Madampakkam - Guduvancheri, Kanchipuram Dist - 603 202',
    company_hours: 'Mon - Sun, 8 AM - 10 PM',
    social_facebook: 'https://facebook.com/sivamedicals',
    social_instagram: 'https://instagram.com/sivamedicals',
    social_whatsapp: 'https://wa.me/919952930484',
    social_twitter: 'https://twitter.com/sivamedicals',
    emailjs_service_id: process.env.SIVA_EMAILJS_SERVICE_ID || 'sivamedical',
    emailjs_template_id: process.env.SIVA_EMAILJS_TEMPLATE_ID || 'template_2fzsb0d',
    emailjs_public_key: process.env.SIVA_EMAILJS_PUBLIC_KEY || 'cWmO8pjToTEkzUc5Z'
  };

  if (!pool) return defaults;
  try {
    const res = await pool.query('SELECT key, value FROM site_settings');
    const dbSettings = {};
    res.rows.forEach(r => { dbSettings[r.key] = r.value; });
    return { ...defaults, ...dbSettings };
  } catch (e) {
    return defaults;
  }
}

// ========================================
// 3. MIDDLEWARES & STORAGE
// ========================================
app.set('trust proxy', 1);

app.use(session({
  store: pool ? new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }) : undefined,
  secret: process.env.SIVA_SESSION_SECRET || 'siva-medicals-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'siva_uploads')
  : (fs.existsSync('/app/uploads') ? '/app/uploads' : path.resolve(process.cwd(), 'uploads'));

if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch(e){}
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch(e){}
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.method !== 'GET') {
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }
  res.redirect('/admin/login');
}

// ========================================
// 4. PUBLIC API ROUTES
// ========================================

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', db: !!pool, timestamp: new Date() });
});

// Contact & Prescription Submission
app.post('/api/contact', upload.single('prescription'), async (req, res) => {
  try {
    const { name, email, phone, subject, message, address, gpay, whatsapp, category } = req.body;
    const prescriptionFile = req.file ? req.file.filename : null;
    const prescriptionPath = prescriptionFile ? `/uploads/${prescriptionFile}` : null;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (pool) {
      await pool.query(`
        INSERT INTO contact_submissions (name, email, phone, subject, message, address, gpay, whatsapp, prescription_path, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [name, email, phone, subject, message, address, gpay, whatsapp, prescriptionPath, category]);

      if (req.file) {
        await pool.query(`
          INSERT INTO file_uploads (filename, original_name, mime_type, size, upload_path)
          VALUES ($1, $2, $3, $4, $5)
        `, [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, prescriptionPath]).catch(() => {});
      }
    }

    const siteSettings = await getSiteSettings();
    const companyEmail = siteSettings.company_email || 'sapravin46@gmail.com';
    const fullPrescriptionUrl = prescriptionPath ? `${req.protocol}://${req.get('host')}${prescriptionPath}` : 'None';

    // Send Lead Notification to Shop Owner via FormSubmit
    try {
      const cleanSubject = `[Siva Medicals] New Request from ${name} (${phone})`;
      const postData = JSON.stringify({
        _subject: cleanSubject,
        Customer_Name: name,
        Customer_Email: email,
        Customer_Phone: phone,
        Category: category ? category.replace(/_/g, ' ') : 'General',
        Address: address,
        Message: message,
        Prescription_File: fullPrescriptionUrl,
        Submitted_At: new Date().toLocaleString()
      });

      const options = {
        hostname: 'formsubmit.co',
        port: 443,
        path: `/ajax/${companyEmail}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Accept': 'application/json',
          'Origin': 'https://sivamedicals.vercel.app',
          'Referer': 'https://sivamedicals.vercel.app/contact.html',
          'User-Agent': 'Mozilla/5.0'
        }
      };

      const fsReq = https.request(options, (fsRes) => {
        let resData = '';
        fsRes.on('data', (chunk) => { resData += chunk; });
        fsRes.on('end', () => {
          console.log(`Owner notification delivered to ${companyEmail}:`, resData);
        });
      });
      fsReq.on('error', (e) => console.warn('FormSubmit note:', e.message));
      fsReq.write(postData);
      fsReq.end();
    } catch (e) {}

    res.json({
      success: true,
      message: 'Request submitted successfully!',
      prescriptionPath: prescriptionPath,
      prescriptionUrl: fullPrescriptionUrl !== 'None' ? fullPrescriptionUrl : null,
      email: { status: 'sent', recipient: companyEmail }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// ========================================
// 5. ADMIN PANEL & BULK DELETION ROUTES
// ========================================

app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!pool) throw new Error('Database pool not initialized');

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = true',
      [username ? username.trim() : '']
    );

    if (result.rows.length === 0) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare((password || '').toString().trim(), (user.password_hash || '').toString().trim());
    if (!isValidPassword) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = (user.role || '').toLowerCase();

    res.redirect('/admin/dashboard');
  } catch (error) {
    res.render('admin/login', { error: 'An error occurred during login' });
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/dashboard', requireAuth, async (req, res) => {
  try {
    let stats = { totalContacts: 0, totalFiles: 0, totalMessages: 0 };
    if (pool) {
      const [contactsRes, filesRes] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM contact_submissions').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM file_uploads').catch(() => ({ rows: [{ count: 0 }] }))
      ]);
      stats = {
        totalContacts: contactsRes.rows[0].count,
        totalFiles: filesRes.rows[0].count,
        totalMessages: contactsRes.rows[0].count
      };
    }
    res.render('admin/dashboard', { stats, user: req.session, dbAvailable: !!pool });
  } catch (error) {
    res.render('admin/dashboard', { stats: { totalContacts: 0, totalFiles: 0, totalMessages: 0 }, user: req.session, dbAvailable: false });
  }
});

app.get('/admin/contacts', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_submissions ORDER BY submitted_at DESC');
    res.render('admin/contacts', { contacts: result.rows, user: req.session });
  } catch (error) {
    res.render('admin/contacts', { contacts: [], user: req.session, error: error.message });
  }
});

// Update single contact status
app.post('/admin/contacts/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const contactId = req.params.id;
    if (!pool) return res.status(503).json({ success: false, error: 'DB Offline' });

    await pool.query('UPDATE contact_submissions SET status = $1, read_by = $2 WHERE id = $3', [status, req.session.username || 'admin', contactId]);
    res.json({ success: true, message: 'Status updated' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Single contact deletion
app.delete('/admin/contacts/:id', requireAuth, async (req, res) => {
  try {
    const contactId = req.params.id;
    if (!pool) return res.status(503).json({ success: false, error: 'Database offline' });

    const fileRes = await pool.query('SELECT prescription_path FROM contact_submissions WHERE id = $1', [contactId]);
    if (fileRes.rows.length > 0 && fileRes.rows[0].prescription_path) {
      const fileName = path.basename(fileRes.rows[0].prescription_path);
      const diskPath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); console.log(`Deleted prescription: ${diskPath}`); } catch(e){}
      }
    }

    await pool.query('DELETE FROM contact_submissions WHERE id = $1', [contactId]);
    res.json({ success: true, message: 'Submission and file deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk Delete Contacts
app.post('/admin/contacts/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No contact IDs provided' });
    }

    if (!pool) return res.status(503).json({ success: false, error: 'Database offline' });

    const filesRes = await pool.query('SELECT prescription_path FROM contact_submissions WHERE id = ANY($1::int[])', [ids]);
    filesRes.rows.forEach(r => {
      if (r.prescription_path) {
        const fname = path.basename(r.prescription_path);
        const diskPath = path.join(UPLOADS_DIR, fname);
        if (fs.existsSync(diskPath)) {
          try { fs.unlinkSync(diskPath); } catch(e){}
        }
      }
    });

    await pool.query('DELETE FROM contact_submissions WHERE id = ANY($1::int[])', [ids]);
    res.json({ success: true, message: `Successfully deleted ${ids.length} submission(s).` });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Files List (Scans Supabase DB + Disk)
app.get('/admin/files', requireAuth, async (req, res) => {
  try {
    let allFiles = [];
    const seenFiles = new Set();

    // 1. Fetch all uploaded prescriptions from Supabase DB
    if (pool) {
      const dbFilesRes = await pool.query(`
        SELECT id, filename, original_name, size, uploaded_at, upload_path 
        FROM file_uploads 
        ORDER BY uploaded_at DESC
      `).catch(() => ({ rows: [] }));

      dbFilesRes.rows.forEach(r => {
        seenFiles.add(r.filename);
        allFiles.push({
          id: r.id,
          filename: r.filename,
          original_name: r.original_name || r.filename,
          size: r.size || 0,
          uploaded_at: r.uploaded_at
        });
      });

      // Also get any prescriptions from contact submissions
      const contactPrescriptions = await pool.query(`
        SELECT id, prescription_path, name, submitted_at 
        FROM contact_submissions 
        WHERE prescription_path IS NOT NULL AND prescription_path != ''
        ORDER BY submitted_at DESC
      `).catch(() => ({ rows: [] }));

      contactPrescriptions.rows.forEach(c => {
        const fname = path.basename(c.prescription_path);
        if (!seenFiles.has(fname)) {
          seenFiles.add(fname);
          allFiles.push({
            id: c.id,
            filename: fname,
            original_name: `Prescription - ${c.name}`,
            size: 150 * 1024,
            uploaded_at: c.submitted_at
          });
        }
      });
    }

    // 2. Also scan disk folder if exists
    if (fs.existsSync(UPLOADS_DIR)) {
      const diskFiles = fs.readdirSync(UPLOADS_DIR);
      diskFiles.forEach(f => {
        if (!f.startsWith('.') && !seenFiles.has(f)) {
          const fullP = path.join(UPLOADS_DIR, f);
          try {
            const stat = fs.statSync(fullP);
            if (stat.isFile()) {
              seenFiles.add(f);
              allFiles.push({
                filename: f,
                original_name: f.replace(/^prescription-\d+-/, 'Prescription_'),
                size: stat.size,
                uploaded_at: stat.mtime
              });
            }
          } catch(e){}
        }
      });
    }

    allFiles.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    res.render('admin/files', { files: allFiles, user: req.session });
  } catch (error) {
    res.render('admin/files', { files: [], user: req.session, error: error.message });
  }
});

// Single file deletion
app.post('/admin/files/delete-by-name', requireAuth, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ success: false, error: 'Filename required' });

    const safeName = path.basename(filename);
    const diskPath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
        console.log(`Deleted file from disk: ${diskPath}`);
      } catch (err) {}
    }

    if (pool) {
      await pool.query('DELETE FROM file_uploads WHERE filename = $1', [safeName]).catch(() => {});
      await pool.query('UPDATE contact_submissions SET prescription_path = NULL WHERE prescription_path LIKE $1', [`%${safeName}%`]).catch(() => {});
    }

    res.json({ success: true, message: 'File permanently deleted from storage and database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk Delete Files
app.post('/admin/files/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { filenames } = req.body;
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ success: false, error: 'No filenames provided' });
    }

    filenames.forEach(fn => {
      const safeName = path.basename(fn);
      const diskPath = path.join(UPLOADS_DIR, safeName);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch (e) {}
      }
    });

    if (pool) {
      await pool.query('DELETE FROM file_uploads WHERE filename = ANY($1::varchar[])', [filenames]).catch(() => {});
      for (const fn of filenames) {
        const safeName = path.basename(fn);
        await pool.query('UPDATE contact_submissions SET prescription_path = NULL WHERE prescription_path LIKE $1', [`%${safeName}%`]).catch(() => {});
      }
    }

    res.json({ success: true, message: `Successfully deleted ${filenames.length} file(s).` });
  } catch (error) {
    console.error('Bulk delete files error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Site Settings (General + Social Media)
app.get('/admin/settings', requireAuth, async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.render('admin/settings', { settings, user: req.session, success: req.query.success, error: req.query.error });
  } catch (error) {
    res.render('admin/settings', { settings: {}, user: req.session, error: error.message });
  }
});

app.post('/admin/settings', requireAuth, async (req, res) => {
  try {
    const { 
      company_email, 
      company_phone, 
      company_whatsapp, 
      company_gpay, 
      company_address, 
      company_hours,
      social_facebook,
      social_instagram,
      social_whatsapp,
      social_twitter
    } = req.body;

    if (pool) {
      const updates = [
        ['company_email', company_email],
        ['company_phone', company_phone],
        ['company_whatsapp', company_whatsapp],
        ['company_gpay', company_gpay],
        ['company_address', company_address],
        ['company_hours', company_hours],
        ['social_facebook', social_facebook],
        ['social_instagram', social_instagram],
        ['social_whatsapp', social_whatsapp],
        ['social_twitter', social_twitter]
      ];
      for (const [k, v] of updates) {
        if (v !== undefined) {
          await pool.query(`
            INSERT INTO site_settings (key, value, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
          `, [k, v]);
        }
      }
    }
    res.redirect('/admin/settings?success=Settings+updated+successfully!');
  } catch (error) {
    res.redirect('/admin/settings?error=' + encodeURIComponent(error.message));
  }
});

app.get('/admin/users', requireAuth, async (req, res) => {
  if (req.session.role !== 'super_admin') {
    return res.status(403).send('Forbidden: Super Admin access required');
  }
  try {
    const result = await pool.query('SELECT id, username, email, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
    res.render('admin/users', { users: result.rows, user: req.session });
  } catch (error) {
    res.render('admin/users', { users: [], user: req.session, error: error.message });
  }
});

// Start Server locally if not running as serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Siva Medicals Backend Server running on port ${PORT}`);
  });
}

module.exports = app;