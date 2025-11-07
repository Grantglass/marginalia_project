/**
 * Server Integration Tests
 */

const request = require('supertest');
const app = require('../server');

// Mock the logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Server API Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('cache');
    });
  });

  describe('GET /', () => {
    it('should serve the main HTML page', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.type).toMatch(/html/);
    });
  });

  describe('GET /transcriptions', () => {
    it('should return transcriptions data', async () => {
      const response = await request(app).get('/transcriptions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support cache refresh parameter', async () => {
      const response = await request(app).get('/transcriptions?refresh=true');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /cache/status', () => {
    it('should return cache status', async () => {
      const response = await request(app).get('/cache/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isCached');
      expect(response.body).toHaveProperty('itemCount');
    });
  });

  describe('POST /cache/clear', () => {
    it('should clear the cache', async () => {
      const response = await request(app).post('/cache/clear');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});
