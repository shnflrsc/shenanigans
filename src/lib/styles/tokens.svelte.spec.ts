import { describe, expect, it } from 'vitest';
import '../../routes/layout.css';

const probe = () => {
	const el = document.createElement('div');
	el.className = 'bg-paper text-ink rounded-lg';
	document.body.append(el);
	return el;
};

describe('design tokens', () => {
	it('resolve to light values by default and dark values under data-theme', () => {
		document.documentElement.dataset.theme = 'light';
		const el = probe();
		expect(getComputedStyle(el).backgroundColor).toBe('rgb(255, 255, 255)');
		expect(getComputedStyle(el).color).toBe('rgb(55, 53, 47)');
		expect(getComputedStyle(el).borderRadius).toBe('10px');

		document.documentElement.dataset.theme = 'dark';
		expect(getComputedStyle(el).backgroundColor).toBe('rgb(25, 25, 25)');
		expect(getComputedStyle(el).color).toBe('rgb(235, 235, 234)');
		el.remove();
	});
});
