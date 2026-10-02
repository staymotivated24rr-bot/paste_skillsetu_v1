# Architecture and measured evidence

## Runtime

Next.js App Router monolith: one responsive client workspace, a small Node API, pure scoring functions, and Prisma with an engine-free SQLite/libSQL adapter (local files or configured hosted storage). The client never receives assessment keys or future stakeholder replies. Server route validation uses Zod and enforces session ownership, action ordering, valid choices, and same-host browser submissions.

Source map:

- `src/lib/skills.ts`: preserved Data Analyst 16-node graph, targets, importance, prerequisites, example employer thresholds.
- `src/lib/simulations.ts`: three diagnostic scenarios and three alternate reassessment scenarios; eight scored actions each.
- `src/lib/lessons.ts`: one original micro-lesson per skill; shared learning objectives in interactive/structured modes; four graded practice items each.
- `src/lib/engine.ts`: weighted scoring, gap planning, readiness, before/after and mastery functions.
- `src/lib/service.ts`: relational persistence, transactions, safe public projections, original baseline and latest reassessment.
- `src/lib/provider.ts`: local hints/explanations plus an injectable provider with deterministic fallback on failure.
- `src/app/api/demo/route.ts`: validated student actions and public fictional-cohort reads.
- `src/components`: workspace, simulation runner, lessons, reports and cohort dashboard.
- `prisma/schema.prisma`: schema; `prisma/migrations`: immutable checked-in SQL; `prisma/migrate.ts`: offline migration runner with checksums and atomic transactions.

## Workplace simulations

Diagnostic cases: retailer revenue decline, checkout experiment, and support queue briefing. Reassessment cases: subscription credits, notification experiment with a harm guardrail, and warehouse performance.

Each case follows clarify → query/clean/describe → analyze → interpret/decide → brief. The learner chooses structured text actions rather than chatting freely. Clarification options trigger different stakeholder responses. All choices still reveal the essential agreed definition, so a poor initial clarification does not make later items impossible. The submitted action is graded once and cannot be changed; stakeholder dialogue continues the case without inflating a score. No 3D, voice, AI roleplay, live code execution, or external API.

The observable workplace rubric:

- Requirement clarification: recognizes a business decision, metric, population, comparison period and constraints.
- Communication: selects a brief with a measured finding, honest uncertainty, and a useful next action.
- Analytical reasoning: distinguishes association from causal evidence and chooses decision-relevant investigations.
- Technical skills: chooses correct SQL, spreadsheet or pandas operations at the right grain.
- Statistics/probability: calculates or interprets rates, summaries, intervals and pre-agreed tests in context.

The rubric evaluates recognition in structured choices. It does **not** prove the learner can independently write production SQL or compose a complete stakeholder brief. That is a future validation/authoring extension.

## Scoring

An action is 1 if its selected option matches the authored rubric and 0 otherwise. For skill `s`:
`proficiency = round(100 × sum(correct × mapping weight) / sum(mapping weight))`.
Every skill is mapped in both assessment banks. Evidence density remains limited; report evidence counts alongside proficiency. A shared action contributes to each explicitly mapped skill. Evidence count is shown beside scores. No arbitrary demo points or automatic improvement.

Role readiness is the importance-weighted average of skill proficiency, rounded to an integer. Categories: <45 significant development; 45–74 developing; 75+ near role-ready **unless every individual role target is met**, in which case the label is “Meets prototype readiness threshold.” A high average alone cannot pass a weak essential skill. Employer matching uses each skill's independent example-employer target.

The first completed diagnostic remains baseline. Current evidence is the latest completed assessment, including a poorer reassessment. Partial attempts are excluded. Practice mastery never overwrites diagnostic or reassessment evidence. Stored answers, scores, learning path and report references are linked to an attempt, with completion writes inside one transaction.

## Gap plan and personalization

Include only skills below the role target. Rank independent skills by `(target − current) × importance`, then order unmet prerequisites before dependent gaps with a duplicate-free topological traversal. Expose prerequisite names and the reason for each recommendation. Completed/mastered lessons show their status; first-response practice mistakes expose feedback and hints, and a new run can verify mastery after review.

The same four practice items support both modes. At least three correct first responses **and** a correct final application are needed for mastery. Repeated attempts on the same item do not alter the first-response result. Each new run has a separate history; repeated runs currently reuse a fixed bank. Completion can regress to “needs practice” on a weaker new run, which is shown honestly.

## Data model and future growth

Role, SkillCategory, SkillNode, role requirements, assessment templates, scenarios, questions and weighted mappings describe content. User, attempts, answers, scores, learning paths, progress/practice answers and report snapshots describe evidence. College/Cohort/CohortMember holds explicitly fictional fixture summaries independently of student sessions. EmployerProfile and employer requirements demonstrate role comparison.

Future employers and openings should reference requirement profiles; interviews/referrals should reference an opening, learner and evidence snapshot. Do not treat today's fictional profiles as jobs or referrals. PostgreSQL migration needs a provider/driver change and PostgreSQL migration SQL; scalar fields, IDs and relational model intentionally avoid SQLite-specific application queries. JSON is serialized into text for portable content payloads.

## Security and operational limits

Demo UUID cookies are HttpOnly and SameSite=Lax; ownership is checked on student operations. This is demo access, not verified identity, college authorization or enterprise authentication. The cohort is public fictional data. The application does not need email, real names, API keys, or secrets. React renders text without raw HTML. SQLite and content keys are server-side.

Local files and fixed banks are appropriate for a demo, not production multi-tenant deployment. Before collecting real student data add real authentication, officer authorization, consent/retention policy, rate limiting, content versioning and assessment integrity controls. Seed content updates in place, so freeze/version items before a real longitudinal study. Preserve `.env` and database privacy. The app has no billing or external sending features.

## Multi-role extension

`role-catalog.ts` is safe public metadata: role name, description, work, duration, categories and template/profile/cohort IDs. `tracks/index.ts` registers that metadata with server-side Data Analyst banks and original developer banks. Python has 17 nodes, Java 18, Data Analyst 16. Each role has its own 24-action diagnostic, different 24-action reassessment, one four-check lesson per skill, fictional employer requirements and fictional cohort.

Developer topic definitions supply concept, intuition, worked example, summary and four authored checks through shared authoring helpers. The fourth check applies the concept to a larger workplace decision. Correct options rotate deterministically to avoid a fixed answer-position pattern. The same existing engine grades every role with binary rubric credit weighted by mapped skill relevance; no partial credit or AI grading is implied. Code excerpts are text to interpret, not a sandbox.

User.selectedRoleId stores the chosen catalog role; cohort.roleId records fixture scope. The immutable second migration adds these fields with Data Analyst defaults. Existing assessment, question, lesson and learner IDs remain stable. API selection validates catalog IDs. Skill/lesson/progress/attempt/employer queries are scoped to that role; writes check ownership, role, sequence and valid choices. Learning requires the current role’s completed baseline. Both active and completed attempts are retained across switches, but excluded from other roles’ reports. No skill evidence or mastery is transferred automatically.

The public college selector changes its cohort independently of student selection. Each cohort has 30 fictional aliases; role skill IDs prevent cross-track comparisons. Fixture changes are never described as actual student improvement.

Hosted migration transactions now commit schema changes and checksum records together, so an interrupted migration cannot leave an unrecorded column addition. Local libSQL tests verify repeatability, checksum integrity and rollback; real hosted credentials and deployment remain an external verification requirement.
