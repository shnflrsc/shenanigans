import { isr } from '#lib/server/isr.js';
import { content } from '#lib/server/content/index.js';
import { readTimeMinutes } from '#lib/markdown/render.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [featured, latest, counts] = await Promise.all([
		content.getFeaturedProject(),
		content.listPublishedPosts({ limit: 3 }),
		content.countPublished()
	]);
	return {
		featured,
		counts,
		posts: latest.posts.map(({ body, ...post }) => ({
			...post,
			readTime: readTimeMinutes(body)
		}))
	};
};

export const config = isr;
