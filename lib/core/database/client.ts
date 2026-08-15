import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/app/generated/prisma/client';

function createAdapter(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  const connectTimeout = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test' ? 1000 : 10_000;

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, '').replace(/\/$/, ''),
    connectTimeout,
    acquireTimeout: connectTimeout,
  });
}

export function createPrismaClient(connectionString?: string) {
  return new PrismaClient({ adapter: createAdapter(connectionString) });
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export type { PrismaClient };
