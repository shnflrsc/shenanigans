import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { readTimeMinutes, renderMarkdown } from '#lib/markdown/render.js';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import type { RequestHandler } from './$types';

const body = z.object({ markdown: z.string().max(200_000) });

/** Live preview for the editors. Uses the same render function as the public pages, so what is previewed is what is published (SR-13). */
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const parsed = body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return json({ message: 'That request was not valid' }, { status: 400 });
	return json({
		html: renderMarkdown(parsed.data.markdown),
		readTime: readTimeMinutes(parsed.data.markdown)
	});
};
