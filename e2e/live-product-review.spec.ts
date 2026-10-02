import { expect, test, type Page } from '@playwright/test';
import { tracks } from '../src/lib/tracks';
import { planGaps } from '../src/lib/engine';

const track = tracks.find((t) => t.role.id === 'python-developer')!;

async function runMixed(
  page: Page,
  kind: 'diagnostic' | 'reassessment',
  correctIndexes: Set<number>,
) {
  const items = track[kind].flatMap((s) => s.items);
  for (const [i, q] of items.entries()) {
    await expect(page.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
    const choice = correctIndexes.has(i) ? q.correct : (q.correct + 1) % q.options.length;
    await page.getByRole('radio').nth(choice).check();
    await page.getByRole('button', { name: 'Send response', exact: true }).click();
    await expect(page.getByText(q.options[choice].response, { exact: true })).toBeVisible();
    if (kind === 'diagnostic' && i === 5) {
      await page.reload();
      await expect(page.getByRole('heading', { name: items[i + 1].prompt, exact: true })).toBeVisible();
      continue;
    }
    await page.getByRole('button', {
      name: i === 23 ? 'Review submission' : i === 7 || i === 15 ? 'Open next case' : 'Next action',
      exact: true,
    }).click();
  }
  await page.getByRole('button', { name: 'Submit assessment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now you know where to focus.' })).toBeVisible();
}

test('live placement-candidate review across the complete product', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  await page.goto('/');
  await expect(page.locator('body')).not.toContainText('durable database');
  await page.screenshot({ path: 'test-results/live-landing.png', fullPage: true });

  await page.getByRole('button', { name: 'Find my skill gaps', exact: true }).click();
  await page.locator('.role-choice').filter({ hasText: 'Python Developer' }).click();
  await page.getByLabel('What should we call you?').fill('Live QA placement engineer');
  await page.getByRole('button', { name: 'Enter student demo', exact: true }).click();
  await expect(page.getByLabel('Target role', { exact: true })).toHaveValue('python-developer');

  const roleSwitch = page.getByLabel('Target role', { exact: true });
  await roleSwitch.selectOption('java-developer');
  let switched = await (await page.request.get('/api/demo')).json();
  expect(switched.attempts).toHaveLength(0);
  await roleSwitch.selectOption('data-analyst');
  switched = await (await page.request.get('/api/demo')).json();
  expect(switched.attempts).toHaveLength(0);
  await roleSwitch.selectOption('python-developer');

  await page.getByRole('button', { name: 'Begin workplace diagnostic', exact: true }).click();
  const baselineCorrect = new Set([0,2,4,6,8,10,12,14,16,18,20,22,23]); // 13/24 = 54.2%
  await runMixed(page, 'diagnostic', baselineCorrect);

  const baselineState = await (await page.request.get('/api/demo')).json();
  const baseline = baselineState.attempts.at(-1);
  const gaps = planGaps(baseline.scores, track.skills);
  console.log('LIVE_REVIEW::BASELINE', JSON.stringify({
    rawCorrect: '13/24',
    readinessScore: baseline.score,
    gapCount: gaps.length,
    gaps: gaps.map((g) => ({
      skill: g.name,
      current: baseline.scores.find((s: any) => s.skillId === g.id)?.score ?? 0,
      target: g.target,
      blockedBy: g.blockedBy,
    })),
  }));

  await page.getByRole('button', { name: 'Show action feedback', exact: true }).click();
  await expect(page.getByText('Gap signal', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'My skill map', exact: true }).click();
  await page.screenshot({ path: 'test-results/live-skill-map.png', fullPage: true });

  await page.getByRole('button', { name: 'Learning plan', exact: true }).click();
  await expect(page.getByText(/skills to strengthen/)).toBeVisible();
  const modules = page.locator('article.module-card');
  const moduleCount = await modules.count();
  const moduleTitles: string[] = [];
  for (let i = 0; i < Math.min(moduleCount, 6); i++) {
    const txt = await modules.nth(i).locator('h3').innerText();
    moduleTitles.push(txt);
  }
  console.log('LIVE_REVIEW::LEARNING_PLAN', JSON.stringify({ moduleCount, firstModules: moduleTitles }));
  expect(moduleCount).toBe(gaps.length);

  await modules.first().getByRole('button', { name: /Start learning|Continue learning/ }).click();
  await page.getByRole('button', { name: 'Structured', exact: true }).click();
  await expect(page.locator('.worked-example')).toBeVisible();
  await page.getByRole('button', { name: 'Interactive', exact: true }).click();
  await page.getByRole('button', { name: 'Need a hint?', exact: true }).click();
  await expect(page.locator('.hint')).toBeVisible();

  const lessonTitle = await page.locator('.page-heading h1').innerText();
  const lesson = track.lessons.find((l) => l.title === lessonTitle)!;
  for (const [i, q] of lesson.content.items.entries()) {
    await expect(page.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible();
    if (i === 0) {
      const wrong = (q.correct + 1) % q.options.length;
      await page.getByRole('radio').nth(wrong).check();
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      await expect(page.getByText(/Not quite/)).toBeVisible();
      await page.getByRole('radio').nth(q.correct).check();
      await page.getByRole('button', { name: 'Try this answer', exact: true }).click();
      await expect(page.getByText('That’s right.', { exact: true })).toBeVisible();
    } else {
      await page.getByRole('radio').nth(q.correct).check();
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      await expect(page.getByText('That’s right.', { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: i === 3 ? 'See mastery result' : 'Next problem', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'You demonstrated this lesson’s objectives.' })).toBeVisible();
  const learnedState = await (await page.request.get('/api/demo')).json();
  console.log('LIVE_REVIEW::LESSON', JSON.stringify({
    lesson: lessonTitle,
    progress: learnedState.progress.find((p: any) => p.lessonId === lesson.id),
    assessmentScoreStill: learnedState.attempts[0].score,
  }));

  await page.getByRole('button', { name: 'Verify in a fresh case', exact: true }).click();
  const reassessCorrect = new Set([0,1,3,4,6,7,9,10,12,13,15,16,18,19,21,22]); // 16/24
  await runMixed(page, 'reassessment', reassessCorrect);

  const afterState = await (await page.request.get('/api/demo')).json();
  const after = afterState.attempts.at(-1);
  const afterGaps = planGaps(after.scores, track.skills);
  console.log('LIVE_REVIEW::REASSESSMENT', JSON.stringify({
    rawCorrect: '16/24',
    readinessScore: after.score,
    gapCount: afterGaps.length,
    gaps: afterGaps.map((g) => g.name),
    baselineScore: baseline.score,
  }));

  await page.getByRole('button', { name: 'Readiness report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your progress, backed by evidence.' })).toBeVisible();
  const reportText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  console.log('LIVE_REVIEW::REPORT_SNIPPET', reportText.slice(0, 2400));
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: 'test-results/live-readiness-report.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: 'test-results/live-readiness-report.png', fullPage: true });

  await page.getByRole('button', { name: 'Placement dashboard', exact: true }).click();
  const cohortSummaries: any[] = [];
  for (const t of tracks) {
    await page.getByLabel('Cohort role', { exact: true }).selectOption(t.role.id);
    const cohort = await (await page.request.get('/api/demo?view=cohort&roleId=' + t.role.id)).json();
    cohortSummaries.push({ role: t.role.name, members: cohort.members.length, skills: cohort.skills.length });
  }
  console.log('LIVE_REVIEW::COHORTS', JSON.stringify(cohortSummaries));
  await page.screenshot({ path: 'test-results/live-placement-dashboard.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#workspace');
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  console.log('LIVE_REVIEW::MOBILE', JSON.stringify({ noHorizontalOverflow: noOverflow }));
  expect(noOverflow).toBe(true);
  await page.screenshot({ path: 'test-results/live-mobile.png', fullPage: true });

  const invalidRole = await page.request.post('/api/demo', { data: { action: 'select-role', roleId: 'unknown' } });
  console.log('LIVE_REVIEW::INVALID_ROLE_STATUS', invalidRole.status());
  expect(invalidRole.status()).toBe(400);

  expect(errors).toEqual([]);
});
