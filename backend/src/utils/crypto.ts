import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.bcryptSaltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

/**
 * Generate a cryptographically secure random invitation code.
 * Entropy: 128 bits (16 bytes) represented as formatted uppercase hex.
 * Storage: Only the SHA-256 digest is stored in the database to prevent token leakage.
 */
export const generateInviteCode = (): { rawCode: string; codeHash: string; codePrefix: string } => {
  const bytes = crypto.randomBytes(16); // 128 bits of entropy (32 hex chars)
  const hex = bytes.toString('hex').toUpperCase();
  const segments = hex.match(/.{1,4}/g) || [hex];
  const rawCode = `TF-${segments.join('-')}`;
  const codeHash = hashString(rawCode);
  const codePrefix = rawCode.slice(0, 7) + '...';

  return { rawCode, codeHash, codePrefix };
};

/**
 * Compute standard SHA-256 digest of an arbitrary string or object.
 */
export const hashString = (data: string | object): string => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
};

