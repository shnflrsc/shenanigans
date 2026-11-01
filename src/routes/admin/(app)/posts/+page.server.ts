import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import { AdminError, deletePost, listPosts, setPostStatus } from '#lib/server/content/admin.js';
import { idParam } from '#lib/server/content/validation.js';
import { db } from '#lib/server/db/index.js';
import { revalidatePublic } from '#lib/server/revalidate.js';
import { removeImages } from '#lib/server/storage.js';
import type { Actions, PageServerLoad } from './$types';

const filter = z.enum(['all', 'published', 'draft']).catch('all');

export const load: PageServerLoad = async (event) => {
	// removed
	const status = filter.parse(event.url.searchParams.get('status') ?? 'all');
	const posts = await listPosts(db, status === 'all' ? undefined : status);
	return { posts, status };
};

const statusForm = z.object({ id: idParam, status: z.enum(['draft', 'published']) });
const deleteForm = z.object({ id: idParam });

export const actions: Actions = {
	setStatus: async (event) => {
		requireAdmin(event);
		const parsed = statusForm.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		try {
			const row = await setPostStatus(db, parsed.data.id, parsed.data.status);
			await revalidatePublic({ posts: [row.slug] });
			return { ok: true };
		} catch (error) {
			if (error instanceof AdminError) return fail(404, { message: error.message });
			throw error;
		}
	},
	delete: async (event) => {
		requireAdmin(event);
		const parsed = deleteForm.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		try {
			const row = await deletePost(db, parsed.data.id);
			await removeImages([row.coverImage]);
			await revalidatePublic({ posts: [row.slug] });
			return { ok: true };
		} catch (error) {
			if (error instanceof AdminError) return fail(404, { message: error.message });
			throw error;
		}
	}
};
