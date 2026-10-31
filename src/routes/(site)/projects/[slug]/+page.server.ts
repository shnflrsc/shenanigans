import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { renderMarkdown, readTimeMinutes } from '#lib/markdown/render.js';
import { content } from '#lib/server/content/index.js';
import type { PageServerLoad } from './$types';

const params = z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/) });

export const load: PageServerLoad = async ({ params: raw }) => {
	const parsed = params.safeParse(raw);
	// Unknown, unpublished and deleted all look the same: a real 404 (FR-30).
	if (!parsed.success) error(404, 'Not found');
	const found = await content.getPublishedProject(parsed.data.slug);
	if (!found) error(404, 'Not found');

	const { project, previous, next } = found;
	const body = project.body ?? '';
	return {
		project: { ...project, body: undefined, hasBody: body.trim().length > 0 },
		html: renderMarkdown(body),
		readTime: readTimeMinutes(body),
		previous,
		next
	};
};
