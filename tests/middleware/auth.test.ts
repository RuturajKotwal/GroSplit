import { Request, Response, NextFunction } from 'express';
import { requireApiKey, DEFAULT_API_KEY } from '../../src/middleware/auth';

describe('Auth Middleware (requireApiKey)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    delete process.env.API_KEY;
  });

  it('should call next() when valid x-api-key header is provided', () => {
    req.headers = { 'x-api-key': DEFAULT_API_KEY };
    requireApiKey(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next() when valid Authorization: Bearer <key> is provided', () => {
    req.headers = { authorization: `Bearer ${DEFAULT_API_KEY}` };
    requireApiKey(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 Unauthorized when no key is provided in headers', () => {
    requireApiKey(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error:
        'Unauthorized: Missing API key in x-api-key or Authorization header',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 Unauthorized when invalid key is provided', () => {
    req.headers = { 'x-api-key': 'wrong-secret-key' };
    requireApiKey(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid API key',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate against custom process.env.API_KEY', () => {
    process.env.API_KEY = 'custom-production-key-12345';
    req.headers = { 'x-api-key': 'custom-production-key-12345' };

    requireApiKey(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
