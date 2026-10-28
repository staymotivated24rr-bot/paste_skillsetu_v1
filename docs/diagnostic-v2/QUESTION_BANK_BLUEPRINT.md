# Question bank blueprint and review

## Shared schema
Bank: role, version, min/target/max, required competencies. Competency: stable ID, name, prerequisite IDs, existing lesson ID. Item: immutable ID/version, primary competency, difficulty 1–3, interaction type, context, prompt/code/steps, minutes, text accessibility metadata, private rubric/allowlist/order/key, misconception and explanation. Evidence: sealed answer, earned outcome, time and selection rationale. Public projection is an explicit allowlist. Estimated minutes are design estimates, not measured learner timing.

## Python implemented inventory
Six competencies: values/branches, functions/scope, structures, exceptions, testing, HTTP. Each has one prediction, one scenario decision, one constrained completion, one short explanation and one ordering task. 30 items total; difficulty is authored judgment, not calibrated item difficulty. Tasks use service/import/review contexts; these small contexts do not prove authentic workplace transfer. Misconception tags are tentative explanations, not causal diagnoses. Existing Python topics and lesson identifiers reused; old 68-task banks untouched.

This bank is authored but awaiting independent practitioner review. Review ledger: draft v1.1, engineer-written and machine-checked for projection/selection/coverage; no claim of educational expert approval. Before pilot: two Python practitioners inspect ambiguity and alternatives, independently grade sample reasoning, trial keyboard/mobile use, version any revisions. Capture item timing, omission, error patterns and inter-rater agreement. Do not mutate this bank after release.

## Data Analyst design, not implemented
18/24/30; six core groups: data cleaning/types, SQL/grouping, descriptive statistics, experimental reasoning, visualization, stakeholder interpretation. Original tasks should include interactive table interpretation, query completion, anomaly investigation and ordering; prerequisite graph cleaning → aggregation → interpretation. Reuse existing 16 skills/lessons but mark unmapped skills unmeasured. At least five reviewed items per core group before enabling.

## AI Engineer design, not implemented
24/30/36; eight groups: Python/data handling, probability, model evaluation, leakage/splits, features, retrieval, deployment monitoring, responsible use. Prerequisite graph Python → data pipelines; probability → evaluation; evaluation → monitoring. Six or more candidate items per group permit verification and alternates. No cross-role proficiency credit. No active AI role, fabricated competency data or Java replacement.

Future expansion: richer subskill mapping, independent transfer contexts, equivalent-syntax rubrics and reviewed alternate banks before reassessment. Validate bank budgets and prerequisite cycles before publishing.

## Bank 1.1 review revision
Before publication, review found positional clues in ordering IDs and fixed option offsets by task type. The new `python-adaptive-2` / 1.1.0 snapshot uses opaque competency-specific step IDs and deterministic per-item option rotations. Earlier local `python-adaptive-1` snapshots remain intact and resume against their original content. This is basic metadata hygiene, not an anti-cheating guarantee; source-visible banks and heuristic responses remain unsuitable for high-stakes certification.
