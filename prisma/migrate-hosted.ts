import { createClient } from '@libsql/client';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.TURSO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const authToken =
  process.env.TURSO_AUTH_TOKEN?.trim() || process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;

if (!url || url.startsWith('file:')) {
  throw new Error(
    'Hosted migration requires TURSO_DATABASE_URL (or a non-file DATABASE_URL) and, when required, TURSO_AUTH_TOKEN.',
  );
}

const client = createClient({ url, authToken });

async function main() {
  await client.executeMultiple(
    'CREATE TABLE IF NOT EXISTS _skillsetu_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL);',
  );

  for (const name of readdirSync(resolve('prisma/migrations'))
    .filter((n) => /^\d/.test(n))
    .sort()) {
    const sql = readFileSync(resolve('prisma/migrations', name, 'migration.sql'), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const old = await client.execute({
      sql: 'SELECT checksum FROM _skillsetu_migrations WHERE name = ?',
      args: [name],
    });

    if (old.rows.length) {
      if (String(old.rows[0].checksum) !== checksum) {
        throw new Error(`Applied migration ${name} has changed. Restore it and add a new migration.`);
      }
      continue;
    }

    await client.executeMultiple('BEGIN IMMEDIATE;\n' + sql + '\nCOMMIT;');
    await client.execute({
      sql: 'INSERT INTO _skillsetu_migrations (name, checksum, applied_at) VALUES (?, ?, ?)',
      args: [name, checksum, new Date().toISOString()],
    });
    console.log(`Applied ${name}`);
  }

  console.log('Hosted libSQL database is up to date.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.close());
