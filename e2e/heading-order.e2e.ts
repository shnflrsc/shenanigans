import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await resetRateLimits();
});

/** Heading levels must not skip: on pages whose title is the h1, the card titles are h2s. */
const levels = (page: import('@playwright/test').Page) =>
	page.evaluate(() =>
		[...document.querySelectorAll('main h1, main h2, main h3')].map((h) => Number(h.tagName[1]))
	);

test('Projects and Blog card titles are h2 under the h1, with no skipped level', async ({
	page,
	context
}) => {
	await page.goto('/admin/posts/new');
	await page.getByLabel('Title').fill('E2E Heading Post');
	await page.getByLabel('Excerpt').fill('x');
	await page.locator('#body').fill('Body');
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	await page.goto('/admin/projects/new');
	await page.getByLabel('Title').fill('E2E Heading Project');
	await page.getByLabel('Summary').fill('x');
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
	await context.clearCookies();

	for (const path of ['/blog', '/projects']) {
		await expect
			.poll(async () => (await levels(await (await page.goto(path), page))).includes(2), {
				timeout: 60_000
			})
			.toBe(true);
		const found = await levels(page);
		expect(found[0], path).toBe(1);
		for (let i = 1; i < found.length; i++) {
			expect(found[i] - found[i - 1], `${path} heading ${i}`).toBeLessThanOrEqual(1);
		}
	}
});
