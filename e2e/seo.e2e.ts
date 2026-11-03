import { expect, test } from '@playwright/test';

const pages = [
	{
		path: '/',
		title: /^Shenanigans: Darl’s portfolio and blog$/,
		canonical: 'https://shenanigans.is-a.dev'
	},
	{
		path: '/projects',
		title: /^Projects · Shenanigans$/,
		canonical: 'https://shenanigans.is-a.dev/projects'
	},
	{ path: '/blog', title: /^Blog · Shenanigans$/, canonical: 'https://shenanigans.is-a.dev/blog' },
	{
		path: '/projects/sample-handbook-assistant',
		title: /^Sample: Handbook assistant · Shenanigans$/,
		canonical: 'https://shenanigans.is-a.dev/projects/sample-handbook-assistant',
		description: /\[SAMPLE\] A study helper/
	},
	{
		path: '/blog/sample-first-post',
		title: /^Sample: What I learned building a handbook assistant · Shenanigans$/,
		canonical: 'https://shenanigans.is-a.dev/blog/sample-first-post',
		description: /\[SAMPLE\] One concrete takeaway/,
		image: 'https://shenanigans.is-a.dev/og/sample-first-post.png',
		article: true
	}
];

test.describe('metadata (FR-31)', () => {
	for (const p of pages) {
		test(`${p.path} has a unique title, description, canonical, Open Graph and Twitter tags`, async ({
			page
		}) => {
			await page.goto(p.path);
			await expect(page).toHaveTitle(p.title);
			const meta = (selector: string) => page.locator(selector).first().getAttribute('content');
			expect(await meta('meta[name="description"]')).toMatch(p.description ?? /.{20,}/);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', p.canonical);
			expect(await meta('meta[property="og:title"]')).toMatch(p.title);
			expect(await meta('meta[property="og:description"]')).toMatch(p.description ?? /.{20,}/);
			expect(await meta('meta[property="og:url"]')).toBe(p.canonical);
			expect(await meta('meta[property="og:type"]')).toBe(p.article ? 'article' : 'website');
			expect(await meta('meta[property="og:image"]')).toBe(
				p.image ?? 'https://shenanigans.is-a.dev/og/site.png'
			);
			expect(await meta('meta[property="og:image:width"]')).toBe('1200');
			expect(await meta('meta[property="og:image:height"]')).toBe('630');
			expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
			expect(await meta('meta[name="twitter:image"]')).toBe(
				p.image ?? 'https://shenanigans.is-a.dev/og/site.png'
			);
		});
	}

	test('every page type has a different title', async ({ page }) => {
		const titles = new Set<string>();
		for (const p of pages) {
			await page.goto(p.path);
			titles.add(await page.title());
		}
		expect(titles.size).toBe(pages.length);
	});

	test('error pages are noindex', async ({ page }) => {
		await page.goto('/nope');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
	});
});

test.describe('sitemap and robots', () => {
	test('sitemap.xml lists only published pages', async ({ request }) => {
		const response = await request.get('/sitemap.xml');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('application/xml');
		const xml = await response.text();
		const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
		expect(locs).toEqual(
			[
				'https://shenanigans.is-a.dev/',
				'https://shenanigans.is-a.dev/projects',
				'https://shenanigans.is-a.dev/blog',
				'https://shenanigans.is-a.dev/projects/sample-handbook-assistant',
				'https://shenanigans.is-a.dev/projects/sample-shenanigans',
				'https://shenanigans.is-a.dev/blog/sample-first-post',
				'https://shenanigans.is-a.dev/blog/sample-second-post',
				'https://shenanigans.is-a.dev/blog/sample-hostile-post'
			].sort()
		);
		expect(xml).not.toContain('draft');
		expect(xml).not.toContain('/admin');
	});

	test('robots.txt references the sitemap and disallows /admin', async ({ request }) => {
		const text = await (await request.get('/robots.txt')).text();
		expect(text).toContain('Sitemap: https://shenanigans.is-a.dev/sitemap.xml');
		expect(text).toContain('Disallow: /admin');
	});

	test('the logo icons are linked and each one loads', async ({ page, request }) => {
		await page.goto('/');
		const hrefs = await page
			.locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
			.evaluateAll((links) => links.map((l) => l.getAttribute('href')));
		expect(hrefs).toHaveLength(4);
		const manifest = await (await request.get('/site.webmanifest')).json();
		for (const href of [...hrefs, ...manifest.icons.map((i: { src: string }) => i.src)]) {
			const response = await request.get(href!);
			expect(response.status(), href!).toBe(200);
			expect(response.headers()['content-type'], href!).toMatch(/image\/|manifest|json/);
		}
	});
});
