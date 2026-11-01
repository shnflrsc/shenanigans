import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../../../routes/layout.css';
import Tag from './tag.svelte';

describe('Tag', () => {
	it('renders a static chip', async () => {
		await render(Tag, { label: 'Svelte' });
		await expect.element(page.getByText('Svelte')).toBeVisible();
	});

	it('renders an active filter as a link with a count and ink fill', async () => {
		await render(Tag, { label: 'Svelte', count: 3, href: '/blog?tag=svelte', active: true });
		const link = page.getByRole('link', { name: /Svelte/ });
		await expect.element(link).toHaveAttribute('aria-current', 'true');
		expect(getComputedStyle(link.element()).backgroundColor).toBe('rgb(55, 53, 47)');
		await expect.element(page.getByText('3')).toBeVisible();
	});
});
