import { expect, test } from '@playwright/test';
import { sql } from './db';

// Covers are rendered as <img>. An error handler written as an attribute would be served as an inline handler,
// which the strict CSP (SR-10) blocks and reports as a console error on every page that shows a cover.
test.describe('no inline event handlers when covers are shown', () => {
	let previous: { slug: string; cover_image: string | null; cover_alt: string | null }[];
	test.beforeAll(async () => {
		previous = await sql(
			`select slug, cover_image, cover_alt from projects where status = 'published'`
		);
		await sql(
			`update projects set cover_image = 'covers/e2e-missing.png', cover_alt = 'Missing cover' where status = 'published'`
		);
	});
	test.afterAll(async () => {
		const quote = (value: string | null) =>
			value === null ? 'null' : `'${value.replace(/'/g, "''")}'`;
		for (const row of previous)
			await sql(
				`update projects set cover_image = ${quote(row.cover_image)}, cover_alt = ${quote(row.cover_alt)} where slug = ${quote(row.slug)}`
			);
	});

	test('pages with covers serve no inline handlers and log no CSP errors', async ({
		page,
		request
	}) => {
		const slugs = previous.map((p) => p.slug);
		expect(slugs.length).toBeGreaterThan(0);
		const messages: string[] = [];
		page.on('console', (m) => {
			if (m.type() === 'error') messages.push(m.text());
		});
		for (const path of ['/', '/projects', `/projects/${slugs[0]}`]) {
			const html = await (await request.get(path)).text();
			expect(html, path).toContain('covers/e2e-missing.png');
			expect(html, `${path} has an inline handler`).not.toMatch(/\son(error|load)=/);
			expect(html, path).not.toContain('__e=event');
			await page.goto(path);
			// The broken image falls back to the muted placeholder.
			await expect(page.locator('main img[src*="e2e-missing"]')).toHaveCount(0);
		}
		expect(messages.filter((m) => /Content Security Policy|inline/i.test(m))).toEqual([]);
	});
});
