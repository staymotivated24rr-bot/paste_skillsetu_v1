import { NextResponse } from 'next/server';
import { configuredDatabaseUrl, deploymentDatabaseIssue } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const issue = deploymentDatabaseIssue();
  return NextResponse.json(
    {
      ok: !issue,
      database: configuredDatabaseUrl().startsWith('file:') ? 'local-sqlite' : 'hosted-libsql',
      ...(issue ? { issue } : {}),
    },
    {
      status: issue ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
