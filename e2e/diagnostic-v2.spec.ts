import { expect, test, type Page } from '@playwright/test';
import { pythonDiagnostic as bank } from '../src/lib/diagnostic/python-bank';
import type { RunView } from '../src/lib/diagnostic/types';
async function state(page: Page): Promise<RunView> {
  return (await (await page.request.get('/api/diagnostic-v2')).json()).run;
}
async function enter(page: Page, name: string) {
  await page.goto('/diagnostic-v2');
  await page.getByLabel('What should we call you?').fill(name);
  await page.getByRole('button', { name: 'Explore my Python skills' }).click();
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeVisible();
}
async function answerTask(page: Page, run: RunView, correct = true) {
  const q = bank.questions.find((q) => q.id === run.current!.id)!;
  if (q.options)
    await page
      .getByRole('radio')
      .nth(correct ? q.correct! : (q.correct! + 1) % q.options.length)
      .check();
  else if (q.steps) {
    if (correct) {
      // Starting presentation is deliberately reversed. Move each desired step into place.
      const current = q.steps.map((s) => s.id);
      for (let target = 0; target < q.order!.length; target++) {
        let index = current.indexOf(q.order![target]);
        while (index > target) {
          await page
            .getByRole('button', { name: `Move step ${index + 1} up`, exact: true })
            .click();
          [current[index - 1], current[index]] = [current[index], current[index - 1]];
          index--;
        }
      }
    }
  } else
    await page.getByLabel('Your answer', { exact: true }).fill(correct ? q.expected![0] : 'unsure');
  await page.getByRole('button', { name: 'Submit response', exact: true }).click();
  await expect(page.getByText('Response saved', { exact: true })).toBeVisible();
}
test('adaptive desktop completion, saved feedback, independent report and learning links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/diagnostic-v2');
  await expect(page.getByRole('heading', { name: /Discover what/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/diagnostic-v2-desktop-intro.png', fullPage: true });
  await enter(page, 'Desktop explorer');
  const first = await state(page);
  expect(first.current).not.toHaveProperty('expected');
  await page.screenshot({ path: 'test-results/diagnostic-v2-desktop-task.png', fullPage: true });
  await answerTask(page, first);
  const harder = await state(page);
  expect(harder.current!.difficulty).toBe(3);
  await page.getByRole('button', { name: 'Continue discovery' }).click();
  let run = harder;
  while (run.current) {
    await answerTask(page, run);
    run = await state(page);
    await page
      .getByRole('button', {
        name: run.status === 'completed' ? 'See my skill map' : 'Continue discovery',
      })
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
  expect(run.answered).toBe(18);
  expect(run.report!.findings.every((f) => f.status === 'Demonstrated strength')).toBe(true);
  await page.screenshot({ path: 'test-results/diagnostic-v2-desktop-report.png', fullPage: true });
  await page.getByRole('link', { name: 'Bookmark this report' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
  await page.getByRole('link', { name: 'Explore the SkillSetu module' }).first().click();
  await expect(page.getByRole('heading', { name: 'Build the intuition' })).toBeVisible();
  await page.getByRole('link', { name: 'Return to my skill map' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence into direction.' })).toBeVisible();
});
test('mobile drafts, hint integrity, offline retry and refresh resume', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page, 'Mobile explorer');
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
  const input = page.getByLabel('Your answer', { exact: true });
  await input.fill('4');
  await expect(page.getByText('Draft saved to your session.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume diagnostic' }).click();
  await expect(input).toHaveValue('4');
  await page.getByRole('button', { name: 'Process hint' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Trace one concrete input' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume diagnostic' }).click();
  await expect(page.getByRole('button', { name: 'Process hint' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/diagnostic-v2-mobile-task.png', fullPage: true });
  await page.route('**/api/diagnostic-v2', (route) =>
    route.request().postDataJSON()?.action === 'answer' ? route.abort('failed') : route.continue(),
  );
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeEnabled();
  await page.unroute('**/api/diagnostic-v2');
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect(page.getByText('Response saved', { exact: true })).toBeVisible();
  const after = await state(page);
  expect(after.answered).toBe(1);
  expect(after.lastFeedback!.assisted).toBe(true);
  await page.getByRole('button', { name: 'Continue discovery' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Resume diagnostic' }).click();
  expect((await state(page)).answered).toBe(1);
});
test('incorrect trajectory diverges, supports keyboard radio and gives honest gap report on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page, 'Gap explorer');
  await answerTask(page, await state(page), false);
  let run = await state(page);
  expect(run.current!.difficulty).toBe(1);
  await page.getByRole('button', { name: 'Continue discovery' }).click();
  await page.getByRole('radio').first().focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio').first()).toBeChecked();
  while (run.current) {
    await answerTask(page, run, false);
    run = await state(page);
    await page
      .getByRole('button', {
        name: run.status === 'completed' ? 'See my skill map' : 'Continue discovery',
      })
      .click();
  }
  expect(run.report!.findings.every((f) => f.status === 'Likely gap')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Your next learning steps' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/diagnostic-v2-mobile-report.png', fullPage: true });
  await page.getByRole('button', { name: 'Start a fresh diagnostic' }).click();
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeVisible();
  expect((await state(page)).answered).toBe(0);
});
test('API denies foreign sessions, origin attacks, forged grading, stale answers and large requests', async ({
  page,
  browser,
}) => {
  await enter(page, 'Security explorer');
  const run = await state(page),
    q = run.current!,
    origin = new URL(page.url()).origin;
  const answer = { action: 'answer', runId: run.id, questionId: q.id, answer: { text: '4' } };
  const other = await browser.newContext();
  expect((await other.request.get(`${origin}/api/diagnostic-v2?run=${run.id}`)).status()).toBe(200); // No session -> no private state.
  const noSession = await (
    await other.request.get(`${origin}/api/diagnostic-v2?run=${run.id}`)
  ).json();
  expect(noSession.run).toBeNull();
  await other.request.post(`${origin}/api/diagnostic-v2`, {
    headers: { Origin: origin },
    data: { action: 'enter', name: 'Foreign' },
  });
  expect((await other.request.get(`${origin}/api/diagnostic-v2?run=${run.id}`)).status()).toBe(404);
  expect(
    (
      await other.request.post(`${origin}/api/diagnostic-v2`, {
        headers: { Origin: origin },
        data: answer,
      })
    ).status(),
  ).toBe(404);
  await other.close();
  expect((await page.request.post('/api/diagnostic-v2', { data: answer })).status()).toBe(403);
  expect(
    (
      await page.request.post('/api/diagnostic-v2', {
        headers: { Origin: 'https://foreign.example' },
        data: answer,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/diagnostic-v2', {
        headers: { Origin: origin },
        data: { ...answer, answer: { text: '4', outputs: [4], correct: true } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post('/api/diagnostic-v2', {
        headers: { Origin: origin },
        data: { ...answer, answer: { text: 'x'.repeat(9000) } },
      })
    ).status(),
  ).toBe(413);
  const submitted = await Promise.all(
    [1, 2].map(() =>
      page.request.post('/api/diagnostic-v2', { headers: { Origin: origin }, data: answer }),
    ),
  );
  expect(submitted.every((r) => r.ok())).toBe(true);
  expect((await state(page)).answered).toBe(1);
  expect(
    (
      await page.request.post('/api/diagnostic-v2', {
        headers: { Origin: origin },
        data: { ...answer, answer: { text: '5' } },
      })
    ).status(),
  ).toBe(409);
});

test('mobile keyboard ordering, focus, boundaries and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page, 'Keyboard explorer');
  await answerTask(page, await state(page));
  await page.getByRole('button', { name: 'Continue discovery' }).click();
  const run = await state(page);
  expect(run.current!.type).toBe('ordering');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Move step 1 up', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move step 4 down', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Move step 2 up', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main ol li').first()).toContainText(run.current!.steps![1].text);
  await page.getByRole('button', { name: 'Move step 1 down', exact: true }).click();
  expect(
    await page
      .locator('main section')
      .last()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.screenshot({ path: 'test-results/diagnostic-v2-mobile-ordering.png', fullPage: true });
  await answerTask(page, run);
  expect((await state(page)).answered).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
