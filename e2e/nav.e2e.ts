import { expect, test } from '@playwright/test';

test.describe('phone menu (640px and narrower)', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test('collapses the links and the icon links into a menu', async ({ page }) => {
		await page.goto('/');
		const header = page.locator('header');
		await expect(header.getByRole('link', { name: 'Shenanigans' })).toBeVisible();
		await expect(header.getByRole('button', { name: /Switch to/ })).toBeVisible();
		await expect(header.getByRole('button', { name: 'Open menu' })).toBeVisible();
		await expect(header.getByRole('navigation', { name: 'Main' })).toBeHidden();
		await expect(header.getByRole('link', { name: 'GitHub' })).toBeHidden();
	});

	test('opens, sets aria-expanded, and has tall tap rows and the icon links', async ({ page }) => {
		await page.goto('/projects');
		const button = page.getByRole('button', { name: 'Open menu' });
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await expect(button).toHaveAttribute('aria-controls', 'site-mobile-menu');
		await button.click();
		await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		const panel = page.locator('#site-mobile-menu');
		await expect(panel).toBeVisible();
		const links = panel.getByRole('navigation', { name: 'Mobile' }).getByRole('link');
		await expect(links).toHaveText(['Home', 'Projects', 'Blog']);
		for (const link of await links.all()) {
			expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(48);
		}
		await expect(panel.getByRole('link', { name: 'Projects' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		for (const name of ['Email', 'GitHub', 'LinkedIn']) {
			const box = await panel.getByRole('link', { name }).boundingBox();
			expect(box!.width).toBeGreaterThanOrEqual(44);
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
	});

	test('closes on Escape and returns focus to the menu button', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await expect(page.locator('#site-mobile-menu')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.locator('#site-mobile-menu')).toBeHidden();
		await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
		await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	test('closes when a link is tapped', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.locator('#site-mobile-menu').getByRole('link', { name: 'Blog' }).click();
		await expect(page).toHaveURL(/\/blog$/);
		await expect(page.locator('#site-mobile-menu')).toBeHidden();
	});

	test('is reachable by keyboard', async ({ page }) => {
		await page.goto('/');
		const button = page.getByRole('button', { name: 'Open menu' });
		await button.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('#site-mobile-menu')).toBeVisible();
		await page.keyboard.press('Tab');
		await expect(page.locator('#site-mobile-menu a').first()).toBeFocused();
	});
});

test.describe('footer', () => {
	test('sits at the bottom of the viewport on a short page', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 1400 });
		await page.goto('/blog');
		const footer = await page.locator('footer').boundingBox();
		expect(Math.round(footer!.y + footer!.height)).toBe(1400);
	});

	test('is one compact row on every page', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/blog');
		const footer = await page.locator('footer').boundingBox();
		expect(footer!.height).toBeLessThan(80);
	});
});
