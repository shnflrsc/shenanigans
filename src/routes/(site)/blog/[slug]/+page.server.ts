import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { renderMarkdown, readTimeMinutes } from '#lib/markdown/render.js';
import { content } from '#lib/server/content/index.js';
import type { PageServerLoad } from './$types';

const params = z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/) });

export const load: PageServerLoad = async ({ params: raw }) => {
	const parsed = params.safeParse(raw);
	if (!parsed.success) error(404, 'Not found');
	const found = await content.getPublishedPost(parsed.data.slug);
	if (!found) error(404, 'Not found');

	const { post, project, older, newer } = found;
	return {
		post: { ...post, body: undefined },
		html: renderMarkdown(post.body),
		readTime: readTimeMinutes(post.body),
		// Shown only when the linked project is published (FR-28); the query already guarantees it.
		project,
		older,
		newer
	};
};
