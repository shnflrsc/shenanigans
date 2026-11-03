import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../../../../routes/layout.css';
import Switch from './switch.svelte';

const colour = (el: Element) => getComputedStyle(el).backgroundColor;

describe('Switch', () => {
	it('shows a darker track than the page and a thumb that moves when on', async () => {
		await render(Switch, { 'aria-label': 'Featured', checked: false });
		const control = page.getByRole('switch', { name: 'Featured' });
		const root = control.element();
		const thumb = root.querySelector('[data-slot="switch-thumb"]')!;
		const offTrack = colour(root);
		const offX = thumb.getBoundingClientRect().x - root.getBoundingClientRect().x;
		// The track is not the page colour, so it reads as a switch and not as an outlined button.
		expect(offTrack).not.toBe('rgba(0, 0, 0, 0)');
		expect(offTrack).not.toBe(colour(document.body));
		await control.click();
		await expect.element(control).toBeChecked();
		// The track and thumb animate, so wait for them to settle.
		await expect.poll(() => colour(root)).not.toBe(offTrack);
		await expect
			.poll(() => thumb.getBoundingClientRect().x - root.getBoundingClientRect().x)
			.toBeGreaterThan(offX + 10);
	});
});
