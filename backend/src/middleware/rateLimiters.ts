import rateLimit from 'express-rate-limit';
import { config } from '../config';

const isTestOrBenchmark = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'benchmark' ||
  config.env === 'test' ||
  config.env === 'benchmark';

/**
 * Strict brute-force protection for authentication endpoints (/login, /register).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  skip: isTestOrBenchmark,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
    },
  },
});

/**
 * Strict brute-force protection for invite code redemption (/invites/redeem).
 */
export const inviteRedeemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: isTestOrBenchmark,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'INVITE_RATE_LIMIT_EXCEEDED',
      message: 'Too many invite code attempts. Please wait 15 minutes and try again.',
    },
  },
});
