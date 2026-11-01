import type { Page } from '@playwright/test';
import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits } from './db';

/** Motion v2 (D23): one slide-in fade, on whole sections only. */

const states = (page: Page) =>
	page.evaluate(() =>
		[...document.querySelectorAll('[data-reveal]')].map((el) =>
			el.classList.contains('reveal-in') ? 'in' : 'hidden'
		)
	);

const opacity = (page: Page, index: number) =>
	page.evaluate(
		(i) => Number(getComputedStyle(document.querySelectorAll('[data-reveal]')[i]).opacity),
		index
	);

test.describe('the first section slides in on load', () => {
	test('as one block, with nothing inside it animating on its own', async ({ page }) => {
		await page.goto('/');
		const first = page.locator('[data-enter]');
		await expect(first).toHaveCount(1);
		expect(await first.evaluate((el) => getComputedStyle(el).animationName)).toBe('slide-fade');
		expect(await first.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('0.6s');

		// Headline lines, buttons and the photo have no animation of their own.
		const inner = await first.evaluate((el) =>
			[...el.querySelectorAll('*')].reduce((n, child) => n + child.getAnimations().length, 0)
		);
		expect(inner).toBe(0);
		// The header and footer do not animate.
		expect(await page.locator('header').evaluate((el) => el.getAnimations().length)).toBe(0);
		expect(await page.locator('footer').evaluate((el) => el.getAnimations().length)).toBe(0);
	});

	test('the photo is not faded on its own', async ({ page }) => {
		await page.goto('/');
		const photoAnimations = await page
			.locator('figure')
			.first()
			.evaluate((el) => el.getAnimations().length);
		expect(photoAnimations).toBe(0);
	});

	test('every page type has exactly one entering section', async ({ page }) => {
		for (const path of ['/', '/projects', '/blog', '/nope']) {
			await page.goto(path);
			await expect(page.locator('[data-enter]'), path).toHaveCount(1);
		}
	});
});

test.describe('later sections slide in as you scroll', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('they start hidden, including one peeking into the first screen, and animate smoothly', async ({
		page
	}) => {
		await page.goto('/');
		const samples: number[] = [];
		for (let i = 0; i < 10; i++) {
			samples.push(await opacity(page, 0));
			await page.waitForTimeout(80);
		}
		// The About section (peeking in at load) starts transparent and ends opaque.
		expect(samples[0]).toBeLessThan(0.1);
		await expect.poll(() => opacity(page, 0)).toBe(1);
	});

	test('each section plays once: slow scroll', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		for (let y = 0; y < 5000; y += 250) {
			await page.mouse.wheel(0, 250);
			await page.waitForTimeout(80);
		}
		await expect.poll(() => states(page)).not.toContain('hidden');
		// Scrolling back up never hides or replays anything.
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(700);
		expect(await states(page)).not.toContain('hidden');
		expect(await opacity(page, 2)).toBe(1);
	});

	test('a jump to the bottom still shows every section', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect.poll(() => states(page)).not.toContain('hidden');
	});

	test('only whole sections animate: nothing inside has its own transition or delay', async ({
		page
	}) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const marked = await page.locator('[data-reveal], [data-enter]').count();
		const sections = await page.locator('main section').count();
		expect(marked).toBe(sections);
		const stray = await page.evaluate(
			() =>
				[...document.querySelectorAll('main *')].filter((el) => {
					if (el.matches('[data-reveal], [data-enter]')) return false;
					const s = getComputedStyle(el);
					return s.animationName !== 'none' && s.animationName !== '';
				}).length
		);
		expect(stray).toBe(0);
	});

	test('the page does not shift while sections slide in (CLS stays 0)', async ({ page }) => {
		await page.addInitScript(() => {
			(window as unknown as { __cls: number }).__cls = 0;
			new PerformanceObserver((list) => {
				for (const e of list.getEntries() as unknown as {
					value: number;
					hadRecentInput: boolean;
				}[]) {
					if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
				}
			}).observe({ type: 'layout-shift', buffered: true });
		});
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		for (let y = 0; y <= 4000; y += 400) {
			await page.evaluate((top) => window.scrollTo(0, top), y);
			await page.waitForTimeout(120);
		}
		await page.waitForTimeout(800);
		expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(
			0.01
		);
	});

	test('the section background band stays still; only the content moves', async ({ page }) => {
		await page.goto('/');
		const band = page.locator('main section').nth(2);
		expect(await band.evaluate((el) => el.getAnimations().length)).toBe(0);
		expect(await band.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
	});
});

test.describe('nothing is ever stuck hidden', () => {
	test.describe('reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('every section is visible at once, with no animation or transform', async ({ page }) => {
			await page.goto('/');
			const all = await page.locator('[data-enter], [data-reveal]').evaluateAll((els) =>
				els.map((el) => {
					const s = getComputedStyle(el);
					return { opacity: s.opacity, animation: s.animationName, transform: s.transform };
				})
			);
			expect(all.length).toBeGreaterThan(1);
			for (const s of all) {
				expect(s.opacity).toBe('1');
				expect(s.animation).toBe('none');
				expect(s.transform).toBe('none');
			}
		});
	});

	test.describe('JavaScript off', () => {
		test.use({ javaScriptEnabled: false });

		test('all content is visible', async ({ page }) => {
			await page.goto('/');
			await page.waitForTimeout(1200);
			for (const text of ['About me', 'Featured', 'Latest posts']) {
				await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
			}
			const opacities = await page
				.locator('[data-reveal], [data-enter]')
				.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
			expect(opacities.every((o) => o === '1')).toBe(true);
		});
	});

	test('if the page script never loads, sections appear by themselves after 2.5 seconds', async ({
		page
	}) => {
		await page.route('**/_app/**/*.js', (route) => route.abort());
		await page.goto('/');
		await page.waitForTimeout(3200);
		for (const text of ['About me', 'Featured', 'Latest posts']) {
			await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
		}
		const opacities = await page
			.locator('[data-reveal]')
			.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
		expect(opacities.every((o) => o === '1')).toBe(true);
	});
});

test.describe('the admin stays quiet', () => {
	test('no entrances or reveals in the dashboard', async ({ page, context }) => {
		await resetRateLimits();
		await signInAsAdmin(context);
		await page.goto('/admin/posts');
		await expect(page.locator('[data-enter], [data-reveal]')).toHaveCount(0);
		await page.goto('/admin/posts/new');
		await expect(page.locator('[data-enter], [data-reveal]')).toHaveCount(0);
		await resetRateLimits();
	});
});
