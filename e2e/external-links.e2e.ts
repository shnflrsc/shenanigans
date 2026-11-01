import { expect, test } from '@playwright/test';

/** Every link to another site opens in a new tab and cannot reach back into this one. */
const external = async (page: import('@playwright/test').Page) => {
	const links = page.locator('a[href^="http"]');
	const count = await links.count();
	for (let i = 0; i < count; i++) {
		const link = links.nth(i);
		const href = await link.getAttribute('href');
		if (href?.startsWith('http://localhost') || href?.startsWith('http://127.0.0.1')) continue;
		await expect(link, href ?? '').toHaveAttribute('target', '_blank');
		await expect(link, href ?? '').toHaveAttribute('rel', /noopener/);
		await expect(link, href ?? '').toHaveAttribute('rel', /noreferrer/);
	}
	return count;
};

test.describe('external links open in a new tab', () => {
	test('footer GitHub and LinkedIn', async ({ page }) => {
		await page.goto('/blog');
		const footer = page.locator('footer');
		await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/shnflrsc'
		);
		await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank');
		await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
			'target',
			'_blank'
		);
		await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
			'rel',
			'noopener noreferrer'
		);
	});

	test('Home contact box and footer', async ({ page }) => {
		await page.goto('/');
		expect(await external(page)).toBeGreaterThanOrEqual(4);
	});

	test('same-site links and email stay in the same tab', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'View projects' })).not.toHaveAttribute(
			'target',
			/.+/
		);
		await expect(page.locator('footer').getByRole('link', { name: 'Email' })).not.toHaveAttribute(
			'target',
			/.+/
		);
		await expect(page.locator('header').getByRole('link', { name: 'Blog' })).not.toHaveAttribute(
			'target',
			/.+/
		);
	});

	test('a click really opens a new tab', async ({ page, context }) => {
		await page.goto('/');
		const [popup] = await Promise.all([
			context.waitForEvent('page'),
			page.locator('footer').getByRole('link', { name: 'GitHub' }).click()
		]);
		expect(popup.url()).toContain('github.com');
		expect(page.url()).toMatch(/localhost:4173\/$/);
		await popup.close();
	});
});
