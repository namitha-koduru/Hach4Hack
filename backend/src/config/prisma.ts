import { PrismaClient } from '@prisma/client';
import net from 'net';
import { config } from './index';
import { createMockPrisma } from './mockPrisma';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let activeClient: PrismaClient | null = null;
let pendingInit: Promise<PrismaClient> | null = null;

async function probeAndConnectRealDb(): Promise<PrismaClient> {
  if (activeClient) return activeClient;

  const isTestEnv = process.env.NODE_ENV === 'test' || config.env === 'test';
  const dbUrl = isTestEnv ? (config.testDatabaseUrl || config.databaseUrl) : config.databaseUrl;
  if (!dbUrl) {
    console.warn('[AI Studio] DATABASE_URL not configured — using pre-seeded in-memory database');
    activeClient = createMockPrisma();
    return activeClient;
  }

  // In test mode (CI / Jest), connect directly with PrismaClient without a race-prone TCP timer
  if (!isTestEnv) {
    try {
      const parsed = new URL(dbUrl);
      const host = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname;
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
        }, 600);

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
        activeClient = createMockPrisma();
        return activeClient;
      }
    } catch {
      console.warn('[AI Studio] Invalid DATABASE_URL — using pre-seeded in-memory database');
      activeClient = createMockPrisma();
      return activeClient;
    }
  }

  try {
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
    return activeClient;
  } catch {
    console.warn('[AI Studio] Database connection failed — using pre-seeded in-memory database');
    activeClient = createMockPrisma();
    return activeClient;
  }
}

function getReadyClient(): Promise<PrismaClient> {
  if (activeClient) return Promise.resolve(activeClient);
  if (!pendingInit) {
    pendingInit = probeAndConnectRealDb();
  }
  return pendingInit;
}

function wrapDelegate(modelName: string | symbol) {
  return new Proxy(
    {},
    {
      get(_target, methodName) {
        if (methodName === 'then') return undefined;
        return async (...args: unknown[]) => {
          const client = await getReadyClient();
          const delegate = (client as unknown as Record<string | symbol, Record<string | symbol, Function>>)[modelName];
          const fn = delegate?.[methodName];
          if (typeof fn !== 'function') {
            throw new TypeError(`Prisma delegate method ${String(modelName)}.${String(methodName)} is not available`);
          }
          return fn.apply(delegate, args);
        };
      },
    }
  );
}

export const prisma: PrismaClient =
  global.prisma ||
  (new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'string' && prop.startsWith('$')) {
        return async (...args: unknown[]) => {
          const client = await getReadyClient();
          const fn = (client as unknown as Record<string, Function>)[prop];
          return fn.apply(client, args);
        };
      }
      return wrapDelegate(prop);
    },
  }) as PrismaClient);

if (config.env !== 'production') {
  global.prisma = prisma;
}
