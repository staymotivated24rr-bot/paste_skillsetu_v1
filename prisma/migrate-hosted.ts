import { createClient } from '@libsql/client';
import { applyHostedMigrations } from './hosted-migrations';

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
  await applyHostedMigrations(client);
  console.log('Hosted libSQL database is up to date.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.close());
