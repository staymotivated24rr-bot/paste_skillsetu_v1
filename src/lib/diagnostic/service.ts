import { createHash, randomBytes } from 'node:crypto';
import type { AdaptiveAttempt, Prisma } from '@prisma/client';
import { db } from '../db';
import { AppError } from '../errors';
import { pythonAdaptiveBank, unmeasuredPythonSkills } from './python-bank';
import {
  grade,
  projectItem,
  selectNext,
  summarize,
  learningOrder,
  stopReason,
  policyVersion,
} from './engine';
import type { Bank, Evidence, Selection, Answer, DiagnosticView } from './types';
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function sessionFor(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError('Start a diagnostic to continue.', 401);
  const session = await db.adaptiveSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.expiresAt.getTime() <= Date.now())
    throw new AppError('This diagnostic session has expired.', 401);
  return session;
}
export async function startDiagnostic() {
  const token = randomBytes(32).toString('hex');
  const session = await db.adaptiveSession.create({
    data: {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 86400000),
      attempt: {
        create: {
          roleId: pythonAdaptiveBank.roleId,
          bankVersion: pythonAdaptiveBank.version,
          policyVersion,
          snapshot: json(pythonAdaptiveBank),
          evidence: [],
          selection: json(selectNext(pythonAdaptiveBank, [])),
        },
      },
    },
    include: { attempt: true },
  });
  return { token, view: view(session.attempt!) };
}
export function view(attempt: AdaptiveAttempt): DiagnosticView {
  const bank = attempt.snapshot as unknown as Bank,
    evidence = attempt.evidence as unknown as Evidence[],
    selection = attempt.selection as unknown as Selection | null;
  const rows = summarize(bank, evidence),
    complete = attempt.status === 'complete';
  return {
    id: attempt.id,
    revision: attempt.revision,
    status: attempt.status,
    role: 'Python Developer',
    bankVersion: attempt.bankVersion,
    answered: evidence.length,
    min: bank.min,
    target: bank.target,
    max: bank.max,
    question:
      !complete && selection
        ? projectItem(bank.items.find((i) => i.id === selection.itemId)!)
        : null,
    rationale: selection?.rationale ?? '',
    feedback: evidence.length
      ? 'Response saved. The next task adapts to your evidence. Detailed feedback is held until completion to reduce coaching effects.'
      : null,
    report: complete
      ? {
          competencies: rows,
          learningOrder: learningOrder(rows),
          stopReason: stopReason(bank, evidence)!,
          unmeasured: unmeasuredPythonSkills,
        }
      : null,
  };
}
export async function loadDiagnostic(token: string) {
  const session = await sessionFor(token);
  const attempt = await db.adaptiveAttempt.findUnique({ where: { sessionId: session.id } });
  if (!attempt) throw new AppError('Diagnostic not found.', 404);
  return view(attempt);
}
export async function submitDiagnostic(
  token: string,
  id: string,
  revision: number,
  itemId: string,
  answer: Answer,
) {
  const session = await sessionFor(token);
  return db.$transaction(async (tx) => {
    const attempt = await tx.adaptiveAttempt.findFirst({ where: { id, sessionId: session.id } });
    if (!attempt) throw new AppError('Diagnostic not found.', 404);
    const evidence = attempt.evidence as unknown as Evidence[],
      bank = attempt.snapshot as unknown as Bank;
    const previous = evidence.find((e) => e.itemId === itemId);
    // A lost-response retry is idempotent; an edited old response is rejected.
    if (previous) {
      if (JSON.stringify(previous.answer) !== JSON.stringify(answer))
        throw new AppError('This response is already sealed.', 409);
      return view(attempt);
    }
    if (attempt.status !== 'in_progress' || attempt.revision !== revision)
      throw new AppError('Progress changed. Reload to resume.', 409);
    const selection = attempt.selection as unknown as Selection;
    if (selection.itemId !== itemId) throw new AppError('Answer the current task.', 409);
    const item = bank.items.find((i) => i.id === itemId)!;
    let earned: boolean;
    try {
      earned = grade(item, answer);
    } catch (e) {
      throw new AppError(e instanceof Error ? e.message : 'Invalid answer.');
    }
    const nextEvidence = [
      ...evidence,
      { itemId, answer, earned, rationale: selection.rationale, at: new Date().toISOString() },
    ];
    const next = selectNext(bank, nextEvidence);
    const changed = await tx.adaptiveAttempt.updateMany({
      where: { id, revision, status: 'in_progress' },
      data: {
        evidence: json(nextEvidence),
        selection: json(next),
        revision: { increment: 1 },
        status: next ? 'in_progress' : 'complete',
        completedAt: next ? null : new Date(),
      },
    });
    if (!changed.count) throw new AppError('Progress changed. Reload to resume.', 409);
    return view(await tx.adaptiveAttempt.findUniqueOrThrow({ where: { id } }));
  });
}
export async function reviewDiagnostic(token: string) {
  const session = await sessionFor(token);
  const attempt = await db.adaptiveAttempt.findUniqueOrThrow({ where: { sessionId: session.id } });
  if (attempt.status !== 'complete')
    throw new AppError('Complete the diagnostic before reviewing.', 409);
  const bank = attempt.snapshot as unknown as Bank;
  return (attempt.evidence as unknown as Evidence[]).map((e) => {
    const item = bank.items.find((i) => i.id === e.itemId)!;
    return {
      itemId: e.itemId,
      prompt: item.prompt,
      earned: e.earned,
      explanation: item.explanation,
      signal: e.earned ? 'Demonstrated on this task' : item.misconception,
    };
  });
}
