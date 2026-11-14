import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import { verifyToken, TokenPayload } from '../utils/crypto';
import { prisma } from '../config/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      idempotencyKey?: string;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required. Missing Bearer token.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch {
      // Ignore token error for optional auth
    }
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Action requires one of the following roles: ${roles.join(', ')}`);
    }
    next();
  };
};

/**
 * Ensures the authenticated user is either the team leader or a platform administrator.
 */
export const requireLeaderOrAdmin = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const teamId = (req.params.teamId || req.params.id) as string;
  if (!teamId) {
    throw new NotFoundError('Team ID parameter missing');
  }

  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: req.user.userId,
      role: 'LEADER',
    },
  });

  if (!membership) {
    throw new ForbiddenError('Only the team leader or an administrator can perform this action');
  }

  next();
};
