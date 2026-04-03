require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection with fallback
let pool;
try {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'siva_medicals',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  });

  // Test connection
  pool.query('SELECT NOW()').then(() => {
    console.log('✅ Database connected successfully');
  }).catch(err => {
    console.warn('⚠️  Database connection failed:', err.message);
    console.warn('Running in offline mode - some features disabled');
    pool = null;
  });
} catch (error) {
  console.warn('⚠️  Database configuration error:', error.message);
  console.warn('Running in offline mode - some features disabled');
  pool = null;
}

// Twilio setup for WhatsApp (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio client initialized');
  } catch (error) {
    console.warn('⚠️  Twilio initialization failed:', error.message);
    console.warn('WhatsApp features will be disabled');
  }
} else {
  console.warn('⚠️  Twilio credentials not found - WhatsApp features disabled');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'siva-medicals-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/admin/login');
}

// Routes

// Admin login page
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    // Enforce admin role access
    const normalizedRole = (user.role || '').toLowerCase();
    if (!['admin', 'super_admin'].includes(normalizedRole)) {
      return res.render('admin/login', { error: 'No admin privileges' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    user.role = normalizedRole;

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('admin/login', { error: 'An error occurred' });
  }
});

// Admin logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
});

// Admin dashboard
app.get('/admin/dashboard', requireAuth, async (req, res) => {
  try {
    let stats = { totalContacts: 0, totalFiles: 0, totalMessages: 0 };

    if (pool) {
      const [contactsResult, filesResult, whatsappResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM contact_submissions').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM file_uploads').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(*) as count FROM whatsapp_messages WHERE direction = $1', ['inbound']).catch(() => ({ rows: [{ count: 0 }] }))
      ]);

      stats = {
        totalContacts: contactsResult.rows[0].count,
        totalFiles: filesResult.rows[0].count,
        totalMessages: whatsappResult.rows[0].count
      };
    }

    res.render('admin/dashboard', { stats, user: req.session, dbAvailable: !!pool });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      stats: { totalContacts: 0, totalFiles: 0, totalMessages: 0 },
      user: req.session,
      dbAvailable: false,
      error: 'Database not available'
    });
  }
});

// Contact submissions
app.get('/admin/contacts', requireAuth, async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE contact_submissions
      ADD COLUMN IF NOT EXISTS prescription_path VARCHAR(500)
    `);

    const result = await pool.query(`
      SELECT * FROM contact_submissions
      ORDER BY submitted_at DESC
    `);
    res.render('admin/contacts', { contacts: result.rows, user: req.session });
  } catch (error) {
    console.error('Contacts error:', error);
    res.status(500).send('Error loading contacts');
  }
});

// Update contact status
app.post('/admin/contacts/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(
      'UPDATE contact_submissions SET status = $1 WHERE id = $2',
      [status, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// File uploads management
app.get('/admin/files', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, u.username
      FROM file_uploads f
      LEFT JOIN users u ON f.uploaded_by = u.id
      ORDER BY uploaded_at DESC
    `);
    res.render('admin/files', { files: result.rows, user: req.session });
  } catch (error) {
    console.error('Files error:', error);
    res.status(500).send('Error loading files');
  }
});

// File upload endpoint
app.post('/admin/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    await pool.query(`
      INSERT INTO file_uploads (filename, original_name, mime_type, size, upload_path, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.path,
      req.session.userId
    ]);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// WhatsApp messages
app.get('/admin/whatsapp', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM whatsapp_messages
      ORDER BY received_at DESC
    `);
    res.render('admin/whatsapp', { messages: result.rows, user: req.session });
  } catch (error) {
    console.error('WhatsApp error:', error);
    res.status(500).send('Error loading messages');
  }
});

// Twilio WhatsApp webhook
app.post('/webhook/whatsapp', (req, res) => {
  if (!twilioClient) {
    return res.status(503).send('WhatsApp service not configured');
  }

  const { From, To, Body, MessageSid } = req.body;

  // Save incoming message
  pool.query(`
    INSERT INTO whatsapp_messages (from_number, to_number, message_body, twilio_sid)
    VALUES ($1, $2, $3, $4)
  `, [From, To, Body, MessageSid])
  .then(() => {
    console.log('WhatsApp message saved:', { From, Body });
    res.status(200).send('OK');
  })
  .catch(error => {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error');
  });
});

// Contact form submission (from frontend) with file upload support
app.post('/api/contact', upload.single('prescription'), async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { name, email, phone, subject, message, address, gpay, whatsapp } = req.body;
    const prescriptionFile = req.file ? req.file.filename : null;
    const prescriptionPath = prescriptionFile ? `/uploads/${prescriptionFile}` : null;

    // Ensure required fields
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create optional prescription_path column if missing
    await pool.query(`
      ALTER TABLE contact_submissions
      ADD COLUMN IF NOT EXISTS prescription_path VARCHAR(500)
    `);

    await pool.query(`
      INSERT INTO contact_submissions (name, email, phone, subject, message, address, gpay, whatsapp, prescription_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [name, email, phone, subject, message, address, gpay, whatsapp, prescriptionPath]);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// User management (for super admin)
app.get('/admin/users', requireAuth, async (req, res) => {
  if (req.session.role !== 'super_admin') {
    return res.status(403).send('Access denied');
  }

  try {
    const result = await pool.query('SELECT id, username, email, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC');
    res.render('admin/users', { users: result.rows, user: req.session });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).send('Error loading users');
  }
});

// Create new user
app.post('/admin/users', requireAuth, async (req, res) => {
  if (req.session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { username, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
    `, [username, email, hashedPassword, role]);

    res.json({ success: true });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete user (super_admin only)
app.delete('/admin/users/:id', requireAuth, async (req, res) => {
  try {
    if (req.session.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    // Prevent deletion of currently logged-in user
    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete current logged-in user' });
    }

    // Prevent deleting default admin user
    const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (rows[0].username === 'admin') {
      return res.status(403).json({ error: 'Cannot delete default admin user' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete file
app.delete('/admin/files/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get file info
    const result = await pool.query('SELECT * FROM file_uploads WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Delete from filesystem
    if (fs.existsSync(file.upload_path)) {
      fs.unlinkSync(file.upload_path);
    }

    // Delete from database
    await pool.query('DELETE FROM file_uploads WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Siva Medicals Admin Server running on port ${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin/login`);
});