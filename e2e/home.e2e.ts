import { expect, test } from '@playwright/test';
import { snapshotPublished, sql } from './db';

test.describe('Home', () => {
	test('has the sections in the right order, with the right hero', async ({ page }) => {
		await page.goto('/');
		const order = await page.evaluate(() =>
			[...document.querySelectorAll('main h1, main h2, footer')].map(
				(el) => el.tagName.toLowerCase() + ':' + (el.textContent ?? '').trim().slice(0, 24)
			)
		);
		expect(order[0]).toMatch(/^h1:Hi, I build things/);
		const headings = await page.locator('main h2').allTextContents();
		expect(headings.map((t) => t.trim())).toEqual([
			'About me',
			'Featured',
			'Latest posts',
			'Got something in mind? Let’s talk.'
		]);

		const hero = page.locator('main section').first();
		await expect(hero.getByRole('link', { name: 'View projects' })).toBeVisible();
		await expect(hero.getByRole('link', { name: 'Read the blog' })).toBeVisible();
		await expect(hero.getByRole('link', { name: 'Get in touch' })).toHaveCount(0);
		await expect(hero.getByText('Darl Shanen Floresca')).toBeVisible();
		await expect(hero.getByText('BSIT student · Bulacan State University')).toBeVisible();
	});

	test('shows only the featured project, with no grid of others', async ({ page }) => {
		await page.goto('/');
		const featured = page.locator('section', {
			has: page.getByRole('heading', { name: 'Featured' })
		});
		await expect(featured.locator('article')).toHaveCount(1);
		await expect(featured.getByRole('link', { name: 'Sample: Handbook assistant' })).toBeVisible();
	});

	test('never shows drafts, and shows the résumé button now that the file exists', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.getByText('Sample: Draft')).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Download résumé' })).toBeVisible();
	});

	test('has the contact box with email, GitHub and LinkedIn, and a single-row footer', async ({
		page
	}) => {
		await page.goto('/');
		const box = page.locator('section', {
			has: page.getByRole('heading', { name: /Got something/ })
		});
		await expect(box.getByRole('link', { name: 'Get in touch' })).toHaveAttribute(
			'href',
			/^mailto:floresca\.shanegarcia@gmail\.com$/
		);
		await expect(box.getByRole('link', { name: 'GitHub' })).toBeVisible();
		await expect(box.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
		const footer = page.locator('footer');
		await expect(footer).toContainText(`© ${new Date().getFullYear()} Darl Shanen Floresca`);
		await expect(footer.getByRole('link')).toHaveText(['', '', '']);
		await expect(footer.getByRole('link')).toHaveCount(3);
		for (const name of ['Email', 'GitHub', 'LinkedIn'])
			await expect(footer.getByRole('link', { name })).toBeVisible();
	});

	test('header: brand, links, theme toggle and icon links on desktop, sticky', async ({ page }) => {
		await page.goto('/');
		const header = page.locator('header');
		await expect(header.getByRole('link', { name: 'Shenanigans' })).toBeVisible();
		await expect(header.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText([
			'Home',
			'Projects',
			'Blog'
		]);
		await expect(header.getByRole('link', { name: 'Home' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		for (const name of ['Email', 'GitHub', 'LinkedIn']) {
			const link = header.getByRole('link', { name });
			await expect(link).toBeVisible();
			await expect(link).toHaveText('');
		}
		await expect(header.getByRole('link', { name: 'Get in touch' })).toHaveCount(0);
		await expect(header.getByRole('button', { name: /Switch to/ })).toBeVisible();
		await expect(header.getByRole('button', { name: 'Open menu' })).toBeHidden();
		// The header stays at the top of the viewport while the page scrolls.
		await page.evaluate(() => window.scrollTo(0, 600));
		expect((await header.boundingBox())!.y).toBe(0);
	});
});

test.describe('Home with little or no content', () => {
	let restore: () => Promise<void>;
	test.beforeEach(async () => {
		restore = await snapshotPublished();
	});
	test.afterEach(async () => restore());

	test('empty: no featured project and no posts', async ({ page }) => {
		await sql(`update posts set status = 'draft'`);
		await sql(`update projects set status = 'draft', featured = false`);
		await page.goto('/');
		await expect(page.getByRole('heading', { name: 'Nothing featured right now' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'See all projects' })).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'No posts yet' })).toBeVisible();
		await expect(page.getByText('The first one is in the works.')).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'All projects', exact: true })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'All posts', exact: true })).toHaveCount(0);
	});

	test('launch: one project and one post', async ({ page }) => {
		await sql(`update posts set status = 'draft' where slug <> 'sample-first-post'`);
		await sql(`update projects set status = 'draft' where slug <> 'sample-handbook-assistant'`);
		await page.goto('/');
		await expect(page.getByText('More projects are on the way.')).toHaveCount(0);
		await expect(page.getByText('That’s the first one. More soon.')).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'All projects', exact: true })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'All posts', exact: true })).toHaveCount(0);
	});
});
