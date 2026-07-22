import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { logger } from './config/logger';
import healthRouter from './routes/health';
import groupsRouter from './routes/groups';

interface CustomError extends Error {
  status?: number;
}

const app = express();

app.use(cors());
app.use(express.json());

// Structured HTTP Request Logging Middleware
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => process.env.NODE_ENV === 'test' && req.url === '/health',
    },
  })
);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/health', healthRouter);
app.use('/groups', groupsRouter);

// Global Error Handler Middleware
app.use(
  (
    err: CustomError,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Response => {
    logger.error({ err }, 'Unhandled Server Error');
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Internal Server Error',
    });
  }
);

export default app;
