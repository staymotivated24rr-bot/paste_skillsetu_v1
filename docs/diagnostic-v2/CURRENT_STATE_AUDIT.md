# Current state audit — 2026-10-29

Inspected AGENTS.md, README, founder specs/status/architecture, src/app routes, components, both grading services, tracks/content, Prisma schema and all three original migrations, tests/e2e, CI and Next configuration. Historical STATUS verification describes another environment and is not current evidence.

## Actual architecture and reuse
Next 16 App Router / React 19 / TypeScript; PostgreSQL with Prisma 6.19. Original service exposes demo entry, role selection, fixed diagnostic/reassessment, practice, repairs, reports, cohort state. `/api/demo` validates Zod inputs, bounded output payloads, ownership, selected role, and same-host origin. `/api/health` probes banks. `/api/python-sandbox` serves the restricted execution document. Existing TaskResponse isolates Pyodide in an opaque-origin iframe/worker; five-second execution timeout and network restrictions remain unchanged.

Three roles, 51 skill nodes with prerequisites, lesson mappings, fictional cohorts. Python authentic banks contain 68 fixed tasks, versioned records and immutable referenced-bank enforcement. Existing `gradeTask` trusts client-reported code outputs; explanations use deterministic concept matching. This is neither secure code certification nor adaptive selection. Legacy engine and practice mastery already remain separate.

Reuse: theme tokens, Python topic names, prerequisite concepts, existing lesson identifiers, AppError, database client, test framework and route conventions. Preserve all published banks/scoring. The isolated adaptive route has its own bank snapshot and policy version, tables, token, grading and report, so legacy scores cannot change.

## Baseline actually run
Typecheck and lint passed before changes. Vitest: 48 passed, 22 skipped across four failed integration suites. Hooks failed on Windows `spawnSync npm ENOENT` / `npx.cmd EINVAL`, before database assertions. Fixed these invocations by using Node plus CLI paths; no shell interpolation. A separate `skillsetu_test` database was created, never the learner database. See TEST_RESULTS for final executed checks.

## Risks and debt
The original demo cookie contains a user UUID, not a revocable authenticated session. Public registration/authentication, authorization review, abuse prevention, privacy/retention and account recovery are release blockers. Unused libSQL packages remain installed. Dependency installation reported security advisories; no blind major upgrade applied. CI audit must be reviewed before public release. Legacy test suites require seeded PostgreSQL and can mutate banks in their test database. Browser suite contains lengthy coding journeys and historically reported Linux results; Windows results must be recorded separately.

Compatible security update: Next 16.4.3 / Zod 4.6.7; production-only dependency audit subsequently reports zero vulnerabilities. Development/transitive audit findings remain a separate maintenance task.

## Existing remote branch discovered during publication checks
The remote `feat/interactive-diagnostic-v2` already points to commit `232d687`, another unmerged implementation. This work began from local main `6393d08` and was implemented/tested independently on the requested local branch. Do not force-push, replace that remote branch or combine incompatible migrations without review. Publish this comparison under `feat/interactive-diagnostic-v2-20261029`; review alternatives before choosing a production implementation. No automatic merge between the two diagnostic designs was attempted.
