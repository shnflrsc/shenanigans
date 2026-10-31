import { describe, expect, it, vi } from 'vitest';
import { affectedPaths, revalidatePublic } from './revalidate';

describe('affectedPaths (PR-6)', () => {
	it('always includes the indexes, Home and the sitemap', () => {
		expect(affectedPaths({})).toEqual(['/', '/projects', '/blog', '/sitemap.xml']);
	});

	it('adds the changed post page and preview image, and the changed project page', () => {
		const paths = affectedPaths({ posts: ['hello'], projects: ['site'] });
		expect(paths).toContain('/blog/hello');
		expect(paths).toContain('/og/hello.png');
		expect(paths).toContain('/projects/site');
	});
});

describe('revalidatePublic', () => {
	it('does nothing without a bypass token (the 60 second cache window is the fallback)', async () => {
		const fetcher = vi.fn();
		await revalidatePublic(
			{ posts: ['a'] },
			{ origin: 'https://x.test', fetch: fetcher as unknown as typeof fetch }
		);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('requests every affected URL with the bypass header, and survives failures', async () => {
		const fetcher = vi.fn(async (url: string | URL | Request) => {
			if (String(url).endsWith('/blog')) throw new Error('boom');
			return new Response(null);
		});
		await revalidatePublic(
			{ posts: ['a'] },
			{ token: 't0ken', origin: 'https://x.test', fetch: fetcher as unknown as typeof fetch }
		);
		const urls = fetcher.mock.calls.map((c) => String(c[0]));
		expect(urls).toContain('https://x.test/blog/a');
		for (const call of fetcher.mock.calls) {
			const headers = (call[1] as RequestInit).headers as Record<string, string>;
			expect(headers['x-prerender-revalidate']).toBe('t0ken');
		}
	});
});
