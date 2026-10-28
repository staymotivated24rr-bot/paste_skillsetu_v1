# Verification results — 2026-10-29

Host: Windows, Node 24.21.0, npm 11.19.0, standalone local PostgreSQL 18.4; separate application and integration-test databases. Browser: installed Chromium-based Microsoft Edge through Playwright. No production/Neon database accessed.

## Baseline
Before implementation: typecheck and lint passed. Vitest ran 70 tests: 48 passed; 22 skipped because four integration hooks failed on Windows npm/npx subprocess launches. Historical repository claims were not counted as current verification. Portable Node CLI invocations fixed the hooks.

## Final executed checks
- `npm run lint`: passed after all code changes.
- `npm run build`: passed with patched Next 16.4.3 / Zod 4.6.7; includes TypeScript compilation and the adaptive API, diagnostic and focused study routes. Build did not run production migrations.
- `npm test`: all 85 tests in 10 files passed on final bank 1.1.0 (57.54 seconds). Includes all 70 original tests plus 15 new policy/service checks, including metadata hygiene and archived snapshot grading.
- `npm audit --omit=dev --omit=optional --audit-level=high`: zero vulnerabilities after compatible lockfile updates. Full development/transitive audit still reports advisories; no claim that every dependency is remediated.
- Adaptive production Playwright journeys: desktop and 390px mobile complete/resume, drafts, hidden keys, study links, API ownership/forged-output rejection, keyboard/reduced-motion and failed-request retry passed in the full-suite run. The full 14-test production suite passed in 9.6 minutes before the final metadata-only bank revision. This includes every legacy code contract in all five published Python banks, the full Python journey, Java and Data Analyst journeys, mobile/cohort checks and sandbox timeout/network isolation. Final bank 1.1.0 is separately rebuilt and its four affected adaptive journeys rerun; see the final confirmation below.
- Local `/api/health` and `/diagnostic-v2`: HTTP 200.
- `git diff --check`: passed.

## Coverage and evidence
Policy tests verify divergent sequences and difficulty, prerequisite probes, 18–30 bounds, required competency coverage, no repetition, uncertainty labels, private projections, deterministic grading and prerequisite learning order. Database tests verify session isolation, expiry, persisted snapshots, first-response sealing, idempotent retries, stale/current-item guards, completed report and concurrent-write integrity. Existing integration tests retain original roles, banks, history, mastery separation and additive migration behavior.

Desktop/mobile adaptive screenshots and mobile question screenshot are in ignored `test-results/`, visually inspected. The reference PDF's 32 rendered pages were reviewed in four eight-page contact sheets; source images were not copied into application assets.

## Failures encountered and resolved
Initial integration hooks failed before assertions due to Windows npm/npx invocation. Early browser run exposed normalized Next request hostname versus actual Origin/Host; compare full Origin scheme and Host header now, while rejecting foreign origins. A recovery assertion initially matched Next's route-announcer alert too; it now targets the failure alert. Prisma DLL regeneration requires stopping this app's listener and running generation separately from database tests on Windows; avoid parallel client regeneration and Prisma-using tests.

## Unverified boundaries
No learner study, psychometric calibration, expert content approval, formal accessibility audit, production identity provider, remote deployment, capacity benchmark, backup restore drill or secure arbitrary-code evaluator was run. The new six-competency assessment is a constrained core slice, and eleven Python skills are unmeasured. Data Analyst/AI adaptive banks and ten-thousand-user capacity are design/roadmap only. REA was investigated through official documentation but not installed, connected or used to reverse-engineer third-party software.

Final confirmation: bank `python-adaptive-2` / 1.1.0 production rebuild passed, and all four affected adaptive Playwright tests passed again in 15.9 seconds. No legacy application code or banks changed in that final revision. Final adaptive screenshots were re-inspected. No remote CI status is implied by these local results.
