import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await sql(`delete from projects where slug like 'e2e-%'`);
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from projects where slug like 'e2e-%'`);
	await resetRateLimits();
});

test('editing a published project and pressing Save stores every change', async ({ page }) => {
	await page.goto('/admin/projects/new');
	await page.getByLabel('Title').fill('E2E Edit Save');
	await page.getByLabel('Summary').fill('First summary');
	await page.locator('#body').fill('First body');
	await page.getByLabel('Live URL').fill('https://example.com/one');
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
	await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
	// Open the saved project fresh, as the owner would.
	await page.reload();
	await expect(page.getByLabel('Title')).toHaveValue('E2E Edit Save');

	await page.getByLabel('Title').fill('E2E Edit Save Changed');
	await page.getByLabel('Summary').fill('Second summary');
	await page.locator('#body').fill('Second body');
	await page.getByLabel('Live URL').fill('https://example.com/two');
	await page.getByLabel('Role').fill('Lead');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByText('Saved.', { exact: true })).toBeVisible();

	const [row] = await sql<{
		title: string;
		summary: string;
		body: string;
		live_url: string;
		role: string;
	}>(`select title, summary, body, live_url, role from projects where slug = 'e2e-edit-save'`);
	expect(row).toEqual({
		title: 'E2E Edit Save Changed',
		summary: 'Second summary',
		body: 'Second body',
		live_url: 'https://example.com/two',
		role: 'Lead'
	});

	await page.reload();
	await expect(page.getByLabel('Summary')).toHaveValue('Second summary');
});

test('the project page has no Case study label and Live site and Source are label and value rows in the facts card', async ({
	page,
	browser
}) => {
	await page.goto('/admin/projects/new');
	await page.getByLabel('Title').fill('E2E Page Layout');
	await page.getByLabel('Summary').fill('Layout summary');
	await page.getByLabel('Year').fill('2026');
	await page.getByLabel('Role').fill('Solo');
	await page.getByLabel('Live URL').fill('https://example.com/live');
	await page.getByLabel('Repository URL').fill('https://example.com/repo');
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	const visitor = await (
		await browser.newContext({ viewport: { width: 1280, height: 800 } })
	).newPage();
	await expect
		.poll(async () => (await visitor.request.get('/projects/e2e-page-layout')).status(), {
			timeout: 60_000
		})
		.toBe(200);
	await visitor.goto('/projects/e2e-page-layout');
	await expect(visitor.getByText('Case study', { exact: true })).toHaveCount(0);

	// Project cards have no Case study button either; the card itself links to the project.
	await visitor.goto('/projects');
	await expect(visitor.getByRole('link', { name: 'E2E Page Layout' })).toBeVisible();
	await expect(visitor.getByRole('link', { name: 'Case study' })).toHaveCount(0);
	await visitor.goto('/projects/e2e-page-layout');
	// Year, role and team share the first row; Live site and Source the second, each as a label and its link.
	const rows = visitor.locator('main header dl');
	await expect(rows).toHaveCount(2);
	await expect(rows.nth(0)).toContainText('Year');
	await expect(rows.nth(0)).toContainText('My role');
	await expect(rows.nth(0)).not.toContainText('Live site');
	await expect(rows.nth(1)).toContainText('Live site');
	await expect(rows.nth(1)).toContainText('Source');
	await expect(rows.nth(1).locator('a[href="https://example.com/live"]')).toHaveText(
		'example.com/live'
	);
	expect((await rows.nth(1).boundingBox())!.y).toBeGreaterThan(
		(await rows.nth(0).boundingBox())!.y
	);
	await expect(visitor.getByRole('button', { name: 'Live site' })).toHaveCount(0);
	// No cover was uploaded, so there is no grey cover box on the page.
	await expect(visitor.locator('main [class*="16/10"]')).toHaveCount(0);
});

test('the cover image field says which size to upload', async ({ page }) => {
	await page.goto('/admin/projects/new');
	await expect(page.getByText('Recommended: 1600 × 1000 px (16:10)')).toBeVisible();
	await page.goto('/admin/posts/new');
	await expect(page.getByText('Recommended: 1600 × 900 px (16:9)')).toBeVisible();
});
