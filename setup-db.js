require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'siva_medicals',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
  try {
    console.log('🔄 Connecting to database...');

    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    console.log('🏗️  Creating tables...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create contact_submissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        address TEXT,
        gpay VARCHAR(20),
        whatsapp VARCHAR(20),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'unread'
      )
    `);

    // Create file_uploads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        upload_path VARCHAR(500) NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create whatsapp_messages table
    await pool.query(`
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
      )
    `);

    // Create sessions table for session storage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      ) WITH (OIDS=FALSE);

      ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);
    `);

    // Insert default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin@123', 10);

    await pool.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@sivamedicals.com', $1, 'super_admin')
      ON CONFLICT (username) DO NOTHING
    `, [hashedPassword]);

    console.log('Database setup completed successfully!');
    console.log('Default admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin@123');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure PostgreSQL is installed and running');
    console.error('2. Check your .env file database credentials');
    console.error('3. Create the database: createdb siva_medicals');
    console.error('4. Or use default credentials in .env');
    console.error('\n📖 For Windows:');
    console.error('- Download PostgreSQL from postgresql.org');
    console.error('- Or use a cloud database like ElephantSQL');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();