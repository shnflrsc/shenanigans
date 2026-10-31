import { expect, test } from '@playwright/test';

test.describe('theme', () => {
	test.use({ colorScheme: 'dark' });

	test('follows the system setting before first paint, with no flash', async ({ page }) => {
		// Record data-theme as soon as the document element exists, before the page paints.
		await page.addInitScript(() => {
			(window as unknown as { __seen: string[] }).__seen = [];
			new MutationObserver(() => {
				(window as unknown as { __seen: string[] }).__seen.push(
					document.documentElement.dataset.theme ?? 'none'
				);
			}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		});
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
		expect(seen.every((value) => value === 'dark')).toBe(true);
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 25, 25)');
	});

	test('manual toggle overrides the system and persists across reloads', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Switch to light theme' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		await page.reload();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	});
});
