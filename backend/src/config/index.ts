import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/teamforge?schema=public',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/teamforge_test?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_signing_key_replace_in_production_min_32_chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '500', 10),
  },
};

