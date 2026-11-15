import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashString } from '../utils/crypto';
import { UnprocessableEntityError } from '../utils/errors';

// Serialize concurrent requests carrying the exact same Idempotency-Key
const inFlightKeys = new Map<string, Promise<void>>();

export const handleIdempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    return next();
  }

  const key = idempotencyKey.trim();
  if (key.length < 8 || key.length > 128) {
    throw new UnprocessableEntityError('Idempotency-Key must be between 8 and 128 characters');
  }

  req.idempotencyKey = key;
  const requestHash = hashString(req.body || {});
  const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
  const userId = req.user?.userId || 'anonymous';
  const scopedKey = `${userId}:${key}`;

  // Wait for any simultaneous in-flight request with the exact same key to finish persisting
  const inflight = inFlightKeys.get(scopedKey);
  if (inflight) {
    await inflight.catch(() => {});
  }

  try {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: scopedKey },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new UnprocessableEntityError(
          'Idempotency-Key has already been used with a different request payload'
        );
      }

      res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }

    let releaseFlight!: () => void;
    const flightPromise = new Promise<void>((resolve) => {
      releaseFlight = resolve;
    });
    inFlightKeys.set(scopedKey, flightPromise);

    let released = false;
    const cleanupFlight = () => {
      if (!released) {
        released = true;
        inFlightKeys.delete(scopedKey);
        releaseFlight();
      }
    };

    res.once('finish', cleanupFlight);
    res.once('close', cleanupFlight);

    const originalJson = res.json.bind(res);
    let persistencePromise: Promise<void> | null = null;

    res.json = function (body: unknown): Response {
      if (res.statusCode >= 200 && res.statusCode < 500 && !persistencePromise) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        persistencePromise = prisma.idempotencyRecord
          .create({
            data: {
              key: scopedKey,
              userId,
              endpoint,
              requestHash,
              statusCode: res.statusCode,
              responseBody: (body as object) || {},
              expiresAt,
            },
          })
          .then(() => undefined)
          .catch((err) => {
            console.error('Failed to save idempotency record:', err);
          })
          .finally(() => {
            cleanupFlight();
          });

        // Wait briefly for DB persist before sending response so immediate retries see the cached record
        void persistencePromise.then(() => originalJson(body));
        return res;
      }

      cleanupFlight();
      return originalJson(body);
    };

    next();
  } catch (error) {
    inFlightKeys.delete(scopedKey);
    next(error);
  }
};
