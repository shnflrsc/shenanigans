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
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await sql(`delete from posts where slug like 'e2e-%'`);
	await resetRateLimits();
});

test.describe('Inserting images into markdown (FR-13)', () => {
	test('uploads, needs alt text, and inserts ![alt](url) at the cursor', async ({ page }) => {
		await page.goto('/admin/posts/new');
		const body = page.locator('#body');
		await body.fill('Before After');
		// Put the cursor between the two words, then open the uploader.
		await body.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(7, 7));
		await page.getByRole('button', { name: 'Image', exact: true }).click();
		const panel = page.locator('#body-image-panel');
		await expect(panel).toBeVisible();

		await panel
			.locator('#body-image')
			.setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: PNG });
		await expect(panel.getByLabel('Alt text')).toBeVisible();

		// No alt text yet: refused with a clear message, nothing inserted.
		await panel.getByRole('button', { name: 'Insert image' }).click();
		await expect(panel.getByText('Add alt text for the image')).toBeVisible();
		await expect(body).toHaveValue('Before After');

		await panel.getByLabel('Alt text').fill('A tiny [test] picture');
		await panel.getByRole('button', { name: 'Insert image' }).click();
		await expect(panel).toBeHidden();
		const value = await body.inputValue();
		expect(value).toMatch(
			/^Before \n!\[A tiny test picture\]\(http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\/public\/images\/\d{4}\/[0-9a-f-]{36}\.png\)\nAfter$/
		);

		// The live preview shows the picture, and the editor knows there are unsaved changes.
		await page.getByRole('tab', { name: 'Preview' }).click();
		await expect(page.locator('.prose-shenanigans img')).toHaveAttribute(
			'alt',
			'A tiny test picture'
		);
		await expect(page.getByText('Unsaved changes')).toBeVisible();
	});

	test('the inserted image reaches the public post', async ({ page, browser }) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Inline Image');
		await page.getByLabel('Excerpt').fill('x');
		await page.getByRole('button', { name: 'Image', exact: true }).click();
		const panel = page.locator('#body-image-panel');
		await panel
			.locator('#body-image')
			.setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: PNG });
		await panel.getByLabel('Alt text').fill('Inline picture');
		await panel.getByRole('button', { name: 'Insert image' }).click();
		await page.getByRole('button', { name: 'Publish' }).click();
		await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

		const visitor = await (await browser.newContext()).newPage();
		await expect(async () => {
			const response = await visitor.goto('/blog/e2e-inline-image');
			expect(response!.status()).toBe(200);
		}).toPass({ timeout: 60_000 });
		const image = visitor.locator('.prose-shenanigans img');
		await expect(image).toHaveAttribute('alt', 'Inline picture');
		await expect
			.poll(async () => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
			.toBeGreaterThan(0);
		await visitor.context().close();
	});

	test('Cancel closes the uploader without changing the text', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.locator('#body').fill('Keep me');
		await page.getByRole('button', { name: 'Image', exact: true }).click();
		await page.locator('#body-image-panel').getByRole('button', { name: 'Cancel' }).click();
		await expect(page.locator('#body-image-panel')).toBeHidden();
		await expect(page.locator('#body')).toHaveValue('Keep me');
	});
});

test.describe('Phone editor: sticky action bar', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('Save draft and Publish sit in a bar fixed to the bottom, half width each', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Phone');
		const save = page.getByRole('button', { name: 'Save draft' });
		const publish = page.getByRole('button', { name: 'Publish' });
		await expect(save).toBeVisible();
		await expect(publish).toBeVisible();

		const a = (await save.boundingBox())!;
		const b = (await publish.boundingBox())!;
		expect(Math.round(a.y + a.height)).toBeLessThanOrEqual(844);
		expect(844 - (a.y + a.height)).toBeLessThan(20);
		expect(Math.abs(a.width - b.width)).toBeLessThan(2);
		expect(a.width).toBeGreaterThan(150);

		// It stays put while the page scrolls.
		await page.mouse.wheel(0, 1500);
		const after = (await save.boundingBox())!;
		expect(Math.round(after.y)).toBe(Math.round(a.y));
	});

	test('the top bar shows the unsaved indicator, and saving from the bottom bar works', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Phone Save');
		await page.getByLabel('Excerpt').fill('x');
		await expect(page.getByText('Unsaved changes')).toBeVisible();
		await page.getByRole('button', { name: 'Save draft' }).click();
		await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
		await expect(page.getByText('All changes saved')).toBeVisible();
	});

	test('the saved toast sits above the bottom bar', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.getByLabel('Title').fill('E2E Phone Toast');
		await page.getByLabel('Excerpt').fill('x');
		await page.getByRole('button', { name: 'Save draft' }).click();
		const toast = page.locator('[data-sonner-toast]').first();
		await expect(toast).toBeVisible();
		// The toast slides in and the editor reloads onto the saved post, so measure both until they settle.
		await expect
			.poll(async () => {
				const bar = await page.getByRole('button', { name: 'Publish' }).boundingBox();
				const t = await toast.boundingBox();
				return bar && t ? bar.y - (t.y + t.height) : -999;
			})
			.toBeGreaterThanOrEqual(-1);
	});

	test('the desktop top bar does not duplicate the buttons on a phone', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(1);
	});
});

test.describe('Desktop keeps the actions in the top bar', () => {
	test('one set of buttons, in the sticky header', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/admin/posts/new');
		await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(1);
		const box = (await page.getByRole('button', { name: 'Publish' }).boundingBox())!;
		expect(box.y).toBeLessThan(80);
	});
});

test.describe('Phone: editors replace the shell bar with their own', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the section switcher shows on lists but not inside an editor', async ({ page }) => {
		await page.goto('/admin/posts');
		await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
		await page.goto('/admin/posts/new');
		await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeHidden();
		await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
	});
});

test.describe('Edit and Preview switch (one pane at a time)', () => {
	test('the switch sits at the far right of the toolbar and shows one pane at a time', async ({
		page
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/admin/posts/new');
		const toolbar = page.getByRole('toolbar', { name: 'Markdown formatting' });
		const tabs = page.getByRole('tablist', { name: 'Editor view' });
		await expect(tabs).toBeVisible();
		// Inside the toolbar, and to the right of every tool.
		const t = (await toolbar.boundingBox())!;
		const s = (await tabs.boundingBox())!;
		expect(s.x + s.width).toBeGreaterThan(t.x + t.width - 16);
		const lastTool = (await toolbar.getByRole('button', { name: 'Image' }).boundingBox())!;
		expect(s.x).toBeGreaterThan(lastTool.x + lastTool.width);

		// Edit is selected first: only the editor shows, never side by side.
		await expect(page.getByRole('tab', { name: 'Edit' })).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('#body')).toBeVisible();
		await expect(page.locator('#body-panel-preview')).toBeHidden();

		await page.locator('#body').fill('Hello **world**');
		await page.getByRole('tab', { name: 'Preview' }).click();
		await expect(page.getByRole('tab', { name: 'Preview' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(page.locator('#body')).toBeHidden();
		await expect(page.locator('#body-panel-preview strong')).toHaveText('world');
		// Formatting tools do nothing while previewing.
		await expect(page.getByRole('button', { name: 'Bold' })).toBeDisabled();
	});

	test('switching back keeps the text and cursor, and arrow keys move between the tabs', async ({
		page
	}) => {
		await page.goto('/admin/posts/new');
		await page.locator('#body').fill('Keep this text');
		await page.getByRole('tab', { name: 'Preview' }).click();
		await page.getByRole('tab', { name: 'Edit' }).click();
		await expect(page.locator('#body')).toHaveValue('Keep this text');
		await page.getByRole('tab', { name: 'Edit' }).focus();
		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('tab', { name: 'Preview' })).toBeFocused();
		await expect(page.getByRole('tab', { name: 'Preview' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(page.locator('#body-panel-preview')).toBeVisible();
	});

	test('editing does not count as unsaved when only switching tabs', async ({ page }) => {
		await page.goto('/admin/posts/new');
		await page.getByRole('tab', { name: 'Preview' }).click();
		await expect(page.getByText('All changes saved')).toBeVisible();
	});

	test('on a phone the switch stays in the toolbar', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/admin/posts/new');
		await expect(page.getByRole('tablist', { name: 'Editor view' })).toBeVisible();
		await page.getByRole('tab', { name: 'Preview' }).click();
		await expect(page.locator('#body-panel-preview')).toBeVisible();
	});
});

test.describe('Post details: tags and project on their own rows, no notes', () => {
	test('tags and the project selector each have their own row', async ({ page }) => {
		for (const width of [1280, 390]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/admin/posts/new');
			const tags = (await page.locator('#tags-new').boundingBox())!;
			const project = (await page.locator('#project').boundingBox())!;
			// The project field is below Tags, starting at the same left edge.
			expect(project.y).toBeGreaterThan(tags.y + tags.height);
			expect(Math.abs(project.x - tags.x)).toBeLessThan(2);
		}
	});

	test('the notes under the fields are gone', async ({ page }) => {
		await page.goto('/admin/posts/new');
		for (const note of [
			'Made from the title. You can edit it until you publish.',
			'Shown on cards and used as the page description.',
			'Optional. Shown at the end of the post.',
			'Describes the image for people who cannot see it.'
		]) {
			await expect(page.getByText(note)).toHaveCount(0);
		}
	});

	test('tags are toggle chips: click to add, click again to remove, and they save', async ({
		page
	}) => {
		const { sql } = await import('./db');
		await sql(
			`insert into tags (slug, name) values ('e2e-chip-a', 'E2E Chip A'), ('e2e-chip-b', 'E2E Chip B') on conflict do nothing`
		);
		try {
			await page.goto('/admin/posts/new');
			const a = page.getByRole('button', { name: 'E2E Chip A', exact: true });
			const b = page.getByRole('button', { name: 'E2E Chip B', exact: true });
			await a.click();
			await b.click();
			await b.click();
			await expect(a).toHaveAttribute('aria-pressed', 'true');
			await expect(b).toHaveAttribute('aria-pressed', 'false');
			await page.getByLabel('Title').fill('E2E Chips');
			await page.getByLabel('Excerpt').fill('x');
			await page.getByRole('button', { name: 'Save draft' }).click();
			await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);
			await expect(page.getByRole('button', { name: 'E2E Chip A', exact: true })).toHaveAttribute(
				'aria-pressed',
				'true'
			);
			await expect(page.getByRole('button', { name: 'E2E Chip B', exact: true })).toHaveAttribute(
				'aria-pressed',
				'false'
			);
		} finally {
			await sql(`delete from tags where slug like 'e2e-chip-%'`);
		}
	});
});
