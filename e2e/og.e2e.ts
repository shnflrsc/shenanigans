import { expect, test } from '@playwright/test';
import { sql } from './db';

/** Width and height from a PNG's IHDR chunk. */
const size = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

test.describe('preview images (FR-32)', () => {
	test('the site preview is a 1200x630 PNG', async ({ request }) => {
		const response = await request.get('/og/site.png');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe('image/png');
		expect(response.headers()['cache-control']).toContain('s-maxage=60');
		expect(size(await response.body())).toEqual({ width: 1200, height: 630 });
	});

	test('a published post gets its own 1200x630 preview', async ({ request }) => {
		const response = await request.get('/og/sample-first-post.png');
		expect(response.status()).toBe(200);
		expect(size(await response.body())).toEqual({ width: 1200, height: 630 });
	});

	test('drafts and unknown posts have no preview', async ({ request }) => {
		expect((await request.get('/og/sample-draft-post.png')).status()).toBe(404);
		expect((await request.get('/og/nope.png')).status()).toBe(404);
	});

	test('a title full of markup characters renders as plain text and still produces an image', async ({
		request
	}) => {
		await sql(`insert into posts (slug, title, excerpt, body, status, published_at)
			values ('og-markup-test', '<script>alert(1)</script> & "quotes" <b>bold</b> ${'very long '.repeat(12)}', 'x', 'body', 'published', now())`);
		try {
			const response = await request.get('/og/og-markup-test.png');
			expect(response.status()).toBe(200);
			expect(size(await response.body())).toEqual({ width: 1200, height: 630 });
		} finally {
			await sql(`delete from posts where slug = 'og-markup-test'`);
		}
	});

	test('an edited post gets a fresh image (cache is keyed on the last edit)', async ({
		request
	}) => {
		const before = await (await request.get('/og/sample-second-post.png')).body();
		await sql(
			`update posts set title = 'Sample: Notes on Svelte 5 runes, edited', updated_at = now() where slug = 'sample-second-post'`
		);
		try {
			const after = await (await request.get('/og/sample-second-post.png')).body();
			expect(Buffer.compare(before, after)).not.toBe(0);
		} finally {
			await sql(
				`update posts set title = 'Sample: Notes on Svelte 5 runes', updated_at = now() where slug = 'sample-second-post'`
			);
		}
	});
});
