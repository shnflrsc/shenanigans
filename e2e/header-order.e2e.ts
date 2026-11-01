import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await sql(`delete from tags where slug = 'e2e-order'`);
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await sql(`delete from tags where slug = 'e2e-order'`);
	await resetRateLimits();
});

const top = async (locator: import('@playwright/test').Locator) => (await locator.boundingBox())!.y;
const bottom = async (locator: import('@playwright/test').Locator) => {
	const box = (await locator.boundingBox())!;
	return box.y + box.height;
};

test('post and project headers: title, summary, info, tags, (facts), then the border', async ({
	page,
	browser
}) => {
	await page.goto('/admin/posts/new');
	await page.getByLabel('Title').fill('E2E Order Post');
	await page.getByLabel('Excerpt').fill('Order excerpt');
	await page.locator('#body').fill('Body');
	await page.getByLabel('New tag').fill('E2E Order');
	await page.getByRole('button', { name: 'Add' }).click();
	await expect(page.getByRole('button', { name: 'E2E Order', pressed: true })).toBeVisible();
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	await page.goto('/admin/projects/new');
	await page.getByLabel('Title').fill('E2E Order Project');
	await page.getByLabel('Summary').fill('Order summary');
	await page.getByLabel('Year').fill('2026');
	await page.getByLabel('Role').fill('Solo');
	await page.getByLabel('New tag').fill('E2E Order');
	await page.getByRole('button', { name: 'Add' }).click();
	await expect(page.getByRole('button', { name: 'E2E Order', pressed: true })).toBeVisible();
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	const visitor = await (
		await browser.newContext({ viewport: { width: 1280, height: 900 } })
	).newPage();
	for (const path of ['/blog/e2e-order-post', '/projects/e2e-order-project']) {
		await expect
			.poll(async () => (await visitor.request.get(path)).status(), { timeout: 60_000 })
			.toBe(200);
		await visitor.goto(path);
		const header = visitor.locator('main header');
		const info = header.locator('p').nth(1);
		const tags = header.getByRole('list', { name: 'Tags' });
		await expect(tags, path).toBeVisible();
		// The info line comes first, the tags sit under it, and everything is inside the header above its border.
		expect(await top(tags), path).toBeGreaterThan(await bottom(info));
		expect(await bottom(tags), path).toBeLessThanOrEqual(await bottom(header));
		if (path.startsWith('/projects')) {
			const facts = header.locator('dl').locator('xpath=..'); // dl is display: contents
			expect(await top(facts), path).toBeGreaterThan(await bottom(tags));
			expect(await bottom(facts), path).toBeLessThanOrEqual(await bottom(header));
		}
	}
});
