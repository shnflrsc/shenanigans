import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await sql(`delete from projects where slug like 'e2e-%'`);
	await sql(`delete from tags where slug like 'e2e-%'`);
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from projects where slug like 'e2e-%'`);
	await sql(`delete from tags where slug like 'e2e-%'`);
	// Put the development fixtures back as they were.
	await sql(`update projects set featured = false`);
	await sql(`update projects set featured = true where slug = 'sample-handbook-assistant'`);
	await sql(`update projects set sort_order = 0 where slug = 'sample-handbook-assistant'`);
	await sql(`update projects set sort_order = 1 where slug = 'sample-shenanigans'`);
	await sql(`update projects set sort_order = 2 where slug = 'sample-draft-project'`);
	await resetRateLimits();
});

test.describe('Projects list', () => {
	test('shows order, status, featured and year', async ({ page }) => {
		await page.goto('/admin/projects');
		const rows = page.locator('tbody tr');
		await expect(rows).toHaveCount(3);
		await expect(rows.nth(0)).toContainText('Sample: Handbook assistant');
		await expect(rows.nth(0)).toContainText('Featured');
		await expect(rows.nth(2)).toContainText('Draft');
		await expect(
			page.getByRole('button', { name: 'Move Sample: Handbook assistant up' })
		).toBeDisabled();
		await expect(
			page.getByRole('button', { name: 'Move Sample: Draft project down' })
		).toBeDisabled();
	});

	test('move up and down changes the order and the public showcase', async ({ page }) => {
		await page.goto('/admin/projects');
		await page.getByRole('button', { name: 'Move Sample: Shenanigans up' }).click();
		await expect(page.locator('tbody tr').first()).toContainText('Sample: Shenanigans');
		await page.goto('/projects');
		await expect(page.locator('article h3').first()).toContainText('Sample: Shenanigans');
		await page.goto('/admin/projects');
		await page.getByRole('button', { name: 'Move Sample: Shenanigans down' }).click();
		await expect(page.locator('tbody tr').first()).toContainText('Sample: Handbook assistant');
	});

	test('featuring another project turns the first off and offers Undo', async ({ page }) => {
		await page.goto('/admin/projects');
		await page.getByRole('switch', { name: 'Feature Sample: Shenanigans' }).click();
		await expect(page.getByText('Sample: Shenanigans is now featured.')).toBeVisible();
		await expect(page.getByText('Sample: Handbook assistant is no longer featured.')).toBeVisible();
		const featured = await sql<{ slug: string }>(`select slug from projects where featured`);
		expect(featured.map((r) => r.slug)).toEqual(['sample-shenanigans']);
		await page.getByRole('button', { name: 'Undo' }).click();
		await expect
			.poll(
				async () =>
					(await sql<{ slug: string }>(`select slug from projects where featured`))[0]?.slug
			)
			.toBe('sample-handbook-assistant');
	});
});

test.describe('Project editor', () => {
	test('creates, publishes, features, and locks the slug', async ({ page }) => {
		await page.goto('/admin/projects/new');
		await page.getByLabel('Title').fill('E2E Project');
		await page.getByLabel('Summary').fill('A project made by a test.');
		await page.locator('#body').fill('## The problem\n\nSomething.');
		await page.getByLabel('Year').fill('2026');
		await page.getByLabel('Role').fill('Solo');
		await page.getByLabel('Live URL').fill('https://example.com');
		await expect(page.getByLabel('Slug')).toHaveValue('e2e-project');
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
		await expect(page.getByLabel('Slug')).toHaveAttribute('readonly', '');

		await page.goto('/projects/e2e-project');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E Project');
		await expect(page.getByText('The problem')).toBeVisible();
	});

	test('the details are plain fields below the case study: no side card, no Status field, no hints', async ({
		page
	}) => {
		await page.goto('/admin/projects/new');
		await expect(page.locator('main aside')).toHaveCount(0);
		await expect(page.getByLabel('Status')).toHaveCount(0);
		// Everything after the title and the case study sits lower on the page, in one column.
		const body = await page.locator('#body').boundingBox();
		for (const label of ['Summary', 'Slug', 'Year', 'Role', 'Team', 'Live URL', 'Repository URL']) {
			const box = await page.getByLabel(label).boundingBox();
			expect(box!.y, label).toBeGreaterThan(body!.y + body!.height);
		}
		await expect(page.getByText('Shown on cards')).toHaveCount(0);
		await expect(page.getByText('Made from the title')).toHaveCount(0);
		await expect(page.getByText('For example Solo')).toHaveCount(0);
	});

	test('rejects an unsafe link and keeps the text', async ({ page }) => {
		await page.goto('/admin/projects/new');
		await page.getByLabel('Title').fill('E2E Bad Link');
		await page.getByLabel('Summary').fill('x');
		await page.getByLabel('Live URL').fill('javascript:alert(1)');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page.getByText('Use a full link starting with https://')).toBeVisible();
		await expect(page.getByLabel('Title')).toHaveValue('E2E Bad Link');
	});

	test('featured switch names the project that will lose the flag', async ({ page }) => {
		await page.goto('/admin/projects/new');
		await page.getByLabel('Title').fill('E2E Featured Hint');
		await page.getByLabel('Summary').fill('x');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
		const featuredSwitch = page.getByRole('switch', { name: 'Featured' });
		await expect(featuredSwitch).toHaveAccessibleDescription(
			'Turning this on removes the flag from Sample: Handbook assistant.'
		);
		await featuredSwitch.click();
		await expect
			.poll(
				async () =>
					(await sql<{ slug: string }>(`select slug from projects where featured`))[0]?.slug
			)
			.toBe('e2e-featured-hint');
	});
});

test.describe('Tags admin', () => {
	test('creates, renames inline with a slug preview, and deletes with counts', async ({ page }) => {
		await page.goto('/admin/tags');
		await page.getByLabel('New tag').fill('E2E Tag One');
		await page.getByRole('button', { name: 'Create tag' }).click();
		await expect(page.getByRole('row', { name: /E2E Tag One/ })).toContainText('e2e-tag-one');

		// Near-duplicates are refused.
		await page.getByLabel('New tag').fill('e2e tag one');
		await page.getByRole('button', { name: 'Create tag' }).click();
		await expect(page.getByText('already exists')).toBeVisible();

		await page.getByRole('button', { name: 'Rename E2E Tag One' }).click();
		const input = page.getByLabel('New name for E2E Tag One');
		await input.fill('E2E Renamed Tag');
		await expect(page.getByText('e2e-renamed-tag')).toBeVisible();
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByRole('row', { name: /E2E Renamed Tag/ })).toContainText(
			'e2e-renamed-tag'
		);

		await sql(
			`insert into post_tags select p.id, t.id from posts p, tags t where p.slug = 'sample-first-post' and t.slug = 'e2e-renamed-tag'`
		);
		await page.reload();
		await page.getByRole('button', { name: 'Delete E2E Renamed Tag' }).click();
		const dialog = page.getByRole('alertdialog');
		await expect(dialog).toContainText('used by 1 post and 0 projects');
		await expect(dialog).toContainText('stay untouched');
		await dialog.getByRole('button', { name: 'Delete tag' }).click();
		await expect(page.getByRole('row', { name: /E2E Renamed Tag/ })).toHaveCount(0);
		expect(await sql(`select 1 from posts where slug = 'sample-first-post'`)).toHaveLength(1);
	});
});
