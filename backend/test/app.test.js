const request = require('supertest');
const app = require('../server');

describe('Siva Medicals API Tests', () => {
  test('GET /api/health should return 200 or 503', async () => {
    // Wait 500ms to allow DB connection to stabilize in CI
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const response = await request(app).get('/api/health');
    
    expect([200, 503]).toContain(response.statusCode);
    expect(response.body).toHaveProperty('uptime');
  }, 10000); // Increase timeout for CI environment

  test('GET /admin/login should render correctly', async () => {
    const response = await request(app).get('/admin/login');
    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('Admin Panel');
    expect(response.text).toContain('Siva Medicals');
  });
});
