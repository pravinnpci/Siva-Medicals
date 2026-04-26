const request = require('supertest');
const app = require('../server');

describe('Siva Medicals API Tests', () => {
  beforeAll(async () => {
    // Allow time for the database pool to initialize in the background
    // during the container startup process.
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Public Endpoints', () => {
    test('GET /api/health should return 200 or 503', async () => {
      const response = await request(app).get('/api/health');
      // Status 200 means DB is connected, 503 means it's still warming up
      expect([200, 503]).toContain(response.statusCode);
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('database');
    }, 10000);

    test('GET /api/twilio-test should return diagnostic info', async () => {
      const response = await request(app).get('/api/twilio-test');
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('twilioClientReady');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Authentication Flow', () => {
    test('GET /admin/login should render the login page', async () => {
      const response = await request(app).get('/admin/login');
      expect(response.statusCode).toBe(200);
      expect(response.text).toContain('Admin Panel');
      expect(response.text).toContain('Siva Medicals');
    });

    test('POST /admin/login should fail with incorrect credentials', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({ username: 'nonexistent', password: 'wrongpassword' });
      
      // Should return 200 but display an error message on the page
      expect(response.statusCode).toBe(200);
      expect(response.text).toContain('Invalid credentials');
    });

    test('POST /admin/login should succeed with default admin account', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({ username: 'admin', password: 'admin123' });
      
      // A successful login should redirect to the dashboard
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('/admin/dashboard');
    });
  });

  describe('Contact API', () => {
    test('POST /api/contact should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'Incomplete Submission' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    test('POST /api/contact should accept a valid submission', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Test User',
          email: 'test@sivamedicals.com',
          phone: '+919876543210',
          message: 'This is an automated test message.',
          category: 'General_Inquiry'
        });
      
      // Expect 200 if DB is up, or 503 if DB is temporarily unavailable
      expect([200, 503]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });
  });
});
