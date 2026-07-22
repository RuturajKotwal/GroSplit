import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('should return 200 OK with comprehensive health and process telemetry', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('version', '2.0.0');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('memory');
    expect(response.body.memory).toHaveProperty('heapUsedMB');
    expect(response.body.memory).toHaveProperty('heapTotalMB');
    expect(response.body).toHaveProperty('timestamp');
  });
});
