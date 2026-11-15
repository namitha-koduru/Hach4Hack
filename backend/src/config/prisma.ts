import { PrismaClient } from '@prisma/client';
import net from 'net';
import { config } from './index';
import { createMockPrisma } from './mockPrisma';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let activeClient: PrismaClient = createMockPrisma();

async function probeAndConnectRealDb(): Promise<void> {
  const dbUrl = config.env === 'test' ? config.testDatabaseUrl : config.databaseUrl;
  if (!dbUrl) {
    console.warn('[AI Studio] DATABASE_URL not configured — using pre-seeded in-memory database');
    return;
  }

  // Fast TCP reachability probe before handing traffic to PrismaClient
  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname;
    const port = parseInt(parsed.port || '5432', 10);

    // Cloud SQL Unix socket paths use query param ?host=/cloudsql/...
    const socketHost = parsed.searchParams.get('host');
    const target: net.NetConnectOpts = socketHost
      ? { path: `${socketHost}/.s.PGSQL.${port}` }
      : { host, port };

    const reachable = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection(target);
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 400);

      socket.once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
    });

    if (!reachable) {
      console.warn(`[AI Studio] Database at ${host}:${port} unreachable — using pre-seeded in-memory database`);
      return;
    }

    const realPrisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
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
    await realPrisma.$connect();
    activeClient = realPrisma;
    console.log('[AI Studio] Connected to PostgreSQL database');
  } catch {
    console.warn('[AI Studio] Database connection failed — using pre-seeded in-memory database');
  }
}

void probeAndConnectRealDb();

export const prisma: PrismaClient =
  global.prisma ||
  (new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const value = (activeClient as any)[prop];
      return typeof value === 'function' ? value.bind(activeClient) : value;
    },
  }) as PrismaClient);

if (config.env !== 'production') {
  global.prisma = prisma;
}
