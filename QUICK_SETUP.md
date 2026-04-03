# 🚀 Quick Setup Guide

## ⚡ Quick Start (Test Mode)

If you just want to test the admin system immediately:

```bash
# Install dependencies
npm install

# Start test server (no database needed)
npm run test
```

Then visit: http://localhost:3001/admin/login
- Username: admin
- Password: admin123

**Note:** Test mode uses in-memory storage - data won't persist between restarts.

## 🗄️ Full Setup (With Database)

### Option 1: PostgreSQL Installation (Recommended)

### Windows
1. Download PostgreSQL from https://postgresql.org/download/windows/
2. Run installer with default settings
3. Remember the password you set for user 'postgres'
4. Update `.env` file with your password

### Linux/Mac
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql
```

### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE siva_medicals;

# Exit
\q
```

## Option 2: Cloud Database (Easier)

Use a free cloud PostgreSQL service:
- **ElephantSQL**: https://elephantsql.com
- **Supabase**: https://supabase.com
- **Neon**: https://neon.tech

Update your `.env` file with the connection details.

## Start Full Application

```bash
# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Setup database
npm run setup-db

# Start server
npm start
```

## Access Admin Panel

- URL: http://localhost:3001/admin/login
- Username: admin
- Password: admin123

## Features Available

### Test Mode (No Database)
- ✅ Admin login/logout
- ✅ Contact form submissions (stored in memory)
- ✅ File uploads
- ❌ Data persistence
- ❌ WhatsApp integration
- ❌ User management

### Full Mode (With Database)
- ✅ All test mode features
- ✅ Data persistence
- ✅ WhatsApp integration (optional)
- ✅ User management
- ✅ Advanced reporting

## Troubleshooting

### Port 5432 Connection Refused
- PostgreSQL service is not running
- Check: `sudo systemctl status postgresql` (Linux)
- Start: `sudo systemctl start postgresql` (Linux)

### Database Does Not Exist
```sql
-- Connect as superuser
psql -U postgres
CREATE DATABASE siva_medicals;
GRANT ALL PRIVILEGES ON DATABASE siva_medicals TO postgres;
```

### Permission Denied
- Check PostgreSQL user permissions
- Or run: `psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE siva_medicals TO your_username;"`

Need help? Check the full documentation in `ADMIN_README.md`