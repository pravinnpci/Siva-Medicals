const request = require('supertest');
const app = require('../server');

describe('Siva Medicals API Tests', () => {
  test('GET /api/health should return 200 or 503', async () => {
    const response = await request(app).get('/api/health');
    // It might be 503 if DB is still warming up, but endpoint must respond
    expect([200, 503]).toContain(response.statusCode);
    expect(response.body).toHaveProperty('uptime');
  });

  test('GET /admin/login should render correctly', async () => {
    const response = await request(app).get('/admin/login');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Admin Panel');
    expect(response.text).toContain('Siva Medicals');
  });
});