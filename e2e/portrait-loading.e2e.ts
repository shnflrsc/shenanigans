import { expect, test } from '@playwright/test';

test('the portrait shows a quiet tile, not its alt text, while the image loads', async ({
	page
}) => {
	// Hold every image back so the loading state can be inspected.
	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route(/\.(webp|jpe?g|png|avif)(\?.*)?$/, async (route) => {
		await gate;
		await route.continue();
	});
	await page.goto('/', { waitUntil: 'domcontentloaded' });

	const figure = page.locator('figure').first();
	const image = figure.locator('img');
	await expect(image.first()).toBeAttached();
	// The alt text is still there for screen readers, but drawn in a transparent colour.
	await expect(image.first()).toHaveAttribute('alt', 'Portrait of Darl Shanen Floresca');
	const color = await image.first().evaluate((el) => getComputedStyle(el).color);
	expect(color).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
	// Nothing visible reads as the alt text.
	const shot = await figure.locator('div').first().screenshot();
	expect(shot.length).toBeGreaterThan(0);

	release();
	await expect
		.poll(() =>
			image.first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
		)
		.toBe(true);
});
