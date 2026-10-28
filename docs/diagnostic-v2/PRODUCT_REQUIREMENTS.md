# Product requirements and acceptance boundary

Python-first adaptive assessment is isolated at `/diagnostic-v2`; existing home and all three tracks remain unchanged. AI Engineer is future content, not a Java replacement. Anonymous research-preview sessions use a separate random secret cookie; these are not registered accounts.

Scope: six core Python competencies, 30 authored versioned items, 18 minimum / 24 target / 30 maximum. Other 11 Python skills are explicitly unmeasured. This is a narrow complete assessment, not complete role certification. Supported tasks: prediction, scenario reasoning choices, constrained code completion, short reasoning, ordering. No unconstrained code execution or fabricated AI grading.

Every completed attempt must include at least three observations in each required competency and at least two formats. Correctness changes difficulty and item selection. Gaps may probe prerequisites. Persisted bank/policy snapshots and server-owned evidence support refresh, idempotent response recovery and review. Reports show actual counts, mixed evidence, gaps, prerequisites and existing lesson references; practice cannot alter results. No mastery conclusion from one answer.

Diagnostics withhold correctness until completion. Format guidance does not teach the tested concept. Practice can later provide conceptual hints, retries, effort rewards and explanations independently. This avoids treating coached second responses as independent baseline evidence.

Release gates: content review and learner pilot, production identity, abuse controls, dependency remediation, operational monitoring, recovery drills and measured load. Isolated preview availability is not public production readiness.
