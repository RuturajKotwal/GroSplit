import { Request, Response, NextFunction } from 'express';

export const DEFAULT_API_KEY = 'grosplit-dev-secret-key';

/**
 * Authentication middleware for write endpoints.
 * Validates 'x-api-key' or 'Authorization: Bearer <key>' against the configured API_KEY.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const expectedKey = process.env.API_KEY || DEFAULT_API_KEY;

  const headerKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  let providedKey: string | undefined;

  if (typeof headerKey === 'string') {
    providedKey = headerKey;
  } else if (
    typeof authHeader === 'string' &&
    authHeader.startsWith('Bearer ')
  ) {
    providedKey = authHeader.slice(7).trim();
  }

  if (!providedKey) {
    return res.status(401).json({
      error:
        'Unauthorized: Missing API key in x-api-key or Authorization header',
    });
  }

  if (providedKey !== expectedKey) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid API key',
    });
  }

  next();
}
