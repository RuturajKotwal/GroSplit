import request from 'supertest';
import express, { Request, Response } from 'express';
import { createCustomRateLimiter } from '../../src/middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  it('should allow requests within threshold and block with 429 when limit exceeded', async () => {
    const app = express();
    // Allow maximum 3 requests in a 10-second window
    const limiter = createCustomRateLimiter(3, 10000);

    app.post('/test-write', limiter, (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });

    // 1st request -> 200
    const res1 = await request(app).post('/test-write');
    expect(res1.status).toBe(200);

    // 2nd request -> 200
    const res2 = await request(app).post('/test-write');
    expect(res2.status).toBe(200);

    // 3rd request -> 200
    const res3 = await request(app).post('/test-write');
    expect(res3.status).toBe(200);

    // 4th request -> 429 Too Many Requests
    const res4 = await request(app).post('/test-write');
    expect(res4.status).toBe(429);
    expect(res4.body).toEqual({
      error: 'Too many requests, please try again later.',
    });
  });
});
