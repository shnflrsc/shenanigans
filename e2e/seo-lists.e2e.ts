import { expect, test } from '@playwright/test';

const robots = (page: import('@playwright/test').Page) =>
	page.locator('meta[name="robots"]').getAttribute('content');

test.describe('filtered and paged lists', () => {
	test('the unfiltered lists are indexable', async ({ page }) => {
		for (const path of ['/projects', '/blog']) {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]'), path).toHaveCount(0);
		}
	});

	test('a tag filter is shareable but not indexed, and points at the plain list', async ({
		page
	}) => {
		for (const [path, list] of [
			['/projects?tag=svelte', '/projects'],
			['/blog?tag=svelte', '/blog']
		]) {
			await page.goto(path);
			expect(await robots(page), path).toBe('noindex, follow');
			await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute(
				'href',
				`https://shenanigans.is-a.dev${list}`
			);
		}
	});

	test('an unknown tag shows the plain list, so it stays indexable', async ({ page }) => {
		await page.goto('/blog?tag=does-not-exist');
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	});
});
