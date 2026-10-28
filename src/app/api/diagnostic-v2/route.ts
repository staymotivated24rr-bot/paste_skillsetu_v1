import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import {
  loadDiagnostic,
  startDiagnostic,
  submitDiagnostic,
  reviewDiagnostic,
} from '@/lib/diagnostic/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookie = 'skillsetu-adaptive';
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function fail(error: unknown) {
  if (error instanceof AppError) return response({ error: error.message }, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return response({ error: 'Check your response and try again.' }, 400);
  console.error(
    'Adaptive diagnostic request failed',
    error instanceof Error ? error.name : 'Unknown error',
  );
  return response({ error: 'Unable to save. Your saved progress is safe; try again.' }, 500);
}
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }).strict(),
  z
    .object({
      action: z.literal('answer'),
      id: z.uuid(),
      revision: z.number().int().nonnegative(),
      itemId: z.string().min(1).max(100),
      answer: z
        .object({
          selected: z.number().int().min(0).max(10).optional(),
          text: z.string().max(4000).optional(),
          order: z.array(z.string().max(50)).max(10).optional(),
        })
        .strict(),
    })
    .strict(),
]);
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(cookie)?.value;
    if (!token) return response({ session: null });
    return response(
      req.nextUrl.searchParams.get('review') === '1'
        ? await reviewDiagnostic(token)
        : await loadDiagnostic(token),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    // Require browser-origin matching, including scheme; no ambient-cookie cross-site writes.
    const origin = req.headers.get('origin');
    let originUrl: URL | null = null;
    try {
      if (origin) originUrl = new URL(origin);
    } catch {}
    if (
      !originUrl ||
      originUrl.host !== req.headers.get('host') ||
      originUrl.protocol !== req.nextUrl.protocol
    )
      throw new AppError('Use the diagnostic page to submit responses.', 403);
    if (Number(req.headers.get('content-length') ?? 0) > 8192)
      throw new AppError('Request too large.', 413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 8192) throw new AppError('Request too large.', 413);
    const body = schema.parse(JSON.parse(raw));
    const token = req.cookies.get(cookie)?.value;
    if (body.action === 'start') {
      if (token) {
        try {
          return response(await loadDiagnostic(token));
        } catch (e) {
          if (!(e instanceof AppError && e.status === 401)) throw e;
        }
      }
      const created = await startDiagnostic();
      const result = response(created.view);
      result.cookies.set(cookie, created.token, {
        httpOnly: true,
        secure: req.nextUrl.protocol === 'https:',
        sameSite: 'strict',
        path: '/api/diagnostic-v2',
        maxAge: 30 * 86400,
      });
      return result;
    }
    return response(
      await submitDiagnostic(token ?? '', body.id, body.revision, body.itemId, body.answer),
    );
  } catch (e) {
    return fail(e);
  }
}
