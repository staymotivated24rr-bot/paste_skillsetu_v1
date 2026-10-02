import { afterEach, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { applyHostedMigrations } from '../prisma/hosted-migrations';
const folders: string[] = [];
afterEach(() => {
  for (const p of folders.splice(0)) rmSync(p, { recursive: true, force: true });
});
function directory() {
  const p = mkdtempSync(join(tmpdir(), 'skillsetu-migrations-'));
  folders.push(p);
  return p;
}
it('upgrades the original schema and preserves existing student assessment history through repeated setup', () => {
  const path = join(directory(), 'legacy.db');
  const sql = readFileSync('prisma/migrations/202610020001_init/migration.sql', 'utf8');
  const old = new DatabaseSync(path);
  old.exec(sql);
  old.exec(
    'CREATE TABLE _skillsetu_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  old
    .prepare('INSERT INTO _skillsetu_migrations VALUES(?,?,?)')
    .run(
      '202610020001_init',
      createHash('sha256').update(sql).digest('hex'),
      new Date().toISOString(),
    );
  old.exec(
    `INSERT INTO "User" (id,name) VALUES ('legacy-user','Existing learner'); INSERT INTO "Role" VALUES ('data-analyst','Data Analyst','Legacy role'); INSERT INTO "Assessment" VALUES ('diagnostic','data-analyst','diagnostic'); INSERT INTO "AssessmentAttempt" (id,userId,assessmentId,status,startedAt,completedAt,score) VALUES ('legacy-attempt','legacy-user','diagnostic','complete',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,42);`,
  );
  old.close();
  const env = {
    ...process.env,
    DATABASE_URL: `file:${path}`,
    TURSO_DATABASE_URL: '',
    TURSO_AUTH_TOKEN: '',
  };
  for (let i = 0; i < 2; i++)
    for (const script of ['prisma/migrate.ts', 'prisma/seed.ts'])
      execFileSync(process.execPath, ['--import', 'tsx', script], { env, stdio: 'pipe' });
  const current = new DatabaseSync(path);
  try {
    expect(
      current.prepare('SELECT name,selectedRoleId FROM "User" WHERE id=?').get('legacy-user'),
    ).toMatchObject({ name: 'Existing learner', selectedRoleId: 'data-analyst' });
    expect(
      current
        .prepare('SELECT status,score FROM "AssessmentAttempt" WHERE id=?')
        .get('legacy-attempt'),
    ).toMatchObject({ status: 'complete', score: 42 });
    expect(current.prepare('SELECT COUNT(*) AS n FROM "Role"').get()?.n).toBe(3);
    expect(current.prepare('SELECT COUNT(*) AS n FROM "Assessment"').get()?.n).toBe(6);
  } finally {
    current.close();
  }
});
it('applies libSQL migrations repeatably, checks integrity and rolls back failed schema work with its marker', async () => {
  const folder = directory();
  const client = createClient({ url: `file:${join(folder, 'libsql.db')}` });
  const migrations = join(folder, 'migrations');
  mkdirSync(migrations);
  mkdirSync(join(migrations, '001_initial'));
  const first = join(migrations, '001_initial', 'migration.sql');
  writeFileSync(first, 'CREATE TABLE Example (id TEXT PRIMARY KEY);');
  try {
    await applyHostedMigrations(client, migrations);
    await applyHostedMigrations(client, migrations);
    expect((await client.execute('SELECT * FROM _skillsetu_migrations')).rows).toHaveLength(1);
    writeFileSync(first, 'CREATE TABLE Changed (id TEXT);');
    await expect(applyHostedMigrations(client, migrations)).rejects.toThrow('has changed');
    writeFileSync(first, 'CREATE TABLE Example (id TEXT PRIMARY KEY);');
    mkdirSync(join(migrations, '002_bad'));
    writeFileSync(
      join(migrations, '002_bad', 'migration.sql'),
      'CREATE TABLE Partial (id TEXT); INSERT INTO MissingTable VALUES (1);',
    );
    await expect(applyHostedMigrations(client, migrations)).rejects.toThrow();
    expect(
      (await client.execute("SELECT name FROM sqlite_master WHERE name='Partial'")).rows,
    ).toHaveLength(0);
    expect((await client.execute('SELECT * FROM _skillsetu_migrations')).rows).toHaveLength(1);
  } finally {
    client.close();
  }
});
