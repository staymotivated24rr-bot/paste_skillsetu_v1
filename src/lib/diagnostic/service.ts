import { createHash, randomBytes } from 'node:crypto';
import type { DiagnosticRun, DiagnosticResponse, Prisma } from '@prisma/client';
import { db } from '../db';
import { AppError } from '../errors';
import { pythonDiagnostic } from './python-bank';
import {
  answerSchema,
  ENGINE_VERSION,
  grade,
  makeReport,
  publicQuestion,
  selectNext,
  validateBank,
} from './engine';
import type { Answer, Bank, Report, RunView } from './types';
export const SESSION_COOKIE = 'skillsetu-diagnostic';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function enter(name: string) {
  const token = randomBytes(32).toString('base64url');
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, selectedRoleId: 'python-developer' } });
    await tx.diagnosticSession.create({
      data: {
        tokenHash: digest(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
  });
  return token;
}
export async function sessionFor(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('Enter the diagnostic pilot to continue.', 401);
  const session = await db.diagnosticSession.findUnique({ where: { tokenHash: digest(token) } });
  if (!session || session.expiresAt <= new Date())
    throw new AppError('Your pilot session expired. Enter again to continue.', 401);
  return session;
}
type StoredRun = DiagnosticRun & { responses: DiagnosticResponse[] };
function bankFor(run: DiagnosticRun): Bank {
  if (run.engineVersion !== ENGINE_VERSION || digest(run.bankSnapshot) !== run.bankDigest)
    throw new AppError('This assessment version needs recovery. Your answers are preserved.', 409);
  return JSON.parse(run.bankSnapshot) as Bank;
}
function view(run: StoredRun): RunView {
  const bank = bankFor(run),
    current = bank.questions.find((q) => q.id === run.currentQuestionId);
  const last = run.responses.at(-1);
  return {
    id: run.id,
    status: run.status,
    bankId: run.bankId,
    role: bank.roleName,
    answered: run.responses.length,
    minimum: bank.policy.minimum,
    target: bank.policy.target,
    maximum: bank.policy.maximum,
    competencies: bank.competencies.map((c) => ({
      id: c.id,
      name: c.name,
      count: run.responses.filter(
        (r) => bank.questions.find((q) => q.id === r.questionId)!.competencyId === c.id,
      ).length,
    })),
    current: current ? publicQuestion(current) : null,
    rationale: run.currentRationale,
    hint: run.hintUsed && current ? current.hint : null,
    draft: JSON.parse(run.draft) as Answer,
    lastFeedback: last
      ? { questionId: last.questionId, correct: last.correct, assisted: last.assisted }
      : null,
    report: run.report ? (JSON.parse(run.report) as Report) : null,
  };
}
export async function getRun(sessionId: string, runId?: string) {
  const run = await db.diagnosticRun.findFirst({
    where: { sessionId, ...(runId ? { id: runId } : {}) },
    orderBy: { startedAt: 'desc' },
    include: { responses: { orderBy: { position: 'asc' } } },
  });
  if (runId && !run) throw new AppError('Assessment not found.', 404);
  return run ? view(run) : null;
}
export async function startRun(sessionId: string, restart = false) {
  validateBank(pythonDiagnostic);
  const id = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DiagnosticSession" WHERE id = ${sessionId} FOR UPDATE`;
    const existing = await tx.diagnosticRun.findFirst({
      where: { sessionId },
      orderBy: { startedAt: 'desc' },
    });
    if (existing && (existing.status === 'in_progress' || !restart)) return existing.id;
    const bankSnapshot = JSON.stringify(pythonDiagnostic),
      selection = selectNext(pythonDiagnostic, []);
    const published = await tx.assessmentBank.upsert({
      where: { id: pythonDiagnostic.id },
      update: {},
      create: {
        id: pythonDiagnostic.id,
        roleId: pythonDiagnostic.roleId,
        kind: 'adaptive-diagnostic',
        version: pythonDiagnostic.version,
        contentVersion: pythonDiagnostic.version,
        content: bankSnapshot,
        digest: digest(bankSnapshot),
      },
    });
    if (published.digest !== digest(bankSnapshot) || published.content !== bankSnapshot)
      throw new AppError('Published diagnostic content changed. Publish a new bank version.', 409);
    if (existing?.report) {
      const prior = JSON.parse(existing.report) as Report;
      const gap =
        prior.findings.find((f) => f.status === 'Likely gap') ??
        prior.findings.find((f) => f.status === 'Insufficient evidence');
      if (gap) {
        const question = pythonDiagnostic.questions.find(
          (q) => q.competencyId === gap.competencyId && q.difficulty === 2,
        )!;
        selection.questionId = question.id;
        selection.rationale = `Begin a fresh reassessment at previously unresolved ${gap.name}. Prior results supply routing only, never proficiency credit. Fixed-bank familiarity limits this comparison.`;
      }
    }
    return (
      await tx.diagnosticRun.create({
        data: {
          sessionId,
          roleId: pythonDiagnostic.roleId,
          bankId: pythonDiagnostic.id,
          engineVersion: ENGINE_VERSION,
          bankSnapshot,
          bankDigest: digest(bankSnapshot),
          currentQuestionId: selection.questionId,
          currentRationale: selection.rationale,
        },
      })
    ).id;
  });
  return (await getRun(sessionId, id))!;
}
async function owned(tx: Prisma.TransactionClient, sessionId: string, runId: string) {
  // Include ownership in the lock query: an arbitrary ID cannot lock another learner's row.
  await tx.$queryRaw`SELECT id FROM "DiagnosticRun" WHERE id = ${runId} AND "sessionId" = ${sessionId} FOR UPDATE`;
  const run = await tx.diagnosticRun.findFirst({
    where: { id: runId, sessionId },
    include: { responses: { orderBy: { position: 'asc' } } },
  });
  if (!run) throw new AppError('Assessment not found.', 404);
  return run;
}
export async function respond(sessionId: string, runId: string, questionId: string, raw: Answer) {
  return db.$transaction(async (tx) => {
    const run = await owned(tx, sessionId, runId),
      bank = bankFor(run);
    const question = bank.questions.find((q) => q.id === questionId);
    if (!question) throw new AppError('Question not found.', 404);
    const result = grade(question, raw),
      serialized = JSON.stringify(result.payload);
    const existing = run.responses.find((r) => r.questionId === questionId);
    if (existing) {
      if (existing.payload !== serialized)
        throw new AppError('A submitted answer cannot be changed.', 409);
      return view(run); // Exact transport retry is safe, including the final answer.
    }
    if (run.status !== 'in_progress' || run.currentQuestionId !== questionId)
      throw new AppError('This question is no longer active. Resume your assessment.', 409);
    const response = await tx.diagnosticResponse.create({
      data: {
        runId,
        questionId,
        position: run.responses.length,
        payload: serialized,
        correct: result.correct,
        assisted: run.hintUsed,
        misconception: result.correct ? null : question.misconception,
        rationale: run.currentRationale,
      },
    });
    const responses = [...run.responses, response],
      selection = selectNext(bank, responses);
    const completed = !selection.questionId;
    const updated = await tx.diagnosticRun.update({
      where: { id: runId },
      data: {
        currentQuestionId: selection.questionId,
        currentRationale: selection.rationale,
        hintUsed: false,
        draft: '{}',
        status: completed ? 'completed' : 'in_progress',
        completedAt: completed ? new Date() : null,
        report: completed ? JSON.stringify(makeReport(bank, responses, selection.rationale)) : null,
      },
    });
    return view({ ...updated, responses });
  });
}
export async function saveInteraction(
  sessionId: string,
  runId: string,
  questionId: string,
  action: 'draft' | 'hint',
  answer?: Answer,
) {
  return db.$transaction(async (tx) => {
    const run = await owned(tx, sessionId, runId);
    if (run.status !== 'in_progress' || run.currentQuestionId !== questionId)
      throw new AppError('This question is no longer active. Resume your assessment.', 409);
    const draft = action === 'draft' ? JSON.stringify(answerSchema.parse(answer)) : run.draft;
    const updated = await tx.diagnosticRun.update({
      where: { id: runId },
      data: { draft, hintUsed: run.hintUsed || action === 'hint' },
    });
    return view({ ...updated, responses: run.responses });
  });
}
