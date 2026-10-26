import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import {
  enter,
  sessionFor,
  startRun,
  getRun,
  respond,
  saveInteraction,
} from '../src/lib/diagnostic/service';
import { pythonDiagnostic as bank } from '../src/lib/diagnostic/python-bank';
import type { Answer, RunView } from '../src/lib/diagnostic/types';
let sid: string, other: string;
beforeAll(async () => {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
  sid = (await sessionFor(await enter('Adaptive integration'))).id;
  other = (await sessionFor(await enter('Another learner'))).id;
});
afterAll(() => db.$disconnect());
function correct(run: RunView): Answer {
  const q = bank.questions.find((q) => q.id === run.current!.id)!;
  return q.options
    ? { selected: q.correct }
    : q.steps
      ? { order: q.order }
      : { text: q.expected![0] };
}
it('uses opaque expiring sessions, never a user ID as a bearer token', async () => {
  const token = await enter('Token check'),
    session = await sessionFor(token);
  expect(token.length).toBe(43);
  expect(session.tokenHash).not.toContain(token);
  await expect(sessionFor(session.userId)).rejects.toThrow('Enter');
  await expect(sessionFor('x'.repeat(43))).rejects.toThrow('expired');
  await db.diagnosticSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(0) },
  });
  await expect(sessionFor(token)).rejects.toThrow('expired');
});
it('serializes starts and verifies ownership for reads, submissions, hints and drafts', async () => {
  const runs = await Promise.all([startRun(sid), startRun(sid)]);
  expect(runs[0].id).toBe(runs[1].id);
  const run = runs[0],
    qid = run.current!.id;
  await expect(getRun(other, run.id)).rejects.toThrow('not found');
  await expect(respond(other, run.id, qid, correct(run))).rejects.toThrow('not found');
  await expect(saveInteraction(other, run.id, qid, 'hint')).rejects.toThrow('not found');
  await expect(saveInteraction(other, run.id, qid, 'draft', {})).rejects.toThrow('not found');
  await expect(respond(sid, run.id, 'values-trace-1', { text: '3' })).rejects.toThrow(
    'no longer active',
  );
  expect(run).not.toHaveProperty('bankSnapshot');
  expect(run.current).not.toHaveProperty('expected');
});
it('persists drafts and process hints, handles concurrent duplicate submissions atomically', async () => {
  const run = (await getRun(sid))!,
    answer = correct(run),
    qid = run.current!.id;
  await saveInteraction(sid, run.id, qid, 'draft', answer);
  expect((await getRun(sid))!.draft).toEqual(answer);
  await saveInteraction(sid, run.id, qid, 'hint');
  expect((await getRun(sid))!.hint).toBeTruthy();
  const result = await Promise.all([
    respond(sid, run.id, qid, answer),
    respond(sid, run.id, qid, answer),
  ]);
  expect(result.every((r) => r.answered === 1)).toBe(true);
  expect(result[0].lastFeedback?.assisted).toBe(true);
  expect(await db.diagnosticResponse.count({ where: { runId: run.id } })).toBe(1);
  await expect(respond(sid, run.id, qid, { text: 'incorrect' })).rejects.toThrow(
    'cannot be changed',
  );
  await expect(saveInteraction(sid, run.id, qid, 'draft', answer)).rejects.toThrow(
    'no longer active',
  );
});
it('seals an evidence report and preserves history, published content and legacy records', async () => {
  const learner = await db.user.create({ data: { name: 'Legacy sentinel', id: randomUUID() } });
  const before = await db.assessmentAttempt.count();
  let run = (await getRun(sid))!;
  while (run.current) run = await respond(sid, run.id, run.current.id, correct(run));
  expect(run.status).toBe('completed');
  expect(run.answered).toBeGreaterThanOrEqual(18);
  expect(run.report!.findings.every((f) => f.count >= 3)).toBe(true);
  expect(run.report!.evidence).toHaveLength(run.answered);
  expect(run.report!.evidence[0]).not.toHaveProperty('runId');
  expect(run.report!.evidence[0]).not.toHaveProperty('payload');
  const stored = await getRun(sid, run.id);
  expect(stored!.report).toEqual(run.report);
  const last = await db.diagnosticResponse.findFirstOrThrow({
    where: { runId: run.id },
    orderBy: { position: 'desc' },
  });
  expect((await respond(sid, run.id, last.questionId, JSON.parse(last.payload))).report).toEqual(
    run.report,
  );
  const restarted = await startRun(sid, true);
  expect(restarted.id).not.toBe(run.id);
  expect(restarted.answered).toBe(0);
  expect((await getRun(sid, run.id))!.report).toEqual(run.report);
  expect(await db.assessmentAttempt.count()).toBe(before);
  expect(await db.user.findUnique({ where: { id: learner.id } })).not.toBeNull();
  const published = await db.assessmentBank.findUniqueOrThrow({ where: { id: bank.id } });
  expect(JSON.parse(published.content).id).toBe(bank.id);
  const storedRun = await db.diagnosticRun.findUniqueOrThrow({ where: { id: restarted.id } });
  await db.diagnosticRun.update({ where: { id: restarted.id }, data: { bankDigest: 'tampered' } });
  await expect(getRun(sid, restarted.id)).rejects.toThrow('version needs recovery');
  await db.diagnosticRun.update({
    where: { id: restarted.id },
    data: { bankDigest: storedRun.bankDigest },
  });
});
