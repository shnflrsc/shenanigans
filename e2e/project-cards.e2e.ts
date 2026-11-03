import { expect, test } from '@playwright/test';
import { sql } from './db';

let original: { slug: string; summary: string };

// One card gets a much longer summary, so the cards would differ in height without the fix.
test.beforeAll(async () => {
	[original] = await sql(
		`select slug, summary from projects where status = 'published' order by created_at limit 1`
	);
	await sql(
		`update projects set summary = '${'A much longer summary that wraps onto many lines. '.repeat(6).trim()}' where slug = '${original.slug}'`
	);
});

test.afterAll(async () => {
	await sql(
		`update projects set summary = '${original.summary.replace(/'/g, "''")}' where slug = '${original.slug}'`
	);
});

test('project cards in a row have the same height', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/projects');
	const cards = page.locator('main ul > li > div > article');
	expect(await cards.count()).toBeGreaterThan(1);
	const rows = new Map<number, number[]>();
	for (const card of await cards.all()) {
		const box = (await card.boundingBox())!;
		const top = Math.round(box.y);
		rows.set(top, [...(rows.get(top) ?? []), Math.round(box.height)]);
	}
	for (const heights of rows.values()) {
		expect(new Set(heights).size, `heights ${heights}`).toBe(1);
	}
});
