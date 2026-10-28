import type {
  Bank,
  Evidence,
  Item,
  Answer,
  PublicItem,
  Selection,
  CompetencyResult,
} from './types';
export const policyVersion = 'rule-policy-1';
export function projectItem(item: Item): PublicItem {
  return {
    id: item.id,
    competency: item.competency,
    difficulty: item.difficulty,
    version: item.version,
    type: item.type,
    context: item.context,
    prompt: item.prompt,
    code: item.code,
    options: item.options,
    steps: item.steps,
    minutes: item.minutes,
    accessibility: item.accessibility,
  };
}
const normalize = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ');
export function grade(item: Item, answer: Answer): boolean {
  if (item.options) {
    if (!Number.isInteger(answer.selected) || !item.options[answer.selected!])
      throw new Error('Select one answer.');
    return answer.selected === item.correct;
  }
  if (item.order) {
    if (
      !answer.order ||
      answer.order.length !== item.order.length ||
      new Set(answer.order).size !== item.order.length ||
      answer.order.some((id) => !item.steps?.some((s) => s.id === id))
    )
      throw new Error('Arrange every step once.');
    return answer.order.every((id, i) => item.order![i] === id);
  }
  if (!answer.text?.trim()) throw new Error('Write your response.');
  if (item.accepted)
    return item.accepted.some((value) => normalize(value) === normalize(answer.text!));
  const words =
    ' ' +
    normalize(answer.text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N} ]/gu, ' ') +
    ' ';
  return !!item.concepts?.every((group) => group.some((term) => words.includes(' ' + term + ' ')));
}
export function summarize(bank: Bank, evidence: Evidence[]): CompetencyResult[] {
  return bank.competencies.map((c) => {
    const pairs = evidence
      .map((e) => ({ e, item: bank.items.find((i) => i.id === e.itemId)! }))
      .filter((p) => p.item?.competency === c.id);
    const count = pairs.length,
      demonstrated = pairs.filter((p) => p.e.earned).length,
      types = new Set(pairs.map((p) => p.item.type)).size;
    const status =
      count < 3 || types < 2
        ? 'Insufficient evidence'
        : demonstrated === count
          ? 'Demonstrated in these tasks'
          : demonstrated <= 1
            ? 'Likely gap'
            : 'Inconsistent evidence';
    return { ...c, count, demonstrated, types, status };
  });
}
export function stopReason(bank: Bank, evidence: Evidence[]): string | null {
  if (evidence.length >= bank.max)
    return 'Maximum length reached; unresolved evidence is retained.';
  if (evidence.length < bank.min) return null;
  const rows = summarize(bank, evidence);
  if (rows.some((r) => r.count < 3 || r.types < 2)) return null;
  if (rows.every((r) => r.demonstrated === r.count || r.demonstrated === 0))
    return 'Minimum coverage met with consistent observations.';
  if (evidence.length >= bank.target && rows.every((r) => r.count >= 4))
    return 'Target coverage met; mixed observations remain visible.';
  return null;
}
export function selectNext(bank: Bank, evidence: Evidence[]): Selection | null {
  if (stopReason(bank, evidence)) return null;
  const seen = new Set(evidence.map((e) => e.itemId));
  const remaining = bank.items.filter((i) => !seen.has(i.id));
  if (!remaining.length) throw new Error('Bank exhausted before stopping requirements.');
  const rows = summarize(bank, evidence);
  const last = evidence.at(-1),
    lastItem = bank.items.find((i) => i.id === last?.itemId);
  let competency = rows.find((r) => r.count === 0)?.id;
  let reason = 'Cover an unanswered required competency';
  if (last && lastItem) {
    const previous = rows.find((r) => r.id === lastItem.competency)!;
    const prerequisite = bank.competencies
      .find((c) => c.id === previous.id)
      ?.prerequisites.map((id) => rows.find((r) => r.id === id)!)
      .find((r) => r.count < 3 && r.status !== 'Demonstrated in these tasks');
    if (!last.earned && prerequisite && remaining.some((i) => i.competency === prerequisite.id)) {
      competency = prerequisite.id;
      reason = 'Verify a prerequisite after a missed task';
    } else if (previous.count < 3 && remaining.some((i) => i.competency === previous.id)) {
      competency = previous.id;
      reason = last.earned
        ? 'Probe deeper after demonstrated evidence'
        : 'Verify the gap with a different, easier task';
    }
  }
  if (!competency || !remaining.some((i) => i.competency === competency)) {
    competency = [...rows]
      .filter((r) => remaining.some((i) => i.competency === r.id))
      .sort(
        (a, b) =>
          a.count - b.count ||
          bank.competencies.findIndex((c) => c.id === a.id) -
            bank.competencies.findIndex((c) => c.id === b.id),
      )[0]?.id;
    reason = 'Balance required coverage and resolve mixed evidence';
  }
  // Coverage debt takes precedence over optional depth once a competency has three observations.
  const uncovered = rows
    .filter((r) => r.count < 3 && remaining.some((i) => i.competency === r.id))
    .sort((a, b) => a.count - b.count)[0];
  if (uncovered && rows.find((r) => r.id === competency)!.count >= 3) {
    competency = uncovered.id;
    reason = 'Protect minimum competency coverage';
  }
  const own = evidence.filter(
    (e) => bank.items.find((i) => i.id === e.itemId)?.competency === competency,
  );
  const prior = own.at(-1),
    priorItem = bank.items.find((i) => i.id === prior?.itemId);
  const difficulty =
    prior && priorItem
      ? Math.max(1, Math.min(3, priorItem.difficulty + (prior.earned ? 1 : -1)))
      : 2;
  const item = remaining
    .filter((i) => i.competency === competency)
    .sort(
      (a, b) =>
        Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty) ||
        a.id.localeCompare(b.id),
    )[0];
  return {
    itemId: item.id,
    rationale: `${reason}; desired difficulty ${difficulty}; ${own.length} prior observations. Policy ${policyVersion}.`,
  };
}
export function learningOrder(rows: CompetencyResult[]): CompetencyResult[] {
  const output: CompetencyResult[] = [],
    visited = new Set<string>();
  function visit(row: CompetencyResult) {
    if (visited.has(row.id)) return;
    visited.add(row.id);
    row.prerequisites.forEach((id) => {
      const p = rows.find((r) => r.id === id);
      if (p && p.status !== 'Demonstrated in these tasks') visit(p);
    });
    if (row.status !== 'Demonstrated in these tasks') output.push(row);
  }
  rows.forEach(visit);
  return output;
}
