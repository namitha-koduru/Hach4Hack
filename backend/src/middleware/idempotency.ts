import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashString } from '../utils/crypto';
import { UnprocessableEntityError } from '../utils/errors';

export const handleIdempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    // If no key provided, continue normally
    return next();
  }

  // Sanitize key
  const key = idempotencyKey.trim();
  if (key.length < 8 || key.length > 128) {
    throw new UnprocessableEntityError('Idempotency-Key must be between 8 and 128 characters');
  }

  req.idempotencyKey = key;
  const requestHash = hashString(req.body || {});
  const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
  const userId = req.user?.userId || 'anonymous';

  try {
    // 1. Check if record already exists
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key },
    });

    if (existing) {
      // Validate that the payload matches
      if (existing.requestHash !== requestHash) {
        throw new UnprocessableEntityError(
          'Idempotency-Key has already been used with a different request payload'
        );
      }

      // Valid replay: Return cached status and response
      res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }

    // 2. Intercept response to store idempotency record upon successful completion
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      // Only cache successful (2xx) or valid client rejection responses
      if (res.statusCode >= 200 && res.statusCode < 500) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
        // Asynchronously save record without blocking client response
        prisma.idempotencyRecord
          .create({
            data: {
              key,
              userId,
              endpoint,
              requestHash,
              statusCode: res.statusCode,
              responseBody: (body as object) || {},
              expiresAt,
            },
          })
          .catch((err) => {
            console.error('Failed to save idempotency record:', err);
          });
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};

