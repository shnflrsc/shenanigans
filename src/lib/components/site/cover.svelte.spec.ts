import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import '../../../routes/layout.css';
import Cover from './cover.svelte';

vi.mock('$app/env/public', () => ({ PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321' }));

describe('Cover (PR-3)', () => {
	it('lazy-loads by default and loads right away when asked', async () => {
		const lazy = await render(Cover, { path: 'covers/a.jpg', alt: 'A cover' });
		expect(lazy.container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
		const eager = await render(Cover, { path: 'covers/b.jpg', alt: 'B cover', eager: true });
		expect(eager.container.querySelector('img')?.getAttribute('loading')).toBe('eager');
	});

	it('builds the image URL from the stored path, not a stored URL', async () => {
		const { container } = await render(Cover, { path: 'covers/a.jpg', alt: 'A cover' });
		expect(container.querySelector('img')?.getAttribute('src')).toBe(
			'http://127.0.0.1:54321/storage/v1/object/public/images/covers/a.jpg'
		);
	});

	it('falls back to the muted placeholder with no image', async () => {
		const { container } = await render(Cover, { path: null });
		expect(container.querySelector('img')).toBeNull();
		expect(container.firstElementChild?.className).toContain('bg-fill-muted');
	});

	it('uses 16:10 for projects and 16:9 for posts', async () => {
		const project = await render(Cover, { path: null, ratio: '16/10' });
		expect(project.container.firstElementChild?.className).toContain('aspect-[16/10]');
		const post = await render(Cover, { path: null, ratio: '16/9' });
		expect(post.container.firstElementChild?.className).toContain('aspect-video');
	});
});
