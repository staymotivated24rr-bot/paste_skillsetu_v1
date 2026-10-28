import { afterAll, beforeAll, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { db } from '../src/lib/db';
import {
  startDiagnostic,
  loadDiagnostic,
  submitDiagnostic,
  reviewDiagnostic,
} from '../src/lib/diagnostic/service';
import { pythonAdaptiveBank } from '../src/lib/diagnostic/python-bank';
beforeAll(() =>
  execFileSync(process.execPath, ['scripts/test-database-setup.mjs'], {
    env: process.env,
    stdio: 'pipe',
  }),
);
afterAll(() => db.$disconnect());
it('persists, isolates ownership, seals answers, handles retries and generates an honest report', async () => {
  const a = await startDiagnostic(),
    b = await startDiagnostic();
  let view = a.view;
  const first = view.question!,
    answer = { selected: 0 };
  await expect(submitDiagnostic(b.token, view.id, 0, first.id, answer)).rejects.toThrow(
    'not found',
  );
  await expect(reviewDiagnostic(a.token)).rejects.toThrow('Complete');
  await expect(submitDiagnostic(a.token, view.id, 0, 'future-question', answer)).rejects.toThrow(
    'current',
  );
  view = await submitDiagnostic(a.token, view.id, 0, first.id, answer);
  expect(await loadDiagnostic(a.token)).toEqual(view);
  expect(await submitDiagnostic(a.token, view.id, 0, first.id, answer)).toEqual(view);
  await expect(submitDiagnostic(a.token, view.id, 0, first.id, { selected: 1 })).rejects.toThrow(
    'sealed',
  );
  while (view.question) {
    const item = pythonAdaptiveBank.items.find((i) => i.id === view.question!.id)!;
    const response = item.options
      ? { selected: item.correct }
      : item.order
        ? { order: item.order }
        : { text: item.accepted?.[0] ?? item.concepts!.map((g) => g[0]).join(' ') };
    view = await submitDiagnostic(a.token, view.id, view.revision, item.id, response);
  }
  expect(view.status).toBe('complete');
  expect(view.report!.competencies.every((r) => r.count >= 3)).toBe(true);
  expect(view.report!.unmeasured).toHaveLength(11);
  expect((await reviewDiagnostic(a.token)).length).toBe(view.answered);
  const stored = await db.adaptiveAttempt.findUniqueOrThrow({ where: { id: view.id } });
  expect(stored.policyVersion).toBe('rule-policy-1');
  expect(stored.snapshot).toMatchObject({ id: 'python-adaptive-2' });
});
it('protects score integrity under concurrent submissions', async () => {
  const { token, view } = await startDiagnostic();
  const results = await Promise.allSettled([
    submitDiagnostic(token, view.id, 0, view.question!.id, { selected: 0 }),
    submitDiagnostic(token, view.id, 0, view.question!.id, { selected: 1 }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect((await loadDiagnostic(token)).answered).toBe(1);
});
it('rejects unknown and expired session tokens', async () => {
  await expect(loadDiagnostic('bad')).rejects.toThrow('Start');
  const { token } = await startDiagnostic();
  await db.adaptiveSession.updateMany({
    where: { attempt: { is: { id: (await loadDiagnostic(token)).id } } },
    data: { expiresAt: new Date(0) },
  });
  await expect(loadDiagnostic(token)).rejects.toThrow('expired');
});

it('resumes and grades archived snapshots independently of the current authored bank', async () => {
  const { token, view } = await startDiagnostic();
  const archived = structuredClone(pythonAdaptiveBank);
  archived.id = 'archived-fixture';
  archived.version = 'archived-0';
  const current = archived.items.find((item) => item.id === view.question!.id)!;
  const selected = (current.correct! + 1) % 3;
  current.correct = selected;
  current.options![selected] = 'Archived response wording';
  await db.adaptiveAttempt.update({
    where: { id: view.id },
    data: { bankVersion: archived.version, snapshot: JSON.parse(JSON.stringify(archived)) },
  });
  const resumed = await loadDiagnostic(token);
  expect(resumed.bankVersion).toBe('archived-0');
  expect(resumed.question!.options).toContain('Archived response wording');
  await submitDiagnostic(token, view.id, 0, current.id, { selected });
  const saved = await db.adaptiveAttempt.findUniqueOrThrow({ where: { id: view.id } });
  expect(saved.evidence).toMatchObject([{ earned: true }]);
  expect(pythonAdaptiveBank.items.find((item) => item.id === current.id)!.correct).not.toBe(
    selected,
  );
});
