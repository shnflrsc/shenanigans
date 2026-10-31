import { content } from '#lib/server/content/index.js';
import { site } from '#lib/site.js';
import type { RequestHandler } from './$types';

const escape = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Lists only published pages: Home, the indexes, each published project and post. Never admin pages (FR-31). */
export const GET: RequestHandler = async () => {
	const { projects, posts } = await content.listPublishedEntries();
	const entries = [
		{ path: '/' },
		{ path: '/projects' },
		{ path: '/blog' },
		...projects.map((p) => ({ path: `/projects/${p.slug}`, lastmod: p.updatedAt })),
		...posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updatedAt }))
	];
	const body = entries
		.map(
			(e) =>
				`  <url><loc>${escape(site.origin + e.path)}</loc>${
					'lastmod' in e && e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ''
				}</url>`
		)
		.join('\n');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
		{
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=0, s-maxage=45, stale-while-revalidate=10'
			}
		}
	);
};
