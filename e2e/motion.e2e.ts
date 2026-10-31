import type { Page } from '@playwright/test';
import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

/** Wraps document.startViewTransition so tests can count how often the page asks for one. */
const countViewTransitions = (page: Page) =>
	page.addInitScript(() => {
		const w = window as unknown as { __vt: number };
		w.__vt = 0;
		const original = document.startViewTransition?.bind(document);
		if (original) {
			document.startViewTransition = ((...args: Parameters<typeof original>) => {
				w.__vt += 1;
				return original(...args);
			}) as typeof document.startViewTransition;
		}
	});
const transitions = (page: Page) =>
	page.evaluate(() => (window as unknown as { __vt: number }).__vt);

const style = (page: Page, selector: string, property: string) =>
	page
		.locator(selector)
		.first()
		.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

test.describe('load entrances', () => {
	test('the headline arrives line by line, then subtitle and buttons; the photo scales without fading', async ({
		page
	}) => {
		await page.goto('/');
		const lines = page.locator('h1 [data-enter]');
		await expect(lines).toHaveCount(2);
		expect(await lines.nth(0).evaluate((el) => getComputedStyle(el).animationName)).toBe('enter');
		expect(await lines.nth(0).evaluate((el) => getComputedStyle(el).animationDelay)).toBe('0s');
		expect(await lines.nth(1).evaluate((el) => getComputedStyle(el).animationDelay)).toBe('0.08s');

		const photo = page.locator('figure[data-enter="scale"]');
		expect(await photo.evaluate((el) => getComputedStyle(el).animationName)).toBe('scale-in');
		// No opacity keyframe on the photo, so the largest paint is never delayed.
		const animatesOpacity = await photo.evaluate((el) =>
			el
				.getAnimations()
				.some((a) => (a as CSSAnimation).effect?.getKeyframes().some((k) => 'opacity' in k))
		);
		expect(animatesOpacity).toBe(false);

		// The header does not animate.
		expect(await page.locator('header').evaluate((el) => el.getAnimations().length)).toBe(0);
	});

	test('everything is fully visible once the entrance has finished', async ({ page }) => {
		await page.goto('/');
		await expect
			.poll(() =>
				page
					.locator('[data-enter]')
					.evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === '1'))
			)
			.toBe(true);
	});
});

test.describe('scroll reveals', () => {
	test('below-the-fold content starts hidden, reveals once, and never replays', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const hidden = page.locator('.reveal-hidden');
		expect(await hidden.count()).toBeGreaterThan(0);
		// Content on the first screen is never hidden.
		expect(
			await page
				.locator('h1')
				.evaluate(
					(el) => el.closest('[data-reveal]') !== null && el.closest('.reveal-hidden') !== null
				)
		).toBe(false);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await expect.poll(() => hidden.count()).toBe(0);
		// Scrolling back to the top does not hide anything again.
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(400);
		expect(await hidden.count()).toBe(0);
	});

	test('siblings arrive staggered', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const steps = await page
			.locator('[data-reveal]')
			.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.getPropertyValue('--i')));
		expect(new Set(steps).size).toBeGreaterThan(1);
		expect(Math.max(...steps.map(Number))).toBeLessThanOrEqual(8);
	});

	test('the page does not shift while content reveals (CLS stays 0)', async ({ page }) => {
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
		const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
		expect(cls).toBeLessThan(0.01);
	});
});

test.describe('nothing is ever stuck hidden', () => {
	test.describe('reduced motion', () => {
		test.use({ reducedMotion: 'reduce' });

		test('shows everything at once with no animation', async ({ page }) => {
			await page.goto('/');
			await page.waitForLoadState('networkidle');
			expect(await page.locator('.reveal-hidden').count()).toBe(0);
			const states = await page.locator('[data-enter], [data-reveal]').evaluateAll((els) =>
				els.map((el) => {
					const s = getComputedStyle(el);
					return { opacity: s.opacity, animation: s.animationName, transform: s.transform };
				})
			);
			expect(states.length).toBeGreaterThan(0);
			for (const s of states) {
				expect(s.opacity).toBe('1');
				expect(s.animation).toBe('none');
				expect(s.transform).toBe('none');
			}
		});

		test('asks for no view transitions, on navigation or theme', async ({ page }) => {
			await countViewTransitions(page);
			await page.goto('/');
			await page.locator('header').getByRole('link', { name: 'Blog' }).click();
			await expect(page).toHaveURL(/\/blog$/);
			await page.getByRole('button', { name: /Switch to/ }).click();
			expect(await transitions(page)).toBe(0);
		});

		test('button presses and hovers do not move', async ({ page }) => {
			await page.goto('/');
			const button = page.getByRole('link', { name: 'View projects' });
			await button.hover();
			await page.mouse.down();
			expect(await button.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
			await page.mouse.up();
		});
	});

	test.describe('JavaScript off', () => {
		test.use({ javaScriptEnabled: false });

		test('all content is visible', async ({ page }) => {
			await page.goto('/');
			await page.waitForTimeout(1500);
			for (const text of ['About me', 'Featured', 'Latest posts']) {
				await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
			}
			const opacities = await page
				.locator('h1 span, main section')
				.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
			expect(opacities.every((o) => o === '1')).toBe(true);
		});
	});

	test('script failing to load hides nothing', async ({ page }) => {
		await page.route('**/_app/**/*.js', (route) => route.abort());
		await page.goto('/');
		await page.waitForTimeout(1500);
		expect(await page.locator('.reveal-hidden').count()).toBe(0);
		await expect(page.getByRole('heading', { name: 'Latest posts' })).toBeVisible();
	});

	test('anything left hidden is revealed by the CSS fallback after 2.5 seconds', async ({
		page
	}) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const target = page.locator('main section').last().locator('h2');
		await target.evaluate((el) => {
			const host = el.closest('[data-reveal]') ?? el;
			host.setAttribute('data-reveal', '');
			host.classList.add('reveal-hidden');
		});
		// It fades out first (the hidden state), so wait for the opacity to be effectively zero.
		await expect
			.poll(() =>
				target.evaluate((el) => Number(getComputedStyle(el.closest('[data-reveal]')!).opacity))
			)
			.toBeLessThan(0.02);
		await page.waitForTimeout(3200);
		expect(
			await target.evaluate((el) => getComputedStyle(el.closest('[data-reveal]')!).opacity)
		).toBe('1');
	});
});

test.describe('hover and focus polish', () => {
	test('buttons press to 97% and arrows nudge 3px', async ({ page }) => {
		await page.goto('/');
		// Let the entrance finish first, or the button is still moving under the pointer.
		await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
		const button = page.getByRole('link', { name: 'View projects' });
		await button.hover();
		await expect
			.poll(() => button.locator('svg').evaluate((el) => getComputedStyle(el).transform))
			.toBe('matrix(1, 0, 0, 1, 3, 0)');
		await page.mouse.down();
		await expect
			.poll(() => button.evaluate((el) => getComputedStyle(el).transform))
			.toBe('matrix(0.97, 0, 0, 0.97, 0, 0)');
		// Release away from the button so the press does not turn into a click and navigate.
		await page.mouse.move(5, 5);
		await page.mouse.up();
		await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
	});

	test('the focus ring appears on keyboard focus with a short fade', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('Tab');
		const focused = page.locator(':focus-visible').first();
		await expect(focused).toBeVisible();
		expect(await focused.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
		expect(await focused.evaluate((el) => getComputedStyle(el).transitionProperty)).toMatch(
			/box-shadow|all/
		);
	});

	test('cards lift 4px and their image zooms 4%', async ({ page }) => {
		await sql(`delete from projects where slug = 'e2e-motion'`);
		await sql(
			`insert into projects (slug, title, summary, status, first_published_at, sort_order) values ('e2e-motion', 'E2E Motion', 'x', 'published', now(), 99)`
		);
		try {
			await page.goto('/projects');
			const card = page.locator('article', { hasText: 'E2E Motion' });
			await card.hover();
			await expect
				.poll(() => card.evaluate((el) => getComputedStyle(el).transform))
				.toBe('matrix(1, 0, 0, 1, 0, -4)');
		} finally {
			await sql(`delete from projects where slug = 'e2e-motion'`);
		}
	});

	test('prose links grow an underline on hover', async ({ page }) => {
		await sql(`delete from posts where slug = 'e2e-motion-post'`);
		await sql(
			`insert into posts (slug, title, excerpt, body, status, published_at) values ('e2e-motion-post', 'E2E Motion Post', 'x', 'A [link](https://example.com) here.', 'published', now())`
		);
		try {
			await page.goto('/blog/e2e-motion-post');
			const link = page.locator('.prose-shenanigans a');
			expect(await link.evaluate((el) => getComputedStyle(el).backgroundSize)).toMatch(/^0px/);
			await link.hover();
			await expect
				.poll(() => link.evaluate((el) => getComputedStyle(el).backgroundSize))
				.toMatch(/^[1-9]/);
		} finally {
			await sql(`delete from posts where slug = 'e2e-motion-post'`);
		}
	});
});

test.describe('page transitions and theme cross-fade', () => {
	test('moving between public pages uses a view transition and the chrome stays named', async ({
		page
	}) => {
		await countViewTransitions(page);
		await page.goto('/');
		expect(await style(page, 'header', 'view-transition-name')).toBe('site-header');
		expect(await style(page, 'main', 'view-transition-name')).toBe('site-main');
		expect(await style(page, 'footer', 'view-transition-name')).toBe('site-footer');
		await page.locator('header').getByRole('link', { name: 'Blog' }).click();
		await expect(page).toHaveURL(/\/blog$/);
		expect(await transitions(page)).toBeGreaterThanOrEqual(1);
		await page.goBack();
		await expect(page).toHaveURL(/localhost:4173\/$/);
	});

	test('browsers without view transitions navigate as before', async ({ page }) => {
		await page.addInitScript(() => {
			// @ts-expect-error simulating an older browser
			delete Document.prototype.startViewTransition;
		});
		await page.goto('/');
		await page.locator('header').getByRole('link', { name: 'Projects' }).click();
		await expect(page).toHaveURL(/\/projects$/);
		await page.getByRole('button', { name: /Switch to/ }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
	});

	test('the theme switch is a view transition on the whole page, and the choice still persists', async ({
		page
	}) => {
		await countViewTransitions(page);
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');
		await page.getByRole('button', { name: 'Switch to dark theme' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect(await transitions(page)).toBe(1);
		await expect(page.locator('html')).not.toHaveClass(/vt-theme/);
		await page.reload();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	});
});

test.describe('the admin stays quiet', () => {
	test('no entrances, reveals or page transitions in the dashboard', async ({ page, context }) => {
		await resetRateLimits();
		await signInAsAdmin(context);
		await countViewTransitions(page);
		await page.goto('/admin/posts');
		await expect(page.locator('.site-motion')).toHaveCount(0);
		await expect(page.locator('[data-enter], [data-reveal]')).toHaveCount(0);
		await page
			.getByRole('link', { name: /^Projects/ })
			.first()
			.click();
		await expect(page).toHaveURL(/\/admin\/projects$/);
		expect(await transitions(page)).toBe(0);
		await resetRateLimits();
	});
});
