import request from 'supertest';
import app from '../../src/app';

describe('Swagger API Documentation Endpoints', () => {
  it('should serve Swagger UI at GET /api-docs/', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON specification at GET /api-docs.json', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('openapi', '3.0.0');
    expect(res.body.info).toHaveProperty('title', 'GroSplit REST API');
    expect(res.body.paths).toHaveProperty('/groups');
    expect(res.body.paths).toHaveProperty('/health');
    expect(res.body.components.schemas).toHaveProperty('Group');
    expect(res.body.components.schemas).toHaveProperty('Expense');
    expect(res.body.components.schemas).toHaveProperty('Settlement');
  });
});
