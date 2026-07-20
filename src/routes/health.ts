import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

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

  const responsePayload: Record<string, unknown> = {
    status: 'OK',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };

  if (dbError) {
    responsePayload.dbError = dbError;
  }

  res.status(200).json(responsePayload);
});

export default router;
