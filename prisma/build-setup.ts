import { execFileSync } from 'node:child_process';

if (process.env.VERCEL) {
  console.log(
    'Hosted build: migrations and seed are separate trusted operations; no database writes during build.',
  );
  process.exit(0);
}

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.log('DATABASE_URL is not set; skipping database migration/seed during build.');
  process.exit(0);
}

if (!/^postgres(?:ql)?:\/\//.test(url)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
}

execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});
execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
  stdio: 'inherit',
  env: process.env,
});
console.log('PostgreSQL database migrated and seeded for this build.');
