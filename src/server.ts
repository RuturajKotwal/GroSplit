import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';
import { logger } from './config/logger';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const startServer = async () => {
  try {
    if (MONGO_URI) {
      try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        logger.info('Connected to MongoDB Atlas');
      } catch (dbErr) {
        logger.warn(
          `Could not connect to MongoDB (${(dbErr as Error).message}); running server without active DB connection.`
        );
      }
    } else {
      logger.warn(
        'MONGO_URI is not set; running server without DB connection.'
      );
    }

    const server = app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
    return server;
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default startServer;
