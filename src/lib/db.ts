import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { resolve } from 'node:path';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export function databaseUrl() {
  const configured = process.env.DATABASE_URL ?? 'file:./dev.db';
  if (!configured.startsWith('file:'))
    throw new Error('This local MVP requires a file: SQLite DATABASE_URL.');
  const path = configured.slice(5);
  return `file:${resolve(process.cwd(), 'prisma', path)}`;
}
export function createDatabase() {
  return new PrismaClient({ adapter: new PrismaLibSQL({ url: databaseUrl() }) });
}
export const db = globalForPrisma.prisma ?? createDatabase();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
