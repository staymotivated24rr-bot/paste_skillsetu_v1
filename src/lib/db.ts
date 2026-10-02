import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { isAbsolute, resolve } from 'node:path';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export function configuredDatabaseUrl() {
  return (
    process.env.TURSO_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    'file:./dev.db'
  );
}

export function databaseUrl() {
  const configured = configuredDatabaseUrl();

  if (configured.startsWith('file:')) {
    const path = configured.slice(5);
    const resolved = isAbsolute(path) ? path : resolve(process.cwd(), 'prisma', path);
    return `file:${resolved}`;
  }

  if (/^(libsql|https?|wss?):\/\//.test(configured)) return configured;

  throw new Error(
    'Unsupported database URL. Use file: for local SQLite or a libSQL/Turso URL for hosted deployment.',
  );
}

export function databaseAuthToken() {
  return (
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    undefined
  );
}

export function deploymentDatabaseIssue() {
  if (process.env.VERCEL && configuredDatabaseUrl().startsWith('file:')) {
    return (
      'This deployment needs a durable database. Connect a hosted libSQL/Turso database ' +
      'and set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then redeploy.'
    );
  }
  return null;
}

export function createDatabase() {
  return new PrismaClient({
    adapter: new PrismaLibSQL({
      url: databaseUrl(),
      authToken: databaseAuthToken(),
    }),
  });
}

export const db = globalForPrisma.prisma ?? createDatabase();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
