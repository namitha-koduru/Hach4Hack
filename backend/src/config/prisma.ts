import { PrismaClient } from '@prisma/client';
import { config } from './index';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.env === 'test' ? config.testDatabaseUrl : config.databaseUrl,
      },
    },
    log:
      process.env.NODE_ENV === 'benchmark' ||
      process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'test' ||
      config.env === 'benchmark' ||
      config.env === 'production' ||
      config.env === 'test'
        ? ['error']
        : ['query', 'error', 'warn'],
  });

if (config.env !== 'production') {
  global.prisma = prisma;
}

