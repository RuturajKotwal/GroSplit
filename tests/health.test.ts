import request from 'supertest';
import app from '../src/app';

describe('GET /health', () => {
  it('should return 200 OK with status and timestamp', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });
});
