# System architecture

Existing Next.js/PostgreSQL monolith retained. `/diagnostic-v2` is an explicitly isolated research-preview route, without a link that replaces the production student journey. CSS module reuses dark theme tokens and keeps style changes local. `/api/diagnostic-v2` handles start, owned state, submit and completed review. All API responses are no-store. The client imports only types, never private bank or grading modules.

New additive migration creates AdaptiveSession and AdaptiveAttempt. No original tables or migrations change. Session stores a SHA-256 token hash and expiry; browser holds the 256-bit random bearer secret in an HttpOnly, SameSite Strict cookie scoped to the API path, Secure on HTTPS. Attempts store role, bank and policy versions, full private bank snapshot, evidence, current selection, revision, timestamps and status. A unique session foreign key permits one diagnostic per preview session; historical completed evidence cannot be edited. Registered-user account linking and reassessment history are deliberately deferred, not silently simulated.

Submission validates strict bounded JSON with Zod, exact origin, session expiry, ownership, current item and revision. Grading uses the attempt snapshot. Optimistic compare-and-update runs inside a database transaction; only one concurrent response wins. Replayed identical sealed responses return current saved state. Report derives from persisted evidence. Review only exposes explanations for answered items after completion; no private bank payload is projected.

Local commands: `npm ci --ignore-scripts`, configure ignored PostgreSQL `.env`, `npm run setup`, `npm run dev`, then `/diagnostic-v2`. Configure separate `.env.test` TEST_DATABASE_URL before tests. Migration deployment for hosted environments remains a trusted manual release step; no production database was accessed.

No new application package dependency. Local PDF and PostgreSQL tools reside in ignored local runtime directories. No REA dependency or global configuration changes.

Focused study pages at `/diagnostic-v2/learn/[skillId]` reuse existing Python concept, intuition and worked-example content. They neither award practice mastery nor modify diagnostics. Reports link directly to these pages; the original learning journey and its baseline requirements remain unchanged.
