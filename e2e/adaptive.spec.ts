import { test, expect } from '@playwright/test';
import { pythonAdaptiveBank } from '../src/lib/diagnostic/python-bank';
for (const mobile of [false, true])
  test(`adaptive Python completes and resumes (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/diagnostic-v2');
    await page.getByRole('button', { name: 'Begin Python diagnostic' }).click();
    await expect(page.getByRole('heading', { name: 'Task 1' })).toBeVisible();
    const initial = await page.request.get('/api/diagnostic-v2');
    const state = await initial.json();
    expect(JSON.stringify(state)).not.toMatch(/"correct"|"accepted"|"concepts"|"explanation"/);
    await expect(page.getByRole('button', { name: 'Submit response' })).toBeDisabled();
    const firstItem = pythonAdaptiveBank.items.find((item) => item.id === state.question.id)!;
    const incorrectIndex = (firstItem.correct! + 1) % 3;
    await page.getByRole('radio').nth(incorrectIndex).check();
    await page.reload();
    await expect(page.getByRole('radio').nth(incorrectIndex)).toBeChecked();
    await page.getByRole('button', { name: 'Submit response' }).click();
    await expect(page.getByRole('heading', { name: 'One more piece' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Task 2' })).toBeVisible();
    let count = 1;
    while (true) {
      const res = await page.request.get('/api/diagnostic-v2');
      const view = await res.json();
      if (view.report) break;
      const item = pythonAdaptiveBank.items.find((i) => i.id === view.question.id)!;
      if (item.options) await page.getByRole('radio').nth(item.correct!).check();
      else if (item.order) {
        for (let i = 0; i < item.order.length; i++) {
          while (true) {
            const labels = await page.locator('fieldset ol li>span').allTextContents();
            const wanted = item.steps!.find((s) => s.id === item.order![i])!.text;
            const at = labels.indexOf(wanted);
            if (at === i) break;
            await page.getByRole('button', { name: `Move step ${at + 1} up`, exact: true }).click();
          }
        }
      } else
        await page
          .getByRole('textbox')
          .fill(item.accepted?.[0] ?? item.concepts!.map((g) => g[0]).join(' '));
      await page.getByRole('button', { name: 'Submit response' }).click();
      await expect(page.getByRole('heading', { name: 'One more piece' })).toBeVisible();
      await page
        .getByRole('button', { name: /Continue to next task|View my skill-gap report/ })
        .click();
      count++;
    }
    expect(count).toBeGreaterThanOrEqual(18);
    expect(count).toBeLessThanOrEqual(30);
    await expect(page.getByRole('heading', { name: 'Your evidence, explained.' })).toBeVisible();
    await page.getByText('Areas with insufficient evidence', { exact: true }).click();
    await expect(page.getByText('Not measured in this slice:', { exact: false })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/adaptive-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your evidence, explained.' })).toBeVisible();
    await page.getByRole('link', { name: 'Values, branches & loops →' }).click();
    await expect(page.getByRole('heading', { name: 'Worked example' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to my report' }).click();
    await expect(page.getByRole('heading', { name: 'Your evidence, explained.' })).toBeVisible();
  });
test('API rejects forged outputs, stale ownership and cross-origin requests', async ({
  page,
  browser,
}) => {
  await page.goto('/diagnostic-v2');
  await page.getByRole('button', { name: 'Begin Python diagnostic' }).click();
  await expect(page.getByRole('heading', { name: 'Task 1' })).toBeVisible();
  const state = await (await page.request.get('/api/diagnostic-v2')).json();
  const origin = new URL(page.url()).origin;
  const payload = {
    action: 'answer',
    id: state.id,
    revision: 0,
    itemId: state.question.id,
    answer: { selected: 0 },
  };
  expect(
    (
      await page.request.post('/api/diagnostic-v2', {
        headers: { origin: 'https://untrusted.example' },
        data: payload,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/diagnostic-v2', {
        headers: { origin },
        data: { ...payload, answer: { outputs: [true], score: 1 } },
      })
    ).status(),
  ).toBe(400);
  expect((await page.request.get('/api/diagnostic-v2?review=1')).status()).toBe(409);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(page.url());
  await otherPage.getByRole('button', { name: 'Begin Python diagnostic' }).click();
  await expect(otherPage.getByRole('heading', { name: 'Task 1' })).toBeVisible();
  expect(
    (
      await otherPage.request.post('/api/diagnostic-v2', { headers: { origin }, data: payload })
    ).status(),
  ).toBe(404);
  await other.close();
});

test('keyboard selection, request failure and retry keep the response usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/diagnostic-v2');
  await page.getByRole('button', { name: 'Begin Python diagnostic' }).click();
  await expect(page.getByRole('heading', { name: 'Task 1' })).toBeVisible();
  const radio = page.getByRole('radio').first();
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
  await page.route('**/api/diagnostic-v2', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporary connection failure; retry your response.' }),
      });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Temporary connection failure' }),
  ).toContainText('Temporary connection failure');
  await expect(radio).toBeChecked();
  await expect(page.getByRole('button', { name: 'Submit response' })).toBeEnabled();
  await page.unroute('**/api/diagnostic-v2');
  await page.getByRole('button', { name: 'Submit response' }).click();
  await expect(page.getByRole('heading', { name: 'One more piece' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to next task' }).click();
  await expect(page.getByRole('heading', { name: 'Task 2' })).toBeFocused();
  await page.screenshot({ path: 'test-results/adaptive-question-mobile.png', fullPage: true });
});
