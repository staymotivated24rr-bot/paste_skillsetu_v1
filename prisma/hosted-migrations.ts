import type { Client } from '@libsql/client';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Keep schema changes and their checksum record in the same transaction.
export async function applyHostedMigrations(
  client: Client,
  directory = resolve('prisma/migrations'),
) {
  await client.execute(
    'CREATE TABLE IF NOT EXISTS _skillsetu_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  for (const name of readdirSync(directory)
    .filter((n) => /^\d/.test(n))
    .sort()) {
    const sql = readFileSync(resolve(directory, name, 'migration.sql'), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const tx = await client.transaction('write');
    try {
      const old = await tx.execute({
        sql: 'SELECT checksum FROM _skillsetu_migrations WHERE name = ?',
        args: [name],
      });
      if (old.rows.length) {
        if (String(old.rows[0].checksum) !== checksum)
          throw new Error(
            `Applied migration ${name} has changed. Restore it and add a new migration.`,
          );
      } else {
        await tx.executeMultiple(sql);
        await tx.execute({
          sql: 'INSERT INTO _skillsetu_migrations (name, checksum, applied_at) VALUES (?, ?, ?)',
          args: [name, checksum, new Date().toISOString()],
        });
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
  }
}
