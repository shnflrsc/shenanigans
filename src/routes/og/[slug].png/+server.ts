import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { formatDate, formatReadTime } from '#lib/format.js';
import { readTimeMinutes } from '#lib/markdown/render.js';
import { content } from '#lib/server/content/index.js';
import { renderPostImage, renderSiteImage } from '#lib/server/og/render.js';
import type { RequestHandler } from './$types';

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** Cached per instance by slug and last edit, so an edited post renders again at once. */
const cache = new Map<string, Uint8Array>();
const remember = (key: string, png: Uint8Array) => {
	if (cache.size >= 100) cache.delete(cache.keys().next().value!);
	cache.set(key, png);
	return png;
};

// Short shared cache keeps the image inside the 60 second freshness window (FR-32, PR-6).
const headers = {
	'Content-Type': 'image/png',
	'Cache-Control': 'public, max-age=0, s-maxage=45, stale-while-revalidate=10'
};

/** `/og/site.png` is the site preview; `/og/<post-slug>.png` is that published post's preview (FR-32). */
export const GET: RequestHandler = async ({ params }) => {
	const parsed = slug.safeParse(params.slug);
	if (!parsed.success) error(404, 'Not found');

	if (parsed.data === 'site') {
		const png = cache.get('site') ?? remember('site', await renderSiteImage());
		return new Response(png as BodyInit, { headers });
	}

	const found = await content.getPublishedPost(parsed.data);
	if (!found) error(404, 'Not found');
	const { post } = found;
	const key = `${post.slug}:${post.updatedAt.getTime()}`;
	const png =
		cache.get(key) ??
		remember(
			key,
			await renderPostImage({
				title: post.title,
				date: post.publishedAt ? formatDate(post.publishedAt) : '',
				readTime: formatReadTime(readTimeMinutes(post.body))
			})
		);
	return new Response(png as BodyInit, { headers });
};
