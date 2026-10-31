import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits, sql } from './db';

// A 1x1 PNG, enough for the upload checks.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64'
);

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from tags where slug like 'e2e-%'`);
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await sql(`delete from tags where slug like 'e2e-%'`);
	await resetRateLimits();
});

const fillBasics = async (page: import('@playwright/test').Page, title: string) => {
	await page.getByLabel('Title').fill(title);
	await page.getByLabel('Excerpt').fill('A short excerpt for the test.');
	await page.locator('#body').fill('Hello **world**');
};

test.describe('Post editor', () => {
	test('creates a draft: the slug follows the title, then the page moves to the saved post', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await expect(page.getByText('All changes saved')).toBeVisible();
		await fillBasics(page, 'E2E First Post');
		await expect(page.getByLabel('Slug')).toHaveValue('e2e-first-post');
		await expect(page.getByText('Unsaved changes')).toBeVisible();
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
		await expect(page.getByText('All changes saved')).toBeVisible();
		await expect(
			page.getByText('Saved. The public page can take up to a minute to update.')
		).toBeVisible();
		const [row] = await sql<{ status: string; body: string }>(
			`select status, body from posts where slug = 'e2e-first-post'`
		);
		expect(row).toMatchObject({ status: 'draft', body: 'Hello **world**' });
	});

	test('live preview matches the public rendering and keeps hostile markdown inert', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await page
			.locator('#body')
			.fill('> [!TIP]\n> Nice\n\n```ts\nconst a = 1;\n```\n\n<script>window.__pwned=1</script>');
		const preview = page.locator('.prose-shenanigans');
		await expect(preview.locator('.markdown-alert-tip')).toBeVisible();
		await expect(preview.locator('.code-block .code-lang')).toHaveText('ts');
		await expect(preview.locator('.code-copy')).toBeVisible();
		await expect(preview.locator('script')).toHaveCount(0);
		expect(
			await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)
		).toBeUndefined();
	});

	test('publishes, then the slug is locked even if the form is forged', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await fillBasics(page, 'E2E Lock Me');
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
		const slug = page.getByLabel('Slug');
		await expect(slug).toHaveAttribute('readonly', '');
		await expect(page.getByText('Locked after the first publish')).toBeVisible();

		// Forge a slug change straight at the action.
		const id = page.url().split('/').pop()!;
		const response = await page.request.post(`/admin/posts/${id}?/save`, {
			headers: { 'x-sveltekit-action': 'true', origin: 'http://localhost:4173' },
			form: {
				intent: 'save',
				payload: JSON.stringify({
					title: 'E2E Lock Me',
					slug: 'e2e-hijacked',
					excerpt: 'x',
					body: '',
					coverImage: '',
					coverAlt: '',
					projectId: '',
					tagIds: []
				})
			}
		});
		expect(await response.text()).toContain('locked');
		const [row] = await sql<{ slug: string }>(`select slug from posts where id = '${id}'`);
		expect(row.slug).toBe('e2e-lock-me');
	});

	test('creates a tag inline and reuses an existing name in any letter case', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.locator('#tags').fill('E2E Brand New');
		await page.getByRole('option', { name: /Create tag “E2E Brand New”/ }).click();
		await expect(page.getByRole('list', { name: 'Selected tags' })).toContainText('E2E Brand New');
		await page.locator('#tags').fill('e2e brand new');
		await expect(page.getByRole('option', { name: /Create tag/ })).toHaveCount(0);
		expect(await sql(`select 1 from tags where slug = 'e2e-brand-new'`)).toHaveLength(1);
	});

	test('a cover image needs alt text, and blocks Publish with an inline error', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await fillBasics(page, 'E2E Cover Post');
		await page
			.locator('#cover')
			.setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: PNG });
		const alt = page.getByLabel('Alt text');
		await expect(alt).toBeVisible();
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByText('Add alt text for the cover image').first()).toBeVisible();
		expect(await sql(`select 1 from posts where slug = 'e2e-cover-post'`)).toHaveLength(0);
		await alt.fill('A single pixel');
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
		const [row] = await sql<{ cover_image: string; cover_alt: string }>(
			`select cover_image, cover_alt from posts where slug = 'e2e-cover-post'`
		);
		expect(row.cover_image).toMatch(/^\d{4}\/[0-9a-f-]{36}\.png$/);
		expect(row.cover_alt).toBe('A single pixel');
	});

	test('upload rejects SVG and non-images with a clear message', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.locator('#cover').setInputFiles({
			name: 'evil.svg',
			mimeType: 'image/svg+xml',
			buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')
		});
		await expect(page.getByRole('alert')).toContainText(
			'Use a JPEG, PNG, WebP, GIF or AVIF image.'
		);
		await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
	});
});

test.describe('Unsaved changes (FR-21)', () => {
	test('warns on in-dashboard links, and Keep editing stays put', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Draft In Progress');
		await page.getByRole('link', { name: /^Tags/ }).first().click();
		const dialog = page.getByRole('alertdialog');
		await expect(dialog).toContainText('Leave without saving?');
		await dialog.getByRole('button', { name: 'Keep editing' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/new$/);
		await expect(page.getByLabel('Title')).toHaveValue('E2E Draft In Progress');
	});

	test('Leave anyway goes where the link pointed', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Throwaway');
		await page
			.getByRole('link', { name: /^Posts/ })
			.first()
			.click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Leave anyway' }).click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
	});

	test('warns on back navigation', async ({ page }) => {
		await page.goto('/admin/posts');
		await page.getByRole('link', { name: 'New post' }).first().click();
		await page.getByLabel('Title').fill('E2E Back');
		await page.goBack();
		await expect(page.getByRole('alertdialog')).toContainText('Leave without saving?');
	});

	test('asks the browser to confirm on refresh and tab close', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Refresh');
		const prevented = await page.evaluate(() => {
			const event = new Event('beforeunload', { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		});
		expect(prevented).toBe(true);
	});

	test('does not ask the browser when nothing changed', async ({ page }) => {
		await page.goto('/admin/posts/new');
		const prevented = await page.evaluate(() => {
			const event = new Event('beforeunload', { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		});
		expect(prevented).toBe(false);
	});

	test('does not warn when nothing changed', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page
			.getByRole('link', { name: /^Posts/ })
			.first()
			.click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
		await expect(page.getByRole('alertdialog')).toHaveCount(0);
	});
});

test.describe('Failed saves keep what was typed (FR-22)', () => {
	test('a lost connection shows an error, keeps the text, and Retry works', async ({
		page,
		context
	}) => {
		await page.goto('/admin/posts/new');
		await fillBasics(page, 'E2E Offline');
		await context.setOffline(true);
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page.getByRole('alert')).toContainText('Could not reach the server');
		await expect(page.getByLabel('Title')).toHaveValue('E2E Offline');
		await expect(page.locator('#body')).toHaveValue('Hello **world**');
		await expect(page.getByText('Not saved').first()).toBeVisible();
		await context.setOffline(false);
		await page.getByRole('button', { name: 'Retry' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
		await expect(page.getByLabel('Title')).toHaveValue('E2E Offline');
	});

	test('an expired session keeps the text, offers Copy markdown, and Continue with GitHub', async ({
		page,
		context
	}) => {
		await page.goto('/admin/posts/new');
		await fillBasics(page, 'E2E Expired');
		await context.clearCookies();
		await page.getByRole('button', { name: 'Save draft' }).click();
		const dialog = page.getByRole('alertdialog');
		await expect(dialog).toContainText('Your session expired');
		await expect(dialog.getByRole('button', { name: 'Copy markdown' })).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
		await dialog.getByRole('button', { name: 'I signed in, try again' }).click();
		// Still signed out: the text is still there.
		await expect(page.locator('#body')).toHaveValue('Hello **world**');
		expect(await sql(`select 1 from posts where slug = 'e2e-expired'`)).toHaveLength(0);
	});

	test('a server-side validation error keeps the text and points at the field', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await page.locator('#body').fill('Body text that must survive');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page.getByText('Add a title').first()).toBeVisible();
		await expect(page.locator('#body')).toHaveValue('Body text that must survive');
	});
});

test.describe('Delete', () => {
	test('deleting from the editor asks first and returns to the list', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await fillBasics(page, 'E2E Delete From Editor');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
		await page.getByRole('button', { name: 'Delete post' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Delete post' }).click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
		expect(await sql(`select 1 from posts where slug = 'e2e-delete-from-editor'`)).toHaveLength(0);
	});
});

test.describe('Image cleanup (D3)', () => {
	test('deleting a post removes its cover from storage, and replacing a cover removes the old one', async ({
		page,
		request
	}) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Cleanup');
		await page.getByLabel('Excerpt').fill('x');
		await page
			.locator('#cover')
			.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
		await page.getByLabel('Alt text').fill('one pixel');
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
		const [first] = await sql<{ cover_image: string }>(
			`select cover_image from posts where slug = 'e2e-cleanup'`
		);
		const url = (path: string) => `http://127.0.0.1:54321/storage/v1/object/public/images/${path}`;
		expect((await request.get(url(first.cover_image))).status()).toBe(200);

		// Replace the cover: the old object goes away after the save.
		await page
			.locator('#cover')
			.setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: PNG });
		await expect(page.getByText('Unsaved changes')).toBeVisible();
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page.getByText('All changes saved')).toBeVisible();
		const [second] = await sql<{ cover_image: string }>(
			`select cover_image from posts where slug = 'e2e-cleanup'`
		);
		expect(second.cover_image).not.toBe(first.cover_image);
		await expect.poll(async () => (await request.get(url(first.cover_image))).status()).toBe(400);
		expect((await request.get(url(second.cover_image))).status()).toBe(200);

		await page.getByRole('button', { name: 'Delete post' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Delete post' }).click();
		await expect(page).toHaveURL(/\/admin\/posts$/);
		await expect
			.poll(async () => (await request.get(url(second.cover_image))).status())
			.not.toBe(200);
	});
});
