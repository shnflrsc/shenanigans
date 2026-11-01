import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

const publicPages = [
	'/',
	'/projects',
	'/blog',
	'/projects/sample-handbook-assistant',
	'/blog/sample-first-post',
	'/nope-404'
];

async function audit(page: Page, label: string) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	const serious = results.violations.filter(
		(v) => v.impact === 'serious' || v.impact === 'critical'
	);
	expect(
		serious.map(
			(v) =>
				`${label}: ${v.id} (${v.impact}) ${v.nodes
					.slice(0, 3)
					.map((n) => n.target.join(' '))
					.join(' | ')}`
		)
	).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
	test.describe(`accessibility, ${theme} theme`, () => {
		test.use({ colorScheme: theme });

		for (const path of publicPages) {
			test(`public ${path}`, async ({ page }) => {
				await page.goto(path);
				await page.waitForLoadState('networkidle');
				await audit(page, `${theme} ${path}`);
			});
		}

		test('public phone width with the menu open', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 812 });
			await page.goto('/');
			await page.getByRole('button', { name: 'Open menu' }).click();
			await audit(page, `${theme} phone menu`);
		});

		test('admin screens', async ({ page, context }) => {
			await resetRateLimits();
			await signInAsAdmin(context);
			for (const path of [
				'/admin/posts',
				'/admin/projects',
				'/admin/tags',
				'/admin/posts/new',
				'/admin/projects/new'
			]) {
				await page.goto(path);
				await page.waitForLoadState('networkidle');
				await audit(page, `${theme} ${path}`);
			}
			const [post] = await sql<{ id: string }>(
				`select id from posts where slug = 'sample-first-post'`
			);
			await page.goto(`/admin/posts/${post.id}`);
			await page.waitForLoadState('networkidle');
			await audit(page, `${theme} post editor`);
			await resetRateLimits();
		});

		test('login screen', async ({ page }) => {
			await resetRateLimits();
			await page.goto('/admin');
			await audit(page, `${theme} login`);
			await page.goto('/admin?notice=denied');
			await audit(page, `${theme} login denied`);
			await resetRateLimits();
		});
	});
}
