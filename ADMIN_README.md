# 🏥 Siva Medicals - Admin System

A complete pharmacy management system with admin panel, contact form handling, file uploads, and WhatsApp integration.

## 🚀 Features

### Admin Panel
- ✅ **Secure Authentication** - User login with session management
- ✅ **Dashboard** - Overview of contacts, files, and WhatsApp messages
- ✅ **Contact Management** - View and manage contact form submissions
- ✅ **File Upload System** - Upload, view, and manage files
- ✅ **WhatsApp Integration** - Receive and manage WhatsApp messages
- ✅ **User Management** - Create and manage admin users (Super Admin only)

### Frontend
- ✅ **Contact Form** - Prescription upload with validation
- ✅ **Real-time Validation** - Email and phone number validation
- ✅ **File Upload** - Image upload with size and type validation
- ✅ **Responsive Design** - Mobile-friendly interface

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Make sure PostgreSQL is running
npm run setup-db
```

### 3. Configure Environment
Update the `.env` file with your database and Twilio credentials:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=siva_medicals
DB_USER=postgres
DB_PASSWORD=your_password

# Session
SESSION_SECRET=your-secret-key

# Twilio (optional for WhatsApp)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_enabled_number
# TWILIO_WHATSAPP_FROM is also supported as a synonym for the WhatsApp sender number
TWILIO_WHATSAPP_FROM=your_whatsapp_enabled_number
```

### 4. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The admin panel will be available at: `http://localhost:3001/admin/login`

## 🔐 Default Admin Credentials

- **Username:** admin
- **Password:** admin123

## 📁 Project Structure

```
siva-medicals/
├── server.js              # Main server file
├── setup-db.js           # Database setup script
├── package.json          # Dependencies
├── .env                  # Environment variables
├── views/                # EJS templates
│   └── admin/           # Admin panel templates
├── public/              # Static files
│   ├── css/
│   └── js/
├── uploads/             # File uploads directory
└── js/                  # Frontend JavaScript
```

## 🔧 API Endpoints

### Authentication
- `POST /admin/login` - Admin login
- `POST /admin/logout` - Admin logout

### Dashboard
- `GET /admin/dashboard` - Admin dashboard

### Contact Management
- `GET /admin/contacts` - View contact submissions
- `POST /admin/contacts/:id/status` - Update contact status

### File Management
- `GET /admin/files` - View uploaded files
- `POST /admin/upload` - Upload file
- `DELETE /admin/files/:id` - Delete file

### WhatsApp
- `GET /admin/whatsapp` - View WhatsApp messages
- `POST /webhook/whatsapp` - Twilio webhook

### User Management (Super Admin)
- `GET /admin/users` - View users
- `POST /admin/users` - Create user

### Frontend API
- `POST /api/contact` - Submit contact form

## 📱 WhatsApp Setup (Optional)

1. **Create Twilio Account**
   - Sign up at [twilio.com](https://twilio.com)

2. **Get WhatsApp Number**
   - Enable WhatsApp in your Twilio dashboard
   - Get a WhatsApp-enabled phone number

3. **Configure Webhook**
   - Set webhook URL: `https://yourdomain.com/webhook/whatsapp`
   - Method: POST

4. **Update Environment Variables**
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=+1234567890
   ```

## 🔒 Security Features

- **Password Hashing** - bcrypt for secure password storage
- **Session Management** - Secure session handling with PostgreSQL
- **Input Validation** - Client and server-side validation
- **File Upload Security** - Type and size restrictions
- **Role-based Access** - Different permissions for admin levels

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production` in your environment
2. Use a production database (not localhost)
3. Set strong `SESSION_SECRET`
4. Configure HTTPS

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "siva-medicals-admin"

# Or using systemd
sudo nano /etc/systemd/system/siva-medicals.service
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d siva_medicals
```

### File Upload Issues
- Check `uploads/` directory permissions
- Ensure file size is under 10MB
- Verify allowed file types

### WhatsApp Not Working
- Verify Twilio credentials
- Check webhook URL is accessible
- Ensure WhatsApp number is approved

## 📞 Support

For issues or questions:
- Check the logs in the console
- Verify database connectivity
- Ensure all environment variables are set

## 📝 License

MIT License - feel free to use this project for your pharmacy business!