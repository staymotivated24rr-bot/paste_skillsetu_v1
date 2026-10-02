import { roleCatalog, roleConfig } from './role-catalog';
import { db } from './db';
import { mastery, planGaps, readiness, readinessLabel, scoreAssessment } from './engine';
import { provider } from './provider';
import type { DemoState, Item, LessonContent, Option, Score, Skill, CohortView } from './types';
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function getSkills(roleId = 'data-analyst'): Promise<Skill[]> {
  checkedRole(roleId);
  const rows = await db.roleSkillRequirement.findMany({
    where: { roleId },
    include: { skill: { include: { category: true } } },
  });
  return rows.map((r) => ({
    id: r.skillId,
    name: r.skill.name,
    description: r.skill.description,
    category: r.skill.category.name,
    prerequisites: JSON.parse(r.skill.prerequisites),
    target: r.target,
    importance: r.importance,
  }));
}
function checkedRole(roleId: string) {
  if (!roleCatalog.some((r) => r.id === roleId)) throw new AppError('Unknown target role.');
  return roleConfig(roleId);
}
async function activeRole(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Your demo session has expired. Start a new student demo.', 401);
  return checkedRole(user.selectedRoleId);
}
export async function selectRole(userId: string, roleId: string) {
  checkedRole(roleId);
  await activeRole(userId);
  await db.user.update({ where: { id: userId }, data: { selectedRoleId: roleId } });
}
export async function createStudent(name: string, roleId = 'data-analyst') {
  checkedRole(roleId);
  return db.user.create({ data: { name, selectedRoleId: roleId } });
}
export async function getState(userId: string): Promise<DemoState> {
  const role = await activeRole(userId);
  const roleId = role.id;
  const lessonScope = { skill: { requirements: { some: { roleId } } } };
  const [user, skills, assessments, attempts, lessons, progress, employer] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true } }),
    getSkills(roleId),
    db.assessment.findMany({
      where: { roleId },
      include: {
        scenarios: {
          orderBy: { position: 'asc' },
          include: { questions: { orderBy: { position: 'asc' }, include: { mappings: true } } },
        },
      },
    }),
    db.assessmentAttempt.findMany({
      where: { userId, assessment: { roleId } },
      orderBy: { startedAt: 'asc' },
      include: {
        assessment: true,
        answers: {
          orderBy: [
            { question: { scenario: { position: 'asc' } } },
            { question: { position: 'asc' } },
          ],
          include: { question: true },
        },
        scores: true,
      },
    }),
    db.lesson.findMany({ where: lessonScope }),
    db.lessonProgress.findMany({
      where: { userId, lesson: lessonScope },
      include: { answers: { orderBy: { answeredAt: 'asc' } }, lesson: true },
    }),
    db.employerProfile.findUniqueOrThrow({
      where: { id: role.employerId },
      include: { requirements: true },
    }),
  ]);
  const scenarios = Object.fromEntries(
    assessments.map((a) => [
      a.kind,
      a.scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        stakeholder: s.stakeholder,
        stakeholderRole: s.stakeholderRole,
        company: s.company,
        brief: s.brief,
        data: s.data,
        items: s.questions.map((q) => ({
          id: q.id,
          phase: q.phase,
          prompt: q.prompt,
          context: q.context,
          options: (JSON.parse(q.options) as Option[]).map((o) => ({ text: o.text, response: '' })),
          skills: q.mappings.map((m) => ({ skillId: m.skillId, weight: m.weight })),
        })),
      })),
    ]),
  ) as DemoState['scenarios'];
  return {
    role,
    roles: roleCatalog,
    user,
    skills,
    scenarios,
    attempts: attempts.map((a) => ({
      id: a.id,
      kind: a.assessment.kind,
      status: a.status,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      score: a.score,
      answers: a.answers.map((x) => ({
        questionId: x.questionId,
        selected: x.selected,
        response: (JSON.parse(x.question.options) as Option[])[x.selected].response,
      })),
      scores: a.scores.map((s) => ({ skillId: s.skillId, score: s.score, evidence: s.evidence })),
    })),
    lessons: lessons.map((l) => {
      const content = JSON.parse(l.content) as LessonContent;
      return {
        ...l,
        content: {
          ...content,
          items: content.items.map((i) => ({ id: i.id, prompt: i.prompt, options: i.options })),
        },
      };
    }),
    progress: progress.map((p) => {
      const content = JSON.parse(p.lesson.content) as LessonContent;
      return {
        lessonId: p.lessonId,
        mode: p.mode,
        run: p.run,
        status: p.status,
        answered: p.answers
          .filter((a) => a.run === p.run)
          .map((a) => ({
            itemId: a.itemId,
            selected: a.selected,
            correct: a.correct,
            first: a.first,
            explanation: content.items.find((i) => i.id === a.itemId)?.explanation ?? '',
          })),
      };
    }),
    employer: {
      name: employer.name,
      description: employer.description,
      requirements: employer.requirements.map((r) => ({ skillId: r.skillId, target: r.target })),
    },
  };
}
export async function startAssessment(
  userId: string,
  kind: 'diagnostic' | 'reassessment',
  expectedRoleId?: string,
) {
  const role = await activeRole(userId);
  if (expectedRoleId && role.id !== expectedRoleId)
    throw new AppError('Your target role changed. Refresh before starting an assessment.', 409);
  const assessmentId = role.assessmentIds[kind];
  return db.$transaction(async (tx) => {
    const existing = await tx.assessmentAttempt.findFirst({
      where: { userId, assessmentId, status: 'in_progress' },
    });
    if (existing) return existing.id;
    const baseline = await tx.assessmentAttempt.findFirst({
      where: { userId, assessmentId: role.assessmentIds.diagnostic, status: 'complete' },
    });
    if (kind === 'reassessment' && !baseline)
      throw new AppError('Complete a diagnostic before reassessment.');
    if (kind === 'diagnostic' && baseline)
      throw new AppError(
        'Your baseline is already recorded. Use reassessment to verify current skills.',
      );
    return (await tx.assessmentAttempt.create({ data: { userId, assessmentId } })).id;
  });
}
export async function answerAssessment(
  userId: string,
  attemptId: string,
  questionId: string,
  selected: number,
) {
  const session = await db.user.findUnique({
    where: { id: userId },
    select: { selectedRoleId: true },
  });
  return db.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: true,
        assessment: {
          include: {
            scenarios: {
              orderBy: { position: 'asc' },
              include: { questions: { orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    });
    if (!attempt) throw new AppError('Assessment not found.', 404);
    if (attempt.assessment.roleId !== session?.selectedRoleId)
      throw new AppError(
        'This assessment belongs to another target role. Switch back to continue.',
        409,
      );
    if (attempt.status !== 'in_progress')
      throw new AppError('This assessment has already been submitted.', 409);
    const questions = attempt.assessment.scenarios.flatMap((s) => s.questions);
    const previous = attempt.answers.find((a) => a.questionId === questionId);
    if (previous) {
      if (previous.selected !== selected)
        throw new AppError('Submitted actions cannot be changed.', 409);
      const q = questions.find((q) => q.id === questionId)!;
      return { response: (JSON.parse(q.options) as Option[])[selected].response };
    }
    const q = questions[attempt.answers.length];
    if (!q || q.id !== questionId) throw new AppError('Please complete the actions in order.');
    const options = JSON.parse(q.options) as Option[];
    if (!options[selected]) throw new AppError('Choose a valid response.');
    await tx.assessmentAnswer.create({
      data: {
        attemptId,
        questionId,
        selected,
        correct: q.correct === selected,
        score: q.correct === selected ? 1 : 0,
      },
    });
    return { response: options[selected].response };
  });
}
export async function completeAssessment(userId: string, attemptId: string) {
  const role = await activeRole(userId);
  const skills = await getSkills(role.id);
  return db.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: true,
        assessment: {
          include: { scenarios: { include: { questions: { include: { mappings: true } } } } },
        },
      },
    });
    if (!attempt) throw new AppError('Assessment not found.', 404);
    if (attempt.assessment.roleId !== role.id)
      throw new AppError(
        'This assessment belongs to another target role. Switch back to submit.',
        409,
      );
    if (attempt.status === 'complete') return attemptId;
    const questions = attempt.assessment.scenarios.flatMap((s) => s.questions);
    if (attempt.answers.length !== questions.length)
      throw new AppError('Finish all simulation actions before submitting.');
    const items: Pick<Item, 'id' | 'correct' | 'skills'>[] = questions.map((q) => ({
      id: q.id,
      correct: q.correct,
      skills: q.mappings.map((m) => ({ skillId: m.skillId, weight: m.weight })),
    }));
    const scores = scoreAssessment(items, attempt.answers, skills);
    await tx.skillScore.createMany({ data: scores.map((s) => ({ ...s, attemptId })) });
    await tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: 'complete', completedAt: new Date(), score: readiness(scores, skills) },
    });
    await tx.learningPath.create({
      data: {
        userId,
        attemptId,
        skillIds: JSON.stringify(planGaps(scores, skills).map((g) => g.id)),
      },
    });
    await tx.readinessReport.create({
      data: { attemptId, indicator: readinessLabel(scores, skills) },
    });
    return attemptId;
  });
}
async function roleLesson(userId: string, lessonId: string) {
  const role = await activeRole(userId);
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, skill: { requirements: { some: { roleId: role.id } } } },
  });
  if (!lesson) throw new AppError('Lesson not found for your target role.', 404);
  const baseline = await db.assessmentAttempt.findFirst({
    where: { userId, assessmentId: role.assessmentIds.diagnostic, status: 'complete' },
  });
  if (!baseline) throw new AppError('Take the diagnostic first.');
  return lesson;
}
export async function lessonAction(
  userId: string,
  lessonId: string,
  mode: 'interactive' | 'structured',
  restart = false,
) {
  await roleLesson(userId, lessonId);
  return db.$transaction(async (tx) => {
    const old = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (old)
      return tx.lessonProgress.update({
        where: { id: old.id },
        data: { mode, ...(restart ? { run: old.run + 1, status: 'started' } : {}) },
      });
    return tx.lessonProgress.create({ data: { userId, lessonId, mode } });
  });
}
export async function practiceAction(
  userId: string,
  lessonId: string,
  itemId: string,
  selected?: number,
) {
  const l = await roleLesson(userId, lessonId);
  const content = JSON.parse(l.content) as LessonContent;
  const item = content.items.find((i) => i.id === itemId);
  if (!item) throw new AppError('Practice item not found.', 404);
  if (selected === undefined) return { hint: await provider.hint(item) };
  if (!item.options[selected]) throw new AppError('Choose a valid answer.');
  const explanation = await provider.explain(item);
  return db.$transaction(async (tx) => {
    const progress = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      include: { answers: true },
    });
    if (!progress) throw new AppError('Start the lesson first.');
    const current = progress.answers.filter((a) => a.run === progress.run);
    const first = !current.some((a) => a.itemId === itemId);
    if (first) {
      const next = content.items.find((i) => !current.some((a) => a.itemId === i.id));
      if (next?.id !== itemId) throw new AppError('Complete practice in order.');
    }
    const correct = item.correct === selected;
    const a = await tx.practiceAnswer.create({
      data: { progressId: progress.id, run: progress.run, itemId, selected, correct, first },
    });
    const result = mastery(content.items, [...current, a]);
    await tx.lessonProgress.update({
      where: { id: progress.id },
      data: {
        status: result.mastered ? 'mastered' : result.complete ? 'needs-practice' : 'started',
      },
    });
    return { correct, explanation, mastery: result };
  });
}
export async function cohortState(roleId = 'data-analyst'): Promise<CohortView> {
  const role = checkedRole(roleId);
  const [cohort, skills] = await Promise.all([
    db.cohort.findUniqueOrThrow({
      where: { id: role.cohortId },
      include: { college: true, members: { orderBy: { alias: 'asc' } } },
    }),
    getSkills(roleId),
  ]);
  return {
    role,
    roles: roleCatalog,
    college: cohort.college.name,
    cohort: cohort.name,
    skills,
    members: cohort.members.map((m) => ({
      alias: m.alias,
      diagnosed: m.diagnosed,
      initialScores: JSON.parse(m.initialScores) as Score[],
      currentScores: JSON.parse(m.currentScores) as Score[],
      modulesCompleted: m.modulesCompleted,
      modulesAssigned: m.modulesAssigned,
    })),
  };
}
export async function reviewAttempt(userId: string, attemptId: string) {
  const role = await activeRole(userId);
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, userId, status: 'complete', assessment: { roleId: role.id } },
    include: {
      answers: {
        orderBy: [
          { question: { scenario: { position: 'asc' } } },
          { question: { position: 'asc' } },
        ],
        include: { question: { include: { scenario: true } } },
      },
    },
  });
  if (!attempt) throw new AppError('Submit the assessment before reviewing answers.', 404);
  return attempt.answers.map((a) => ({
    questionId: a.questionId,
    prompt: a.question.prompt,
    scenario: a.question.scenario.title,
    selected: (JSON.parse(a.question.options) as Option[])[a.selected].text,
    correct: a.correct,
    explanation: a.question.explanation,
    answeredAt: a.answeredAt.toISOString(),
  }));
}
