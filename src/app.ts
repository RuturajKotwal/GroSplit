import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import groupsRouter from './routes/groups';

interface CustomError extends Error {
  status?: number;
}

const app = express();

app.use(cors());
app.use(express.json());

// HTTP Request Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
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
    console.error('Unhandled Server Error:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Internal Server Error',
    });
  }
);

export default app;
