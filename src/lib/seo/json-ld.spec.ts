import { describe, expect, it } from 'vitest';
import { breadcrumbLd, homeLd, postLd, projectLd, serializeLd } from './json-ld';

describe('serializeLd', () => {
	it('cannot be closed early by content', () => {
		const text = serializeLd({ name: '</script><script>alert(1)</script><!--' });
		expect(text).not.toContain('<');
		expect(JSON.parse(text).name).toBe('</script><script>alert(1)</script><!--');
	});
});

describe('structured data', () => {
	it('describes the site and its owner on Home', () => {
		const [site, person] = homeLd();
		expect(site['@type']).toBe('WebSite');
		expect(person['@type']).toBe('Person');
		expect(person.sameAs).toHaveLength(2);
	});

	it('numbers breadcrumbs from Home', () => {
		const list = breadcrumbLd([{ name: 'Blog', path: '/blog' }]) as {
			itemListElement: { position: number; item: string }[];
		};
		expect(list.itemListElement.map((i) => [i.position, i.item])).toEqual([
			[1, 'https://shenanigans.is-a.dev'],
			[2, 'https://shenanigans.is-a.dev/blog']
		]);
	});

	it('marks a post as a BlogPosting with its dates', () => {
		const [post] = postLd({
			slug: 'hello',
			title: 'Hello',
			excerpt: 'Hi',
			publishedAt: '2026-10-01T00:00:00Z',
			updatedAt: '2026-10-02T00:00:00Z',
			image: 'https://shenanigans.is-a.dev/og/hello.png'
		});
		expect(post['@type']).toBe('BlogPosting');
		expect(post.datePublished).toBe('2026-10-01T00:00:00.000Z');
		expect(post.dateModified).toBe('2026-10-02T00:00:00.000Z');
	});

	it('uses SoftwareSourceCode only for a project with a repository', () => {
		const base = { slug: 'p', title: 'P', summary: 's', year: 2026, tags: [], image: null };
		expect(projectLd({ ...base, repoUrl: 'https://github.com/x/y' })[0]['@type']).toBe(
			'SoftwareSourceCode'
		);
		expect(projectLd({ ...base, repoUrl: null })[0]['@type']).toBe('CreativeWork');
	});
});
