import { describe, it, expect } from 'vitest';
import { pythonAdaptiveBank as bank } from '../src/lib/diagnostic/python-bank';
import {
  grade,
  selectNext,
  stopReason,
  summarize,
  projectItem,
  learningOrder,
} from '../src/lib/diagnostic/engine';
import type { Answer, Evidence, Item } from '../src/lib/diagnostic/types';
export function good(item: Item): Answer {
  if (item.options) return { selected: item.correct };
  if (item.order) return { order: item.order };
  return { text: item.accepted?.[0] ?? item.concepts!.map((g) => g[0]).join(' ') };
}
function run(pattern: (n: number) => boolean) {
  const evidence: Evidence[] = [];
  while (!stopReason(bank, evidence)) {
    const next = selectNext(bank, evidence)!;
    const item = bank.items.find((i) => i.id === next.itemId)!;
    evidence.push({
      itemId: item.id,
      answer: good(item),
      earned: pattern(evidence.length),
      rationale: next.rationale,
      at: 'test',
    });
    if (evidence.length > 30) throw Error('Unbounded');
  }
  return evidence;
}
describe('explainable adaptive policy', () => {
  it('branches after correct and incorrect responses and changes difficulty', () => {
    const first = selectNext(bank, [])!;
    const e = {
      itemId: first.itemId,
      answer: { selected: 0 },
      earned: true,
      rationale: first.rationale,
      at: 'test',
    };
    const strong = selectNext(bank, [e])!,
      weak = selectNext(bank, [{ ...e, earned: false }])!;
    expect(strong.itemId).not.toBe(weak.itemId);
    expect(bank.items.find((i) => i.id === strong.itemId)!.difficulty).toBe(3);
    expect(bank.items.find((i) => i.id === weak.itemId)!.difficulty).toBe(1);
  });
  it('investigates a prerequisite after an incorrect response', () => {
    const item = bank.items.find((i) => i.competency === 'py-http')!;
    const next = selectNext(bank, [
      { itemId: item.id, answer: {}, earned: false, rationale: 'test', at: 'test' },
    ])!;
    expect(bank.items.find((i) => i.id === next.itemId)!.competency).toBe('py-exceptions');
    expect(next.rationale).toContain('prerequisite');
  });
  it.each(['strong', 'weak', 'mixed'] as const)(
    'bounds length, enforces coverage and never repeats for %s',
    (pattern) => {
      const evidence = run((n) => pattern === 'strong' || (pattern === 'mixed' && n % 2 === 0));
      expect(evidence.length).toBeGreaterThanOrEqual(18);
      expect(evidence.length).toBeLessThanOrEqual(30);
      expect(new Set(evidence.map((e) => e.itemId)).size).toBe(evidence.length);
      expect(summarize(bank, evidence).every((r) => r.count >= 3 && r.types >= 2)).toBe(true);
      expect(selectNext(bank, evidence)).toBeNull();
      if (pattern !== 'mixed') expect(evidence).toHaveLength(18);
    },
  );
  it('handles sparse and inconsistent evidence honestly', () => {
    expect(summarize(bank, []).every((r) => r.status === 'Insufficient evidence')).toBe(true);
    const e = run((n) => n % 2 === 0);
    expect(summarize(bank, e).some((r) => r.status === 'Inconsistent evidence')).toBe(true);
    expect(stopReason(bank, [])).toBeNull();
    expect(
      stopReason(
        bank,
        bank.items.map((i) => ({ itemId: i.id, answer: {}, earned: false, rationale: '', at: '' })),
      ),
    ).toContain('Maximum');
  });
  it('grades all authored formats without trusting claimed scores or outputs', () => {
    for (const item of bank.items) {
      expect(grade(item, good(item))).toBe(true);
      expect(
        grade(
          item,
          item.options
            ? { selected: (item.correct! + 1) % 3 }
            : item.order
              ? { order: [...item.order].reverse() }
              : { text: 'unrelated response' },
        ),
      ).toBe(false);
    }
  });
  it('does not expose private rubrics or solutions in question projections', () => {
    for (const item of bank.items)
      expect(JSON.stringify(projectItem(item))).not.toMatch(
        /"correct"|"accepted"|"order"|"concepts"|"explanation"|"misconception"/,
      );
  });
  it('orders gaps with prerequisites first and retains lesson links', () => {
    const rows = summarize(
      bank,
      run(() => false),
    );
    const order = learningOrder(rows);
    for (const row of order)
      for (const id of row.prerequisites)
        expect(order.findIndex((r) => r.id === id)).toBeLessThan(order.indexOf(row));
    expect(order.every((r) => r.lessonId.startsWith('lesson-py-'))).toBe(true);
  });
  it('produces different complete sequences for different evidence patterns', () => {
    expect(run(() => true).map((e) => e.itemId)).not.toEqual(run(() => false).map((e) => e.itemId));
  });
});

it('does not encode ordering solutions or constant answer positions in public metadata', () => {
  for (const type of ['prediction', 'decision']) {
    const positions = new Set(
      bank.items.filter((item) => item.type === type).map((item) => item.correct),
    );
    expect(positions.size).toBeGreaterThan(1);
  }
  const ordered = bank.items.filter((item) => item.order);
  const ids = ordered.flatMap((item) => projectItem(item).steps!.map((step) => step.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => /^entry-[a-f0-9]{12}$/.test(id))).toBe(true);
  expect(
    ordered.some(
      (item) =>
        [...item.steps!]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((step) => step.id)
          .join() !== item.order!.join(),
    ),
  ).toBe(true);
});
