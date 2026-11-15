import express from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

export const createApp = () => {
  const app = express();

  // 1. Security Headers (iframe & external fonts compatible)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      xFrameOptions: false,
    })
  );

  // 2. CORS
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
      exposedHeaders: ['Idempotency-Key', 'X-Cache-Lookup'],
    })
  );

  // 3. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Logging
  const isSilentEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'benchmark' ||
    config.env === 'test' ||
    config.env === 'benchmark';
  if (!isSilentEnv) {
    app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  }

  // 5. Rate Limiting
  const maxRequests = process.env.RATE_LIMIT_MAX
    ? parseInt(process.env.RATE_LIMIT_MAX, 10)
    : config.rateLimit.max;

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });

  // Apply rate limiter to /api
  app.use('/api', limiter);

  // 6. Mount API Routes
  app.use('/api', apiRouter);

  // 7. Catch-all for undefined API routes
  app.use('/api', (_req, _res, next) => {
    next(new NotFoundError('API Route'));
  });

  // 8. Serve Frontend SPA Static Build
  const frontendDistCandidates = [
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../../../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
  ];
  const frontendDist = frontendDistCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (frontendDist) {
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  } else {
    app.use((_req, _res, next) => {
      next(new NotFoundError('API Route'));
    });
  }

  // 9. Global Error Handler
  app.use(errorHandler);

  return app;
};

