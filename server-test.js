require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for testing (when PostgreSQL is not available)
let contacts = [];
let files = [];
let users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@sivamedicals.com',
    password_hash: '$2a$10$hashedpassword', // 'admin123'
    role: 'super_admin',
    created_at: new Date(),
    last_login: null,
    is_active: true
  }
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple session configuration (in-memory for testing)
app.use(session({
  secret: process.env.SESSION_SECRET || 'siva-medicals-test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
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

const upload = multer({ storage: storage });

// Hash default password on startup
(async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  users[0].password_hash = hashedPassword;
})();

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
    const user = users.find(u => u.username === username && u.is_active);

    if (!user) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.render('admin/login', { error: 'Invalid credentials' });
    }

    user.last_login = new Date();
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
    if (err) console.error('Logout error:', err);
    res.redirect('/admin/login');
  });
});

// Admin dashboard
app.get('/admin/dashboard', requireAuth, (req, res) => {
  const stats = {
    totalContacts: contacts.length,
    totalFiles: files.length,
    totalMessages: 0 // WhatsApp not available in test mode
  };

  res.render('admin/dashboard', {
    stats,
    user: req.session,
    dbAvailable: false,
    testMode: true
  });
});

// Contact submissions
app.get('/admin/contacts', requireAuth, (req, res) => {
  res.render('admin/contacts', { contacts, user: req.session });
});

// File uploads management
app.get('/admin/files', requireAuth, (req, res) => {
  res.render('admin/files', { files, user: req.session });
});

// File upload endpoint
app.post('/admin/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileData = {
      id: Date.now(),
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
      upload_path: req.file.path,
      uploaded_by: req.session.userId,
      uploaded_at: new Date()
    };

    files.push(fileData);

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

// WhatsApp messages (disabled in test mode)
app.get('/admin/whatsapp', requireAuth, (req, res) => {
  res.render('admin/whatsapp', { messages: [], user: req.session });
});

// Contact form submission
app.post('/api/contact', upload.single('prescription'), (req, res) => {
  try {
    const contactData = {
      id: Date.now(),
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      subject: req.body.subject || 'Contact Form',
      message: req.body.message,
      address: req.body.address,
      gpay: req.body.gpay,
      whatsapp: req.body.whatsapp,
      submitted_at: new Date(),
      status: 'unread',
      prescription: req.file ? {
        filename: req.file.filename,
        original_name: req.file.originalname,
        path: req.file.path
      } : null
    };

    contacts.push(contactData);

    console.log('📝 New contact form submission:', {
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete file
app.delete('/admin/files/:id', requireAuth, (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const fileIndex = files.findIndex(f => f.id === fileId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[fileIndex];

    // Delete from filesystem
    if (fs.existsSync(file.upload_path)) {
      fs.unlinkSync(file.upload_path);
    }

    // Remove from array
    files.splice(fileIndex, 1);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Siva Medicals Admin Server (TEST MODE)');
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin/login`);
  console.log('👤 Default credentials: admin / admin123');
  console.log('⚠️  Running without database - data will not persist');
  console.log('📖 Setup PostgreSQL for full functionality');
});