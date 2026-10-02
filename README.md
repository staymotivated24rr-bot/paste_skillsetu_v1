# SkillSetu

A locally runnable Data Analyst job-readiness prototype for engineering students. Work through three original workplace simulations, discover specific skill gaps, complete focused lessons, and verify progress using three different cases. Scores come from submitted answers, including when performance declines.

## Run locally

**If you are using this repository in a Codex cloud workspace:** a `localhost` link in your own browser points to your computer, not to the cloud workspace. To run on your computer, download/extract the source project there first, then follow the instructions below. A server running in the cloud needs a supported forwarded preview or a separate deployment to be reachable from your browser.

For an easier launch after installing Node.js 24, double-click `start-skillsetu.cmd` on Windows. On macOS/Linux open a terminal in the extracted project and run `bash start-skillsetu.sh`. These scripts install dependencies on first use, initialize/seed the database and start the app. Keep the terminal window open while using SkillSetu.

Use **Node.js 24** (or Node 22.13+) and npm. No API key, paid service, Docker, or separate database server is needed. Internet is needed once to install packages; the app itself uses no external runtime service.

From the repository directory:

```sh
npm ci --ignore-scripts
cp .env.example .env
npm run setup
npm run dev
```

Open **http://localhost:3000**. On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`. `npm run setup` explicitly generates the Prisma client, applies migrations and seeds content; install scripts are unnecessary.

For a production build:

```sh
npm run build
npm start
```

If a port is occupied: `npm run dev -- --port 3001` or `npm start -- --port 3001`.

The default database is `prisma/dev.db`. Relative `DATABASE_URL` paths are resolved from `prisma/`; an absolute `file:` URL is also supported. `.env` is loaded by the setup scripts and Next.js. Environment variables already exported in the shell take precedence. Never commit `.env`, database files, or real student information.

`npm run setup` is repeatable and preserves student sessions. It updates the original demo content and fictional cohort. “New demo session” creates a separate learner; it does not delete previous database history. Clearing browser cookies loses access to that learner's demo session. Back up `prisma/dev.db` before manually resetting local data.

## Deploy on Vercel

The local `file:./dev.db` database is intentionally for laptop/demo use only. A Vercel deployment must use durable hosted storage because serverless filesystem state is not a safe place to keep student progress.

The application supports hosted libSQL/Turso without changing the Prisma data model.

1. Create a hosted libSQL/Turso database.
2. Add these Vercel environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. From a trusted local checkout, place the same values in `.env` and run:

```sh
npm ci --ignore-scripts
npm run setup:hosted
```

4. Redeploy Vercel.
5. Check `/api/health`. A correctly configured hosted deployment returns HTTP 200 with `"database": "hosted-libsql"`.

Do **not** run a production deployment with a `file:` database. When Vercel is detected with only local SQLite configured, the API deliberately returns HTTP 503 with a clear setup message rather than pretending progress is durable.

Never commit database credentials. The hosted setup command applies the checked-in migrations and idempotent seed data before the deployment receives student traffic.

## Demonstrate the product

1. Select **Find my skill gaps**. Enter a nickname and select **Enter student demo**. Data Analyst is the only MVP role.
2. Select **Begin workplace diagnostic**. Take three stakeholder cases: a revenue decline, a checkout experiment, and a support queue briefing.
3. In each case, ask a clarification question, interpret the case file, choose analytical actions, and prepare a stakeholder brief. **Send response** saves the action and reveals the stakeholder reply. Continue through 24 actions and select **Submit assessment**. You can refresh or return later without losing submitted answers.
4. Review the skill map, evidence counts, strongest signals, and prerequisite-aware gap priorities. **Show action feedback** explains each decision after completion.
5. Open **Learning plan**. Start a gap-repair module. Choose **Interactive** for problems first or **Structured** for explanations first. Both use the same objectives, worked examples and checks.
6. Answer four practice items; try hints and retries. Mastery requires at least three correct first responses including the final application. Opening a lesson earns no mastery. A weaker run is recorded honestly; **New practice run** permits another verification after study.
7. Select **Verify in a fresh case** or **Start reassessment**. New cases cover subscription renewals, a notification experiment, and warehouse operations. Submit 24 new actions.
8. Inspect **Before → after** and remaining gaps. Practice does not automatically increase the assessment score. A reassessment can improve, stay flat, or decline.
9. Open **Readiness report**. See baseline/current scores, skill evidence, changes, completed learning modules, next actions and the fictional employer-style requirement match. **Print report** supports browser printing or Save as PDF.
10. Open **Placement dashboard** to view a separate fictional 30-student cohort, 26 diagnostics, common gaps, initial/current averages, learning completion and students meeting every individual role target. This is labelled sample data and does not change when you use the student demo.

For a short demonstration, start a diagnostic and show the first stakeholder exchange, then use the full automated browser test to exercise all steps. There is no hidden button that fabricates student answers or improvement.

## What exists

- Three diagnostic workplace simulations with 24 scored structured actions and choice-dependent stakeholder follow-ups.
- Three distinct equivalent reassessment cases with 24 additional actions.
- Sixteen skill nodes spanning SQL filters, aggregation/subqueries, joins, windows; spreadsheet formulas/data quality; Python data frames; descriptive statistics, probability, confidence intervals and tests; visualization, interpretation, reasoning, clarification and communication.
- Role targets, importance and prerequisite graph; deterministic scoring and personalized gap plans.
- Sixteen original lessons with 64 practice problems, shared interactive/structured content, hints, explanations, retries, mastery and persisted progress.
- Baseline/current readiness and reports, original-answer review, honest declines, print styling and example employer targets.
- Public fictional college dashboard with anonymous sample aliases and explicit fixture labels.
- Isolated cookie-based student demo sessions, input validation, server-owned grading and persisted demo progress; local SQLite is used on laptops and hosted libSQL can be used for deployment.

## Architecture

Next.js App Router, React, TypeScript, Prisma 6, SQLite/libSQL through `@prisma/adapter-libsql`, Zod, Lucide icons, Vitest, and Playwright. Original deterministic local content implements a provider interface, with a fallback wrapper for future optional providers. There is no active AI integration or “AI-powered” claim.

The engine-free Prisma runtime and bundled WASM generator avoid native Prisma binary downloads. `prisma/generate.ts` uses pinned Prisma internals; upgrade all Prisma packages together and recheck that script. Checked-in SQL migrations use Node's SQLite API, apply atomically and verify checksums. Add a new migration for schema changes; do not edit applied migrations. The relational model can be moved to PostgreSQL with a provider/adapter change and corresponding PostgreSQL migrations.

See [architecture and scoring details](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md), [approved specification](docs/PRODUCT_SPEC.md), [milestones](docs/EXECUTION_PLAN.md), [current status](docs/STATUS.md), and [pending questions](docs/PENDING_QUESTIONS.md).

## Checks

Run setup before checks on a fresh checkout:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Database integration tests create and seed an isolated `/tmp/skillsetu-vitest.db`. They never reset the application's database. Unit/integration coverage includes mapping/content coverage, weighted proficiency, completeness/duplicate guards, role/employer targets, prerequisite ordering/cycles, readiness and before/after, persisted progress/mastery/retries, session ownership, stakeholder replies, hidden keys, stored paths/reports, reassessment declines, and the fictional cohort.

Install a browser once if Playwright does not have one:

```sh
npx playwright install chromium
npm run test:e2e
```

Or use an existing Chromium executable, for example on Linux:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

The browser suite exercises the entire student flow, both lesson modes, hints, mastery, positive and negative reassessment, report printing/PDF, the fictional cohort, a 390px mobile view, keyboard selection, refresh/resume, and invalid/cross-session/cross-origin API requests. Test learners are added to the local demo database; no existing learner is deleted. Reports/screenshots are in ignored `test-results/` and the browser test report is in `playwright-report/`.

To check the production server rather than development:

```sh
npm run build
E2E_SERVER_COMMAND='npm run start' npm run test:e2e
```

Stop any existing server on port 3000 first if you want to ensure this command starts the production build. On Windows set these environment variables using PowerShell syntax.

## Prototype limitations

- Sixteen skills have only 1–6 mapped actions per bank. Indicators are coarse; the assessment is not scientifically validated and does not guarantee employability, interviews or placement.
- Structured choices assess applied recognition and decisions, including clarification and communication. They do not yet assess free-form SQL authoring, unrestricted stakeholder conversation, or production coding ability. No live SQL/Python sandbox, avatar or voice.
- Reassessment uses a different fixed bank from diagnostic; repeated reassessments reuse that alternate bank. Practice runs also reuse fixed items, so familiarity can affect scores. Future trials should add larger item banks, alternate forms, content versioning and independent evaluation.
- Lessons are original short demo content, not a complete analytics curriculum. Four practice items are a prototype mastery check.
- Cookie demo access is not production authentication. The placement dashboard is public fictional data; no real college authorization, multi-tenancy, billing, recruiter marketplace or external hiring integration is implemented.
- SQLite, a single monolith and serialized content payloads suit local demonstrations. Real deployments need identity/access control, content integrity, privacy/consent/retention decisions and operational hardening.
- Cohort metrics are explicitly fabricated fixtures to demonstrate the dashboard. Student results are always computed from actual submitted choices.

No unresolved founder decision currently blocks this MVP.

## Smallest next validation

Pilot this one role with 20–30 engineering students: collect feedback on whether the applied tasks reveal credible gaps, let students repair identified gaps, then reassess. Record baseline/current skill evidence, completion and time spent. Ask one placement officer and one analyst/employer reviewer to critique the tasks and rubrics. Include independently scored fresh tasks to distinguish skill transfer from familiarity with multiple-choice items. Treat findings as early validation, not proven placement outcomes.
