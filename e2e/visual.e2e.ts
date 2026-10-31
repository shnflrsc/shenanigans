import { mkdirSync } from 'node:fs';
import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

/**
 * Captures every page in light, dark and phone widths to test-results/visual/ so they can be compared with
 * the designs by eye (PLAN.md M8-3). The assertions only guard against blank or broken pages.
 */
const out = 'test-results/visual';
mkdirSync(out, { recursive: true });

const sizes = {
	desktop: { width: 1280, height: 900 },
	phone: { width: 390, height: 844 }
} as const;

const publicPages: [string, string][] = [
	['home', '/'],
	['projects', '/projects'],
	['project', '/projects/sample-handbook-assistant'],
	['blog', '/blog'],
	['post', '/blog/sample-first-post'],
	['not-found', '/nope']
];

for (const theme of ['light', 'dark'] as const) {
	for (const [size, viewport] of Object.entries(sizes)) {
		test.describe(`${theme} ${size}`, () => {
			test.use({ colorScheme: theme, viewport });

			for (const [name, path] of publicPages) {
				test(`public ${name}`, async ({ page }) => {
					await page.goto(path);
					await page.waitForLoadState('networkidle');
					await expect(page.locator('body')).not.toBeEmpty();
					await page.screenshot({ path: `${out}/${theme}-${size}-${name}.png`, fullPage: true });
				});
			}

			test('admin screens', async ({ page, context }) => {
				await resetRateLimits();
				await signInAsAdmin(context);
				const [post] = await sql<{ id: string }>(
					`select id from posts where slug = 'sample-first-post'`
				);
				const [project] = await sql<{ id: string }>(
					`select id from projects where slug = 'sample-handbook-assistant'`
				);
				for (const [name, path] of [
					['admin-posts', '/admin/posts'],
					['admin-projects', '/admin/projects'],
					['admin-tags', '/admin/tags'],
					['admin-post-editor', `/admin/posts/${post.id}`],
					['admin-project-editor', `/admin/projects/${project.id}`]
				]) {
					await page.goto(path);
					await page.waitForLoadState('networkidle');
					await page.screenshot({ path: `${out}/${theme}-${size}-${name}.png`, fullPage: true });
				}
				await resetRateLimits();
			});

			test('login and states', async ({ page }) => {
				await resetRateLimits();
				for (const [name, path] of [
					['login', '/admin'],
					['login-denied', '/admin?notice=denied']
				]) {
					await page.goto(path);
					await page.screenshot({ path: `${out}/${theme}-${size}-${name}.png` });
				}
				await resetRateLimits();
			});
		});
	}
}
