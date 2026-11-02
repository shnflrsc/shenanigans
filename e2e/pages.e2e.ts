import { expect, test } from '@playwright/test';
import { snapshotPublished, sql } from './db';

test.describe('Projects', () => {
	test('has no "first one" note when there is only one project', async ({ page }) => {
		const { sql } = await import('./db');
		const before = await sql<{ id: string }>(`select id from projects where status = 'published'`);
		await sql(`update projects set status = 'draft'`);
		await sql(
			`insert into projects (slug, title, summary, status, first_published_at, sort_order) values ('e2e-only-project', 'E2E Only Project', 'x', 'published', now(), 99)`
		);
		try {
			await page.goto('/projects');
			await expect(page.locator('article')).toHaveCount(1);
			await expect(page.getByText('More soon')).toHaveCount(0);
			await expect(page.getByText('first one')).toHaveCount(0);
		} finally {
			await sql(`delete from projects where slug = 'e2e-only-project'`);
			if (before.length)
				await sql(
					`update projects set status = 'published' where id in (${before.map((r) => `'${r.id}'`).join(',')})`
				);
		}
	});

	test('lists published projects in showcase order with tag chips and counts', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Projects.');
		const titles = await page.locator('article h2').allTextContents();
		expect(titles.map((t) => t.trim())).toEqual([
			'Sample: Handbook assistant',
			'Sample: Shenanigans'
		]);
		await expect(page.getByText('Sample: Draft project')).toHaveCount(0);
		const chips = page.getByRole('list', { name: 'Filter projects by tag' }).getByRole('link');
		await expect(chips).toHaveText(['All 2', 'Svelte 2']);
	});

	test('filters by tag through the URL and ignores an unknown tag', async ({ page }) => {
		await page.goto('/projects?tag=svelte');
		await expect(page.locator('article')).toHaveCount(2);
		await expect(page.getByRole('link', { name: /^Svelte/ })).toHaveAttribute(
			'aria-current',
			'true'
		);
		await page.goto('/projects?tag=does-not-exist');
		await expect(page.locator('article')).toHaveCount(2);
		await page.goto('/projects?tag=%3Cscript%3E');
		await expect(page.locator('article')).toHaveCount(2);
	});

	test('case study: facts card, links and neighbours in showcase order', async ({ page }) => {
		const response = await page.goto('/projects/sample-handbook-assistant');
		expect(response!.status()).toBe(200);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sample: Handbook assistant');
		await expect(page.getByText('Case study', { exact: true })).toHaveCount(0);
		const facts = page.locator('main header');
		await expect(facts).toContainText('Year');
		await expect(facts).toContainText('2026');
		await expect(facts).toContainText('My role');
		await expect(facts).toContainText('Team');
		await expect(facts).toContainText('Live site');
		await expect(facts).toContainText('Source');
		await expect(facts.locator('a[href="https://example.com"]')).toHaveText('example.com');
		await expect(facts.locator('a[href="https://github.com/example/sample"]')).toHaveText(
			'github.com/example/sample'
		);
		const nav = page.getByRole('navigation', { name: 'More projects' });
		await expect(nav.getByText('Previous')).toHaveCount(0);
		await expect(nav.getByRole('link', { name: /Next\s*Sample: Shenanigans/ })).toBeVisible();
		await expect(page.getByRole('heading', { name: /Got something in mind/ })).toBeVisible();
	});

	test('leaves empty fact rows out', async ({ page }) => {
		await page.goto('/projects/sample-shenanigans');
		const facts = page.locator('main header');
		await expect(facts).toContainText('Design and build');
		await expect(facts).not.toContainText('Live site');
	});

	test('unknown and unpublished projects return a real 404', async ({ request }) => {
		expect((await request.get('/projects/does-not-exist')).status()).toBe(404);
		expect((await request.get('/projects/sample-draft-project')).status()).toBe(404);
		expect((await request.get('/projects/NOT%20A%20SLUG')).status()).toBe(404);
	});
});

test.describe('Blog', () => {
	test('has no "first post" note when there is only one post', async ({ page }) => {
		const { sql } = await import('./db');
		const before = await sql<{ id: string }>(`select id from posts where status = 'published'`);
		await sql(`update posts set status = 'draft'`);
		await sql(
			`insert into posts (slug, title, excerpt, body, status, published_at) values ('e2e-only-post', 'E2E Only Post', 'x', 'body', 'published', now())`
		);
		try {
			await page.goto('/blog');
			await expect(page.locator('article')).toHaveCount(1);
			await expect(page.getByText('first post')).toHaveCount(0);
			await expect(page.getByText('More soon')).toHaveCount(0);
			await page.goto('/');
			await expect(page.getByText('More soon')).toHaveCount(0);
			// The only post has neither an older nor a newer neighbour.
			await page.goto('/blog/e2e-only-post');
			await expect(page.getByRole('navigation', { name: 'More posts' })).toHaveCount(0);
		} finally {
			await sql(`delete from posts where slug = 'e2e-only-post'`);
			if (before.length)
				await sql(
					`update posts set status = 'published' where id in (${before.map((r) => `'${r.id}'`).join(',')})`
				);
		}
	});

	test('lists published posts newest first with tag chips and counts', async ({ page }) => {
		await page.goto('/blog');
		const titles = await page.locator('article h2').allTextContents();
		expect(titles.map((t) => t.trim())).toEqual([
			'Sample: What I learned building a handbook assistant',
			'Sample: Notes on Svelte 5 runes',
			'Sample: Hostile markdown payloads'
		]);
		await expect(page.getByText('Sample: Draft post')).toHaveCount(0);
		const chips = page.getByRole('list', { name: 'Filter posts by tag' }).getByRole('link');
		await expect(chips).toHaveText(['All 3', 'Svelte 2', 'TypeScript 2']);
		await expect(page.getByText('min read').first()).toBeVisible();
	});

	test('filters by tag through the URL', async ({ page }) => {
		await page.goto('/blog?tag=svelte');
		await expect(page.locator('article')).toHaveCount(2);
	});

	test('does not paginate a short list', async ({ page }) => {
		await page.goto('/blog?page=9');
		await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(0);
		await expect(page.locator('article')).toHaveCount(3);
	});
});

test.describe('Post', () => {
	test('renders alerts and code blocks with a Copy button', async ({ page }) => {
		await page.goto('/blog/sample-first-post');
		await expect(page.locator('.markdown-alert')).toHaveCount(5);
		await expect(page.locator('.markdown-alert-note .markdown-alert-title')).toContainText('Note');
		const blocks = page.locator('.code-block');
		await expect(blocks).toHaveCount(3);
		await expect(blocks.first().locator('.code-lang')).toHaveText('ts');
		await expect(blocks.first().getByRole('button', { name: 'Copy code' })).toBeVisible();
	});

	test('Copy puts exactly the code on the clipboard and reads Copied for about two seconds', async ({
		page,
		context
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto('/blog/sample-first-post');
		const block = page.locator('.code-block').first();
		const button = block.getByRole('button', { name: 'Copy code' });
		await button.click();
		await expect(button).toContainText('Copied');
		// Windows clipboards turn line feeds into CRLF; the exact text handed to the clipboard is unit tested.
		const copied = (await page.evaluate(() => navigator.clipboard.readText()))
			.split('\r\n')
			.join('\n');
		expect(copied).toBe(
			"const greet = (name: string) => `Hello, ${name}`;\nconsole.log(greet('world'));"
		);
		await expect(button).toContainText('Copy', { timeout: 4000 });
		await expect(button).not.toContainText('Copied');
	});

	test('hostile markdown renders inert and raises no errors', async ({ page }) => {
		const dialogs: string[] = [];
		page.on('dialog', (d) => dialogs.push(d.message()));
		await page.goto('/blog/sample-hostile-post');
		await page.waitForLoadState('networkidle');
		expect(
			await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)
		).toBeUndefined();
		expect(dialogs).toEqual([]);
		const prose = page.locator('.prose-shenanigans');
		await expect(prose.locator('script, iframe, svg[onload], img[onerror]')).toHaveCount(0);
		await expect(prose.locator('a[href^="javascript:"]')).toHaveCount(0);
	});

	test('shows "The project this post is about" and neighbours', async ({ page }) => {
		await page.goto('/blog/sample-first-post');
		await expect(
			page.getByRole('heading', { name: 'The project this post is about' })
		).toBeVisible();
		await expect(
			page.locator('section article h3', { hasText: 'Sample: Handbook assistant' })
		).toBeVisible();
		const nav = page.getByRole('navigation', { name: 'More posts' });
		await expect(
			nav.getByRole('link', { name: /Previous\s*Sample: Notes on Svelte 5 runes/ })
		).toBeVisible();
		await expect(nav.getByText('Next')).toHaveCount(0);
	});

	test('has no project section when the post is not linked', async ({ page }) => {
		await page.goto('/blog/sample-second-post');
		await expect(page.getByText('The project this post is about')).toHaveCount(0);
	});

	test('drafts and unknown slugs return a real 404', async ({ request }) => {
		expect((await request.get('/blog/sample-draft-post')).status()).toBe(404);
		expect((await request.get('/blog/does-not-exist')).status()).toBe(404);
	});

	test('hides the project when it is unpublished', async ({ page }) => {
		const restore = await snapshotPublished();
		try {
			await sql(`update projects set status = 'draft' where slug = 'sample-handbook-assistant'`);
			await page.goto('/blog/sample-first-post');
			await expect(page.getByText('The project this post is about')).toHaveCount(0);
		} finally {
			await restore();
		}
	});
});
