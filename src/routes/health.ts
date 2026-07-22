import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Comprehensive system and database health status
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Server is operational with database and process metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', async (_req: Request, res: Response) => {
  let isDbConnected = mongoose.connection.readyState === 1;
  let dbError: string | null = null;

  if (!isDbConnected) {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (MONGO_URI) {
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        isDbConnected = mongoose.connection.readyState === 1;
      } catch (err) {
        dbError = (err as Error).message;
      }
    } else {
      dbError =
        'Neither MONGO_URI nor MONGODB_URI environment variable is set on the server.';
    }
  }

  const memoryUsage = process.memoryUsage();

  const responsePayload: Record<string, unknown> = {
    status: isDbConnected ? 'OK' : 'DEGRADED',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      heapUsedMB: +(memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: +(memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: +(memoryUsage.rss / 1024 / 1024).toFixed(2),
    },
    timestamp: new Date().toISOString(),
  };

  if (dbError) {
    responsePayload.dbError = dbError;
  }

  res.status(200).json(responsePayload);
});

export default router;
