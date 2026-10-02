import { db } from '../src/lib/db';
import { skills, employerTargets } from '../src/lib/skills';
import { diagnostic, reassessment } from '../src/lib/simulations';
import { lessons } from '../src/lib/lessons';

async function main() {
  await db.$transaction(
    async (tx) => {
      await tx.role.upsert({
        where: { id: 'data-analyst' },
        create: {
          id: 'data-analyst',
          name: 'Data Analyst',
          description: 'Turn messy information into clear, decision-ready evidence.',
        },
        update: { name: 'Data Analyst' },
      });
      for (const category of new Set(skills.map((s) => s.category)))
        await tx.skillCategory.upsert({
          where: { id: category },
          create: { id: category, name: category },
          update: { name: category },
        });
      for (const s of skills) {
        const data = {
          name: s.name,
          description: s.description,
          categoryId: s.category,
          prerequisites: JSON.stringify(s.prerequisites),
        };
        await tx.skillNode.upsert({
          where: { id: s.id },
          create: { id: s.id, ...data },
          update: data,
        });
        await tx.roleSkillRequirement.upsert({
          where: { roleId_skillId: { roleId: 'data-analyst', skillId: s.id } },
          create: {
            roleId: 'data-analyst',
            skillId: s.id,
            target: s.target,
            importance: s.importance,
          },
          update: { target: s.target, importance: s.importance },
        });
      }
      for (const [kind, simulations] of Object.entries({ diagnostic, reassessment })) {
        await tx.assessment.upsert({
          where: { id: kind },
          create: { id: kind, roleId: 'data-analyst', kind },
          update: { kind },
        });
        for (const [position, s] of simulations.entries()) {
          const { items, ...scenario } = s;
          await tx.scenario.upsert({
            where: { id: s.id },
            create: { ...scenario, assessmentId: kind, position },
            update: { ...scenario, position },
          });
          for (const [i, q] of items.entries()) {
            const { skills: mappings, options, ...item } = q;
            const data = {
              ...item,
              options: JSON.stringify(options),
              scenarioId: s.id,
              position: i,
            };
            await tx.assessmentQuestion.upsert({ where: { id: q.id }, create: data, update: data });
            await tx.questionSkillMapping.deleteMany({ where: { questionId: q.id } });
            for (const m of mappings)
              await tx.questionSkillMapping.create({ data: { questionId: q.id, ...m } });
          }
        }
      }
      for (const l of lessons) {
        const data = { ...l, content: JSON.stringify(l.content) };
        await tx.lesson.upsert({ where: { id: l.id }, create: data, update: data });
      }
      await tx.employerProfile.upsert({
        where: { id: 'sample-employer' },
        create: {
          id: 'sample-employer',
          roleId: 'data-analyst',
          name: 'Example analytics team',
          description:
            'Fictional entry-level analyst profile. No employer endorsement or interview offer.',
        },
        update: {},
      });
      for (const s of skills)
        await tx.employerSkillRequirement.upsert({
          where: { profileId_skillId: { profileId: 'sample-employer', skillId: s.id } },
          create: { profileId: 'sample-employer', skillId: s.id, target: employerTargets[s.id] },
          update: { target: employerTargets[s.id] },
        });
      await tx.college.upsert({
        where: { id: 'demo-college' },
        create: { id: 'demo-college', name: 'Setu Institute of Technology · fictional' },
        update: {},
      });
      await tx.cohort.upsert({
        where: { id: 'demo-cohort' },
        create: {
          id: 'demo-cohort',
          collegeId: 'demo-college',
          name: 'Final-year engineering · demo cohort',
        },
        update: {},
      });
      for (let i = 0; i < 30; i++) {
        const diagnosed = i < 26;
        const initialScores = skills.map((s, j) => ({
          skillId: s.id,
          score: diagnosed ? Math.min(100, 25 + ((i * 13 + j * 17) % 61)) : 0,
          evidence: diagnosed ? 3 : 0,
        }));
        const currentScores = initialScores.map((s, j) => ({
          ...s,
          score: diagnosed
            ? Math.max(
                i % 6 === 5 ? skills[j].target : 0,
                Math.max(0, Math.min(100, s.score + (i % 7 === 0 ? -8 : 10 + ((i + j) % 25)))),
              )
            : 0,
        }));
        const modulesAssigned = initialScores.filter((s, j) => s.score < skills[j].target).length;
        const modulesCompleted = diagnosed ? Math.min(modulesAssigned, 2 + (i % 7)) : 0;
        const data = {
          cohortId: 'demo-cohort',
          alias: `Demo student ${String(i + 1).padStart(2, '0')}`,
          diagnosed,
          initialScores: JSON.stringify(initialScores),
          currentScores: JSON.stringify(currentScores),
          modulesAssigned: diagnosed ? modulesAssigned : 0,
          modulesCompleted,
        };
        await tx.cohortMember.upsert({
          where: { id: `cohort-${i}` },
          create: { id: `cohort-${i}`, ...data },
          update: data,
        });
      }
    },
    { timeout: 60000 },
  );
  console.log(
    'Seeded 16 skills, 3 diagnostic + 3 alternate simulations (48 actions), 16 lessons (64 practice items), and 30 fictional cohort members. Existing demo sessions preserved.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
