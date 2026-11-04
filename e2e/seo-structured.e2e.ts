import { expect, test } from '@playwright/test';
import { sql } from './db';

const ld = (page: import('@playwright/test').Page) =>
	page
		.locator('script[type="application/ld+json"]')
		.evaluateAll((nodes) => nodes.flatMap((n) => JSON.parse(n.textContent ?? '')));

test('the sitemap gives every page a last-modified date', async ({ request }) => {
	const xml = await (await request.get('/sitemap.xml')).text();
	const urls = [...xml.matchAll(/<url>(.*?)<\/url>/g)].map((m) => m[1]);
	expect(urls.length).toBeGreaterThan(3);
	for (const url of urls) {
		expect(url, url).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T[\d:.]+Z<\/lastmod>/);
	}
});

test.describe('structured data', () => {
	test('Home describes the site and its owner', async ({ page }) => {
		await page.goto('/');
		const types = (await ld(page)).map((d) => d['@type']);
		expect(types).toEqual(['WebSite', 'Person']);
	});

	test('a post is a BlogPosting with breadcrumbs', async ({ page }) => {
		await page.goto('/blog/sample-first-post');
		const [post, crumbs] = await ld(page);
		expect(post['@type']).toBe('BlogPosting');
		expect(post.headline).toBeTruthy();
		expect(crumbs['@type']).toBe('BreadcrumbList');
		expect(crumbs.itemListElement.map((i: { name: string }) => i.name).slice(0, 2)).toEqual([
			'Home',
			'Blog'
		]);
	});

	test('a project carries its details and breadcrumbs', async ({ page }) => {
		await page.goto('/projects/sample-shenanigans');
		const [project, crumbs] = await ld(page);
		expect(['CreativeWork', 'SoftwareSourceCode']).toContain(project['@type']);
		expect(project.url).toBe('https://shenanigans.is-a.dev/projects/sample-shenanigans');
		expect(crumbs.itemListElement).toHaveLength(3);
	});

	test('markup in a title cannot break out of the data block', async ({ page }) => {
		await page.goto('/blog/sample-hostile-post');
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
		// Everything in the block parses as data, and nothing else in the head was injected by the title.
		expect((await ld(page)).length).toBe(2);
	});
});

test.describe('cover as the link preview', () => {
	let before: { cover_image: string | null; cover_alt: string | null };
	const slug = 'sample-shenanigans';

	test.beforeAll(async () => {
		[before] = await sql(`select cover_image, cover_alt from projects where slug = '${slug}'`);
		await sql(
			`update projects set cover_image = 'covers/e2e-preview.png', cover_alt = 'E2E cover alt' where slug = '${slug}'`
		);
	});

	test.afterAll(async () => {
		const quote = (v: string | null) => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
		await sql(
			`update projects set cover_image = ${quote(before.cover_image)}, cover_alt = ${quote(before.cover_alt)} where slug = '${slug}'`
		);
	});

	test('a project with a cover previews as that cover, with its alt text', async ({ page }) => {
		await page.goto(`/projects/${slug}`);
		const meta = (selector: string) => page.locator(selector).getAttribute('content');
		expect(await meta('meta[property="og:image"]')).toContain('covers/e2e-preview.png');
		expect(await meta('meta[name="twitter:image"]')).toContain('covers/e2e-preview.png');
		expect(await meta('meta[property="og:image:alt"]')).toBe('E2E cover alt');
		await expect(page.locator('meta[property="og:image:width"]')).toHaveCount(0);
	});

	test('a project without a cover keeps the site card', async ({ page }) => {
		await page.goto('/projects/sample-handbook-assistant');
		const image = await page.locator('meta[property="og:image"]').getAttribute('content');
		const covered = await sql(
			`select cover_image from projects where slug = 'sample-handbook-assistant'`
		);
		if (covered[0].cover_image) test.skip();
		expect(image).toBe('https://shenanigans.is-a.dev/og/site.png');
		await expect(page.locator('meta[property="og:image:width"]')).toHaveCount(1);
	});
});
