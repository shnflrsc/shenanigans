import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

test.beforeEach(resetRateLimits);
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from projects where slug like 'e2e-%'`);
	await resetRateLimits();
});

test.describe('Journey A: recruiter', () => {
	test('lands, learns who this is, opens a case study and finds contact within a few clicks', async ({
		page
	}) => {
		const problems: string[] = [];
		page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
		page.on('pageerror', (e) => problems.push(e.message));

		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Hi, I build things.');
		await expect(page.getByText('BSIT student · Bulacan State University')).toBeVisible();
		await page.getByRole('link', { name: 'About me' }).count();
		await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();

		await page.getByRole('link', { name: 'Case study' }).first().click();
		await expect(page).toHaveURL(/\/projects\/sample-handbook-assistant$/);
		await expect(page.getByText('My role')).toBeVisible();

		const contact = page.getByRole('link', { name: 'Get in touch' }).first();
		await expect(contact).toHaveAttribute('href', 'mailto:floresca.shanegarcia@gmail.com');
		expect(problems).toEqual([]);
	});
});

test.describe('Journey B: developer', () => {
	test('lands on a post, reads, copies code, then finds another post through the blog', async ({
		page,
		context
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto('/blog/sample-first-post');
		await expect(page.getByText('1 min read')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Svelte' }).first()).toBeVisible();
		await page.locator('.code-copy').first().click();
		await expect(page.locator('.code-copy').first()).toContainText('Copied');

		await page.getByRole('link', { name: 'Blog', exact: true }).first().click();
		await page.getByRole('link', { name: 'Sample: Notes on Svelte 5 runes' }).click();
		await expect(page).toHaveURL(/\/blog\/sample-second-post$/);
	});
});

test.describe('Journey C: the owner publishes', () => {
	test('signs in, writes a post with a tag, publishes, verifies it is live, fixes a typo, slug stays', async ({
		page,
		context,
		browser
	}) => {
		await signInAsAdmin(context);
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/posts$/);

		await page.getByRole('link', { name: 'New post' }).first().click();
		await page.getByLabel('Title').fill('E2E Journey Post');
		await page.getByLabel('Excerpt').fill('A teh typo in the excerpt');
		await page.locator('#body').fill('Body with `code`.');
		await page.locator('#tags-new').fill('E2E Journey Tag');
		await page.locator('#tags-new').press('Enter');
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

		const visitor = await (await browser.newContext()).newPage();
		await expect
			.poll(async () => (await visitor.request.get('/blog/e2e-journey-post')).status(), {
				timeout: 60_000
			})
			.toBe(200);

		// Fix the typo: edit and save, the slug stays.
		await page.getByLabel('Excerpt').fill('A the typo fixed in the excerpt');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByText('All changes saved')).toBeVisible();
		await expect(page.getByLabel('Slug')).toHaveValue('e2e-journey-post');
		await expect
			.poll(
				async () =>
					(await visitor.request.get('/blog/e2e-journey-post').then((r) => r.text())).includes(
						'typo fixed'
					),
				{
					timeout: 60_000
				}
			)
			.toBe(true);
		await sql(`delete from tags where slug = 'e2e-journey-tag'`);
		await visitor.context().close();
	});
});

/** M8-5: no secret ever reaches the browser bundle. */
test.describe('Secrets audit (SR-5)', () => {
	const env = readFileSync('.env', 'utf8');
	const secret = (name: string) => env.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, 'm'))?.[1];

	function walk(dir: string): string[] {
		return readdirSync(dir).flatMap((n) => {
			const p = join(dir, n);
			return statSync(p).isDirectory() ? walk(p) : [p];
		});
	}

	test('server-only values are absent from the client build', () => {
		const files = walk('.svelte-kit/output/client').filter((f) => /\.(js|css|html|json)$/.test(f));
		expect(files.length).toBeGreaterThan(0);
		const values = ['SUPABASE_SERVICE_ROLE_KEY', 'RATE_LIMIT_SECRET', 'DATABASE_URL']
			.map(secret)
			.filter(Boolean) as string[];
		for (const file of files) {
			const text = readFileSync(file, 'utf8');
			for (const value of values)
				expect(text.includes(value), `${file} contains a server-only value`).toBe(false);
			expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|RATE_LIMIT_SECRET|ADMIN_GITHUB_ID/);
		}
	});

	test('public pages never contain them either', async ({ request }) => {
		const values = ['SUPABASE_SERVICE_ROLE_KEY', 'RATE_LIMIT_SECRET', 'DATABASE_URL']
			.map(secret)
			.filter(Boolean) as string[];
		for (const path of ['/', '/projects', '/blog', '/admin', '/blog/sample-first-post']) {
			const body = await (await request.get(path)).text();
			for (const value of values) expect(body.includes(value)).toBe(false);
		}
	});
});
