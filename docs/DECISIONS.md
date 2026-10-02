# Decisions

- 2026-10-02: Existing eddict_v1 repository is the product repository, per founder.
- Three text-based workplace simulations, 8 scored actions each, replace isolated-quiz-led diagnosis. Structured choices give reproducible grading; stakeholder follow-ups depend on each choice. All needed data remains accessible after a poor clarification choice, avoiding cascading penalties.
- English, demo sessions, fictional cohort, local delivery adopted from preflight defaults.
- Monolithic Next.js/TypeScript, Prisma 6/SQLite, Zod. No remote runtime dependencies. UUID cookie sessions isolate demo students; placement dashboard is intentionally public fictional data, not production access control.
- Sixteen granular skills include requirement clarification and communication alongside analytics. Every assessment item has explicit weighted skill mappings. Few items per skill mean coarse prototype evidence, disclosed in UI/report.
- Required thresholds and importance weight gap severity; unmet prerequisites are ordered first. Already-demonstrated skills are excluded.
- Readiness is an importance-weighted demonstrated score; meeting the prototype threshold requires every role skill to meet its target. Employer comparison uses a separate stricter fictional profile.
- Assessment grades are server-owned and final scores use actual answers. Latest complete reassessment replaces current scores; the first completed diagnostic is the baseline. Learning mastery never changes assessment scores.
- Original deterministic lessons share content between interactive and structured modes. Practice mastery requires at least 3/4 correct first responses in the current run including the harder application; retries teach but do not inflate mastery. A new run can verify mastery after practice.
- Local provider abstraction supplies hints/explanations; future AI integrations must respect it and maintain a deterministic fallback. No AI claims or API keys.
- Engine-free Prisma runtime chosen after the environment denied binaries.prisma.sh. @prisma/adapter-libsql reads local SQLite; a pinned @prisma/internals generation script uses the bundled WASM compiler without native bootstrap downloads. Checked-in SQL migrations run atomically with node:sqlite and stored checksums. Node 22.13+ required; Node 24 recommended. This retains Prisma and costs nothing, but the internal generator API must be revisited when upgrading Prisma.
- Browser origin validation compares the incoming Host with Origin. Next.js may expose an internal bind address in its URL, which is not necessarily the browser's legitimate host. No cross-origin submission is permitted.

- 2026-10-02: Founder superseded multi-role expansion with Data Analyst only from `staymotivated24rr-bot/paste_skillsetu_v1` main (`516c5f1`). Adopt that repository as the active implementation and preserve its application source; verify and package it independently of the older checkout.

- 2026-10-02: Founder resumed Python Developer and Java Developer on paste_skillsetu_v1. Preserve Data Analyst banks, IDs, existing history, security headers and hosted-database support.
- Approved defaults: switching roles retains separate histories; no automatic proficiency transfer, including overlapping workplace skills. Current role governs API state and write guards.
- Junior Python and Java language/backend fundamentals; no framework-specific requirements, free-form code runner, voice or 3D. Structured workplace choices remain the deterministic rubric.
- Exactly three total roles, 17 Python nodes and 18 Java nodes; each has three diagnostic and three alternate cases and four practice checks per node. No further role expansion.
- Add an immutable two-column migration, defaulting legacy learners/cohorts to Data Analyst. Reuse all engines and screens; keep only content and public metadata per role.
- Binary action credit remains explicit. Mapping weights capture skill relevance; coarse evidence is shown honestly. Employer targets for new tracks are five points stricter than role targets and explicitly fictional.
- Store migration checksum and libSQL schema changes atomically, verified with the same client against local SQLite. Hosted network/database validation remains outside local evidence.
