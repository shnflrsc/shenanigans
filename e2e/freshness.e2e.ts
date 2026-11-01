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

/** Public pages must reflect an admin change within 60 seconds (PR-6). Without a CDN in front, it is immediate. */
const WITHIN = { timeout: 60_000 };

test.describe('Freshness (PR-6)', () => {
	test('a post: publish, edit, unpublish and delete reach the public site', async ({
		page,
		browser
	}) => {
		const visitor = await (await browser.newContext()).newPage();
		const status = async (path: string) => (await visitor.request.get(path)).status();
		const text = async (path: string) => (await visitor.request.get(path)).text();

		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Fresh Post');
		await page.getByLabel('Excerpt').fill('Fresh excerpt');
		await page.locator('#body').fill('Fresh body');
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

		await expect.poll(() => status('/blog/e2e-fresh-post'), WITHIN).toBe(200);
		await visitor.goto('/blog');
		await expect(visitor.getByText('E2E Fresh Post')).toBeVisible();
		await expect
			.poll(async () => (await text('/sitemap.xml')).includes('e2e-fresh-post'), WITHIN)
			.toBe(true);

		await page.getByLabel('Title').fill('E2E Fresh Post Edited');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByText('All changes saved')).toBeVisible();
		await expect
			.poll(
				async () => (await text('/blog/e2e-fresh-post')).includes('E2E Fresh Post Edited'),
				WITHIN
			)
			.toBe(true);

		await page.getByRole('button', { name: 'Unpublish' }).click();
		await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
		await expect.poll(() => status('/blog/e2e-fresh-post'), WITHIN).toBe(404);
		await expect
			.poll(async () => (await text('/sitemap.xml')).includes('e2e-fresh-post'), WITHIN)
			.toBe(false);

		await page.getByRole('button', { name: 'Delete post' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Delete post' }).click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
		expect(await status('/blog/e2e-fresh-post')).toBe(404);
		await visitor.context().close();
	});

	test('a project: publish and tag counts reach the public site', async ({ page, browser }) => {
		const visitor = await (await browser.newContext()).newPage();
		await page.goto('/admin/projects/new');
		await page.getByLabel('Title').fill('E2E Fresh Project');
		await page.getByLabel('Summary').fill('Fresh summary');
		await page.getByRole('button', { name: 'Svelte', exact: true }).click();
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

		await expect
			.poll(async () => (await visitor.request.get('/projects/e2e-fresh-project')).status(), WITHIN)
			.toBe(200);
		await expect(async () => {
			await visitor.goto('/projects');
			await expect(visitor.getByRole('link', { name: /^Svelte 3$/ })).toBeVisible({
				timeout: 1000
			});
		}).toPass(WITHIN);
		await page.getByRole('button', { name: 'Unpublish' }).click();
		await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
		// A browser may show a stale copy for a few seconds while it revalidates, so look again until fresh.
		await expect(async () => {
			await visitor.goto('/projects');
			await expect(visitor.getByRole('link', { name: /^Svelte 2$/ })).toBeVisible({
				timeout: 1000
			});
		}).toPass(WITHIN);
		await visitor.context().close();
	});

	test('saving says what happened, with no note about the public page', async ({ page }) => {
		const note = page.getByText('up to a minute');
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Note');
		await page.getByLabel('Excerpt').fill('x');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page.getByText('Draft saved.')).toBeVisible();
		await expect(note).toHaveCount(0);
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByText('Published.', { exact: true })).toBeVisible();
		await expect(note).toHaveCount(0);
	});
});
