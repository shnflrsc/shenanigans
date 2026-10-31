import { expect, test } from '@playwright/test';
import { resetRateLimits } from './db';

test.beforeEach(resetRateLimits);
test.afterAll(resetRateLimits);

test.describe('security headers and CSP', () => {
	test('public pages send the security headers and a nonce-based CSP', async ({ request }) => {
		const response = await request.get('/');
		const h = response.headers();
		expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-/);
		expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
		expect(h['content-security-policy']).toContain("object-src 'none'");
		expect(h['x-content-type-options']).toBe('nosniff');
		expect(h['x-frame-options']).toBe('DENY');
		expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(h['permissions-policy']).toContain('camera=()');
	});

	test('public pages get a short shared cache window', async ({ request }) => {
		const h = (await request.get('/')).headers();
		expect(h['cache-control']).toContain('s-maxage=45');
	});

	test('admin pages are never cached and are noindex', async ({ request }) => {
		const h = (await request.get('/admin')).headers();
		expect(h['cache-control']).toContain('no-store');
		expect(h['x-robots-tag']).toContain('noindex');
	});

	test('robots.txt disallows /admin', async ({ request }) => {
		expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /admin');
	});

	for (const path of ['/', '/admin', '/admin?notice=denied']) {
		test(`no CSP violations or console errors on ${path}`, async ({ page }) => {
			const problems: string[] = [];
			page.on('console', (m) => {
				if (m.type() === 'error' || /content security policy/i.test(m.text()))
					problems.push(m.text());
			});
			page.on('pageerror', (e) => problems.push(e.message));
			await page.goto(path);
			await page.waitForLoadState('networkidle');
			expect(problems).toEqual([]);
		});
	}
});
