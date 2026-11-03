import type { Page } from '@playwright/test';
import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits } from './db';

test.beforeEach(async ({ context }) => {
	await resetRateLimits();
	await signInAsAdmin(context);
});
test.afterAll(async () => {
	await resetRateLimits();
});

const editor = async (page: Page) => {
	await page.goto('/admin/posts/new');
	const box = page.locator('#body');
	await box.click();
	return box;
};

test.describe('Markdown editor shortcuts', () => {
	test('Ctrl+B and Ctrl+I wrap the selection and take the markers off again', async ({ page }) => {
		const box = await editor(page);
		await box.fill('hello world');
		await box.press('Control+a');
		await box.press('Control+b');
		await expect(box).toHaveValue('**hello world**');
		await box.press('Control+b');
		await expect(box).toHaveValue('hello world');
		await box.press('Control+a');
		await box.press('Control+i');
		await expect(box).toHaveValue('_hello world_');
	});

	test('Ctrl+K makes a link and leaves the address selected', async ({ page }) => {
		const box = await editor(page);
		await box.fill('docs');
		await box.press('Control+a');
		await box.press('Control+k');
		await expect(box).toHaveValue('[docs](https://)');
		await page.keyboard.type('https://example.com');
		await expect(box).toHaveValue('[docs](https://example.com)');
	});

	test('Enter continues a bullet list, and Enter on an empty item ends it', async ({ page }) => {
		const box = await editor(page);
		await page.keyboard.type('- one');
		await page.keyboard.press('Enter');
		await expect(box).toHaveValue('- one\n- ');
		await page.keyboard.type('two');
		await page.keyboard.press('Enter');
		await page.keyboard.press('Enter');
		await expect(box).toHaveValue('- one\n- two\n');
	});

	test('Enter numbers the next item and continues a quote', async ({ page }) => {
		const box = await editor(page);
		await page.keyboard.type('1. first');
		await page.keyboard.press('Enter');
		await expect(box).toHaveValue('1. first\n2. ');
		await box.fill('> quoted');
		await page.keyboard.press('Enter');
		await expect(box).toHaveValue('> quoted\n> ');
	});

	test('Tab nests a list item and Shift+Tab lifts it; Escape lets Tab leave', async ({ page }) => {
		const box = await editor(page);
		await page.keyboard.type('- one');
		await page.keyboard.press('Enter');
		await page.keyboard.type('two');
		await page.keyboard.press('Tab');
		await expect(box).toHaveValue('- one\n  - two');
		await page.keyboard.press('Shift+Tab');
		await expect(box).toHaveValue('- one\n- two');
		await page.keyboard.press('Escape');
		await page.keyboard.press('Tab');
		await expect(box).not.toBeFocused();
	});

	test('list keys are plain text inside a code fence', async ({ page }) => {
		const box = await editor(page);
		await box.fill('```\n- not a list');
		await page.keyboard.press('Enter');
		await expect(box).toHaveValue('```\n- not a list\n');
	});

	test('toolbar buttons toggle line prefixes on every selected line', async ({ page }) => {
		const box = await editor(page);
		await box.fill('a\nb');
		await box.press('Control+a');
		await page.getByRole('button', { name: 'List', exact: true }).click();
		await expect(box).toHaveValue('- a\n- b');
		await page.getByRole('button', { name: 'List', exact: true }).click();
		await expect(box).toHaveValue('a\nb');
		await page.getByRole('button', { name: 'Numbered list' }).click();
		await expect(box).toHaveValue('1. a\n2. b');
	});

	test('pasting an address over selected text makes a link, and Ctrl+Z undoes edits', async ({
		page
	}) => {
		const box = await editor(page);
		await box.fill('my site');
		await box.press('Control+a');
		await page.evaluate(() => {
			const data = new DataTransfer();
			data.setData('text/plain', 'https://example.com');
			document
				.querySelector('#body')!
				.dispatchEvent(
					new ClipboardEvent('paste', { clipboardData: data, cancelable: true, bubbles: true })
				);
		});
		await expect(box).toHaveValue('[my site](https://example.com)');
		await box.press('Control+z');
		await expect(box).toHaveValue('my site');
	});
});
