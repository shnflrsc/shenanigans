import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await resetRateLimits();
});

test.describe('Posts list', () => {
	test('lists all posts with status badges and filters by status', async ({ page }) => {
		await page.goto('/admin/posts');
		const rows = page.locator('tbody tr');
		await expect(rows).toHaveCount(4);
		await expect(page.getByRole('row', { name: /Sample: Draft post/ })).toContainText('Draft');
		await expect(
			page.getByRole('row', { name: /What I learned building a handbook assistant/ })
		).toContainText('Published');
		await page.getByRole('tab', { name: 'Drafts' }).click();
		await expect(page).toHaveURL(/status=draft/);
		await expect(page.locator('tbody tr')).toHaveCount(1);
		await page.getByRole('tab', { name: 'Published' }).click();
		await expect(page.locator('tbody tr')).toHaveCount(3);
	});

	test('publishes and unpublishes from the row menu', async ({ page }) => {
		await sql(
			`insert into posts (slug, title, excerpt, body) values ('e2e-toggle', 'E2E toggle', 'x', 'body')`
		);
		await page.goto('/admin/posts');
		const row = page.getByRole('row', { name: /E2E toggle/ });
		await row.getByRole('button', { name: /Actions for E2E toggle/ }).click();
		await page.getByRole('menuitem', { name: 'Publish' }).click();
		await expect(row).toContainText('Published');
		const [after] = await sql<{ status: string; published_at: string | null }>(
			`select status, published_at from posts where slug = 'e2e-toggle'`
		);
		expect(after.status).toBe('published');
		expect(after.published_at).not.toBeNull();
		await expect(
			page.getByText('The public page can take up to a minute to update.')
		).toBeVisible();

		await row.getByRole('button', { name: /Actions for E2E toggle/ }).click();
		await page.getByRole('menuitem', { name: 'Unpublish' }).click();
		await expect(row).toContainText('Draft');
	});

	test('asks for confirmation before deleting, and Cancel keeps the post', async ({ page }) => {
		await sql(
			`insert into posts (slug, title, excerpt, body) values ('e2e-delete', 'E2E delete me', 'x', 'body')`
		);
		await page.goto('/admin/posts');
		const open = async () => {
			await page
				.getByRole('row', { name: /E2E delete me/ })
				.getByRole('button', { name: /Actions for/ })
				.click();
			await page.getByRole('menuitem', { name: 'Delete' }).click();
		};
		await open();
		const dialog = page.getByRole('alertdialog');
		await expect(dialog).toContainText('Delete this post?');
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
		await expect(page.getByRole('row', { name: /E2E delete me/ })).toBeVisible();

		await open();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Delete post' }).click();
		await expect(page.getByRole('row', { name: /E2E delete me/ })).toHaveCount(0);
		expect(await sql(`select 1 from posts where slug = 'e2e-delete'`)).toHaveLength(0);
	});

	test('shows the empty state with New post when there are no posts', async ({ page }) => {
		await sql(`delete from posts where slug like 'e2e-%'`);
		await page.goto('/admin/posts?status=draft');
		await sql(`update posts set status = 'published' where slug = 'sample-draft-post'`);
		try {
			await page.reload();
			await expect(page.getByRole('heading', { name: 'No draft posts' })).toBeVisible();
			await expect(page.getByRole('link', { name: 'New post' }).last()).toBeVisible();
		} finally {
			await sql(`update posts set status = 'draft' where slug = 'sample-draft-post'`);
		}
	});

	test('is a table on desktop and keeps title, status and actions on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/admin/posts');
		await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
		await expect(
			page
				.getByRole('row', { name: /Sample: Draft post/ })
				.getByRole('button', { name: /Actions for/ })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	});
});
