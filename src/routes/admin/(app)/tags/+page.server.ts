import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import {
	AdminError,
	createTag,
	deleteTag,
	listTags,
	renameTag
} from '#lib/server/content/admin.js';
import { idParam, tagName } from '#lib/server/content/validation.js';
import { db } from '#lib/server/db/index.js';
import { revalidatePublic } from '#lib/server/revalidate.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event, { redirectToLogin: true });
	return { tags: await listTags(db) };
};

const form = async (event: { request: Request }) =>
	Object.fromEntries(await event.request.formData());

export const actions: Actions = {
	create: async (event) => {
		requireAdmin(event);
		const parsed = z.object({ name: tagName }).safeParse(await form(event));
		if (!parsed.success)
			return fail(422, { message: parsed.error.issues[0].message, field: 'name' });
		try {
			const { tag, created } = await createTag(db, parsed.data.name);
			if (!created) return fail(409, { message: `“${tag.name}” already exists.`, field: 'name' });
			return { ok: true, name: tag.name };
		} catch (e) {
			if (e instanceof AdminError) return fail(422, { message: e.message, field: 'name' });
			throw e;
		}
	},

	rename: async (event) => {
		requireAdmin(event);
		const parsed = z.object({ id: idParam, name: tagName }).safeParse(await form(event));
		if (!parsed.success)
			return fail(422, { message: parsed.error.issues[0].message, field: 'name' });
		try {
			await renameTag(db, parsed.data.id, parsed.data.name);
			// Tag names show on public cards and filters.
			await revalidatePublic({});
			return { ok: true };
		} catch (e) {
			if (e instanceof AdminError) return fail(409, { message: e.message, field: 'name' });
			throw e;
		}
	},

	/** Deletes the tag and its links; posts and projects stay untouched. */
	delete: async (event) => {
		requireAdmin(event);
		const parsed = z.object({ id: idParam }).safeParse(await form(event));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		try {
			const counts = await deleteTag(db, parsed.data.id);
			await revalidatePublic({});
			return { ok: true, name: counts.name };
		} catch (e) {
			if (e instanceof AdminError) return fail(404, { message: e.message });
			throw e;
		}
	}
};
