import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../../../../routes/layout.css';
import ButtonProbe from './button-probe.svelte';

describe('Button variants', () => {
	it('primary uses ink fill and secondary a strong-line border', async () => {
		document.documentElement.dataset.theme = 'light';
		render(ButtonProbe);
		const primary = page.getByRole('button', { name: 'Primary' }).element();
		const secondary = page.getByRole('button', { name: 'Secondary' }).element();
		expect(getComputedStyle(primary).backgroundColor).toBe('rgb(55, 53, 47)');
		expect(getComputedStyle(primary).color).toBe('rgb(255, 255, 255)');
		expect(getComputedStyle(secondary).borderColor).toBe('rgb(211, 210, 206)');
		expect(getComputedStyle(secondary).borderRadius).toBe('6px');
	});

	it('shows the focus ring token on keyboard focus', async () => {
		render(ButtonProbe);
		await page.getByRole('button', { name: 'Primary' }).element().focus();
		await expect.element(page.getByRole('button', { name: 'Primary' })).toHaveFocus();
	});
});
