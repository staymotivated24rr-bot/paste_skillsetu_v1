import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
// Small offline migration runner: checked-in SQL, checksum verification, atomic application.
const configured = process.env.DATABASE_URL ?? 'file:./dev.db';
if (!configured.startsWith('file:')) throw new Error('Use a local file: SQLite DATABASE_URL.');
const path = resolve(process.cwd(), 'prisma', configured.slice(5));
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(
  'PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _skillsetu_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL);',
);
try {
  for (const name of readdirSync(resolve('prisma/migrations'))
    .filter((n) => /^\d/.test(n))
    .sort()) {
    const sql = readFileSync(resolve('prisma/migrations', name, 'migration.sql'), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const old = db.prepare('SELECT checksum FROM _skillsetu_migrations WHERE name=?').get(name);
    if (old) {
      if (old.checksum !== checksum)
        throw new Error(
          `Applied migration ${name} has changed. Restore it and add a new migration.`,
        );
      continue;
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _skillsetu_migrations VALUES(?,?,?)').run(
        name,
        checksum,
        new Date().toISOString(),
      );
      db.exec('COMMIT');
      console.log(`Applied ${name}`);
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  console.log('SQLite database is up to date.');
} finally {
  db.close();
}
