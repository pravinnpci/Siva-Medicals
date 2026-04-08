require('dotenv').config({ path: ['.env.local', '.env'] }); // Prioritize .env.local for local overrides
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
  const connectionConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'siva_medicals',
        password: process.env.DB_PASSWORD || 'admin',
        port: process.env.DB_PORT || 5432,
      };

  pool = new Pool(connectionConfig);

  // Test connection
  pool.query('SELECT NOW()').then(async () => {
    console.log('✅ Database connected successfully. Initializing schema...');
    
    const initSql = `
      BEGIN;
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

      CREATE INDEX IF NOT EXISTS "idx_contacts_submitted_at" ON contact_submissions (submitted_at DESC);

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
      COMMIT;
    `;

    await pool.query(initSql);
    
    // Programmatic Seeding to ensure Bcrypt compatibility
    const admin123Hash = await bcrypt.hash('admin123', 10);
    const pravinAdminHash = await bcrypt.hash('admin', 10);

    const seedSql = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, email = EXCLUDED.email, role = EXCLUDED.role, is_active = true, updated_at = CURRENT_TIMESTAMP;
    `;

    await pool.query(seedSql, ['admin', 'admin@sivamedicals.com', admin123Hash, 'super_admin']);
    await pool.query(seedSql, ['pravin', 'sapravin46@gmail.com', pravinAdminHash, 'super_admin']);

    // Diagnostic: Self-test hash verification
    const adminTest = await bcrypt.compare('admin123', admin123Hash);
    const pravinTest = await bcrypt.compare('admin', pravinAdminHash);
    console.log(`🧪 Hash Self-Test: admin123(${adminTest}), admin(${pravinTest})`);

  }).then(() => {
    console.log('✅ Database schema initialized successfully');
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
    // Verify from number format
    const fromNum = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER;
    if (fromNum && !fromNum.startsWith('whatsapp:')) {
        console.log('ℹ️ Adding "whatsapp:" prefix to Twilio sender number');
    }
    console.log('✅ Twilio client initialized');
    console.log('📱 Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...');
    console.log('📱 WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_FROM);
  } catch (error) {
    console.warn('⚠️  Twilio initialization failed:', error.message);
    console.warn('WhatsApp features will be disabled');
  }
} else {
  console.warn('⚠️  Twilio credentials not found');
  console.warn('   - TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Found' : 'Missing');
  console.warn('   - TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Found' : 'Missing');
  console.warn('   - TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER ? 'Found' : 'Missing');
  console.warn('WhatsApp features will be disabled');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: pool ? new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }) : undefined,
  secret: process.env.SESSION_SECRET || 'siva-medicals-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
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

function formatWhatsAppNumber(rawNumber) {
  if (!rawNumber) return null;

  let cleaned = rawNumber.toString().trim();
  cleaned = cleaned.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    return `whatsapp:${cleaned}`;
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  if (cleaned.length === 10) {
    return `whatsapp:+91${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `whatsapp:+${cleaned}`;
  }

  return `whatsapp:+${cleaned}`;
}

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

    console.log(`🔐 Login attempt for username: ${username}`);

    if (!pool) {
      return res.render('admin/login', { error: 'Database connection not available' });
    }

    // Use LOWER() for case-insensitive username lookup
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = true',
      [username ? username.trim() : '']
    );

    if (result.rows.length === 0) {
      console.log(`👤 User not found: ${username}`);
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const inputPassword = (password || '').toString().trim();
    const dbHash = (user.password_hash || '').toString().trim();
    
    const isValidPassword = await bcrypt.compare(inputPassword, dbHash);

    if (!isValidPassword) {
      console.log(`❌ Password mismatch for: ${username}. Input len: ${inputPassword.length}, Hash len: ${dbHash.length}`);
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
    const readBy = status === 'unread' ? null : req.session.username || null;

    await pool.query(
      'UPDATE contact_submissions SET status = $1, read_by = $2 WHERE id = $3',
      [status, readBy, id]
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

// Test Twilio WhatsApp connection (diagnostic endpoint)
app.get('/api/twilio-test', (req, res) => {
  const result = {
    twilioClientReady: !!twilioClient,
    accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Missing',
    authToken: process.env.TWILIO_AUTH_TOKEN ? 'Configured' : 'Missing',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_FROM || 'Missing',
    status: !twilioClient ? 'Not Ready - Check .env file' : 'Ready to Send'
  };
  res.json(result);
});

// Database and System Health Check endpoint
app.get('/api/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    database: {
      status: 'unknown',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432
    }
  };

  if (!pool) {
    healthcheck.database.status = 'unconfigured/disconnected';
    healthcheck.message = 'Database pool not initialized';
    return res.status(503).json(healthcheck);
  }

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    healthcheck.database.status = 'connected';
    healthcheck.database.latency = `${Date.now() - start}ms`;
    res.json(healthcheck);
  } catch (err) {
    healthcheck.database.status = 'error';
    healthcheck.database.error = err.message;
    res.status(500).json(healthcheck);
  }
});

// Contact form submission (from frontend) with file upload support
app.post('/api/contact', upload.single('prescription'), async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { name, email, phone, subject, message, address, gpay, whatsapp, category } = req.body;
    
    // File is optional - only set path if file was uploaded
    const prescriptionFile = req.file ? req.file.filename : null;
    const prescriptionPath = prescriptionFile ? `/uploads/${prescriptionFile}` : null;

    // Ensure required fields
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await pool.query(`
      INSERT INTO contact_submissions (name, email, phone, subject, message, address, gpay, whatsapp, prescription_path, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [name, email, phone, subject, message, address, gpay, whatsapp, prescriptionPath, category]);

    let twilioStatus = 'not_sent';
    let twilioError = null;
    let twilioOwnerStatus = 'not_sent';
    let twilioCustomerStatus = 'not_sent';
    let twilioOwnerError = null;
    let twilioCustomerError = null;

    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER;
    const websiteWhatsappNumber = process.env.WEBSITE_WHATSAPP_NUMBER || whatsapp || '9245464648';
    const ownerRecipient = formatWhatsAppNumber(websiteWhatsappNumber);

    console.log('\n🔍 WhatsApp Send Debug:');
    console.log('   Twilio Client Ready:', !!twilioClient);
    console.log('   WhatsApp From Number:', whatsappFrom);
    console.log('   Website Owner WhatsApp Number:', websiteWhatsappNumber);
    console.log('   Owner Recipient:', ownerRecipient);
    console.log('   Customer Phone:', phone);
    
    if (twilioClient && whatsappFrom) {
      try {
        const customerRecipient = formatWhatsAppNumber(phone);
        console.log('   Formatted Customer Recipient:', customerRecipient);

        if (!customerRecipient) {
          throw new Error('Failed to format customer phone number: ' + phone);
        }
        if (!ownerRecipient) {
          throw new Error('Failed to format website owner phone number: ' + websiteWhatsappNumber);
        }

        const customerBody = `Hello ${name}, this is Siva Medicals. We have received your ${category.replace(/_/g, ' ')} request and will respond shortly. Reply to this message if you need immediate help.`;
        const ownerBody = `Siva Medicals - New website contact request:\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nCategory: ${category.replace(/_/g, ' ')}\nAddress: ${address}\nMessage: ${message}\nPrescription: ${prescriptionPath ? 'Yes' : 'No'}${prescriptionPath ? `\nPrescription Link: ${req.protocol}://${req.get('host')}${prescriptionPath}` : ''}`;

        console.log('   Sending owner WhatsApp notification...');
        const ownerMessage = await twilioClient.messages.create({
          from: `whatsapp:${whatsappFrom.replace(/^whatsapp:/, '')}`,
          to: ownerRecipient,
          body: ownerBody
        });
        twilioOwnerStatus = 'sent';
        console.log('✅ Owner WhatsApp notification sent:', ownerMessage.sid);
      } catch (error) {
        twilioOwnerStatus = 'failed';
        twilioOwnerError = error.message;
        console.error('❌ Owner WhatsApp notification failed:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Status:', error.status);
      }

      try {
        const customerRecipient = formatWhatsAppNumber(phone);
        const customerBody = `Hello ${name}, thank you for contacting Siva Medicals. We have received your ${category.replace(/_/g, ' ')} request and will respond shortly. Reply to this message if you need immediate help.`;

        console.log('   Sending customer WhatsApp confirmation...');
        const customerMessage = await twilioClient.messages.create({
          from: `whatsapp:${whatsappFrom.replace(/^whatsapp:/, '')}`,
          to: customerRecipient,
          body: customerBody
        });
        twilioCustomerStatus = 'sent';
        console.log('✅ Customer WhatsApp confirmation sent:', customerMessage.sid);
      } catch (error) {
        twilioCustomerStatus = 'failed';
        twilioCustomerError = error.message;
        console.error('❌ Customer WhatsApp confirmation failed:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Status:', error.status);
      }

      if (twilioOwnerStatus === 'sent' || twilioCustomerStatus === 'sent') {
        twilioStatus = 'sent';
      } else {
        twilioStatus = 'failed';
        twilioError = twilioOwnerError || twilioCustomerError;
      }
    } else {
      console.warn('⚠️  WhatsApp sending skipped - Client or number not configured');
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      whatsapp: {
        enabled: !!twilioClient && !!whatsappFrom,
        status: twilioStatus,
        ownerStatus: twilioOwnerStatus,
        customerStatus: twilioCustomerStatus,
        ownerError: twilioOwnerError,
        customerError: twilioCustomerError
      }
    });
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Siva Medicals Admin Server running on port ${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin/login`);
  });
}

module.exports = app;