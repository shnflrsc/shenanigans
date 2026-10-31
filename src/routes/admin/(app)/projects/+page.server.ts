import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import {
	AdminError,
	deleteProject,
	listProjects,
	moveProject,
	setFeatured,
	setProjectStatus
} from '#lib/server/content/admin.js';
import { idParam } from '#lib/server/content/validation.js';
import { db } from '#lib/server/db/index.js';
import { revalidatePublic } from '#lib/server/revalidate.js';
import { removeImages } from '#lib/server/storage.js';
import type { Actions, PageServerLoad } from './$types';

const filter = z.enum(['all', 'published', 'draft']).catch('all');

export const load: PageServerLoad = async (event) => {
	requireAdmin(event, { redirectToLogin: true });
	const status = filter.parse(event.url.searchParams.get('status') ?? 'all');
	// Order numbers always refer to the whole showcase, so the filter only hides rows.
	const all = await listProjects(db);
	return {
		status,
		projects: all
			.map((p, index) => ({ ...p, position: index + 1 }))
			.filter((p) => status === 'all' || p.status === status),
		total: all.length
	};
};

const form = async (event: { request: Request }) =>
	Object.fromEntries(await event.request.formData());

/** Runs an admin mutation and turns business-rule errors into form failures. */
async function guarded<T>(work: () => Promise<T>) {
	try {
		return await work();
	} catch (error) {
		if (error instanceof AdminError) return fail(404, { message: error.message });
		throw error;
	}
}

export const actions: Actions = {
	setStatus: async (event) => {
		requireAdmin(event);
		const parsed = z
			.object({ id: idParam, status: z.enum(['draft', 'published']) })
			.safeParse(await form(event));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		return guarded(async () => {
			const row = await setProjectStatus(db, parsed.data.id, parsed.data.status);
			await revalidatePublic({ projects: [row.slug] });
			return { ok: true };
		});
	},

	/** Turning one on turns the previous one off in the same transaction (FR-16). */
	setFeatured: async (event) => {
		requireAdmin(event);
		const parsed = z
			.object({ id: idParam, featured: z.enum(['true', 'false']) })
			.safeParse(await form(event));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		return guarded(async () => {
			const result = await setFeatured(db, parsed.data.id, parsed.data.featured === 'true');
			await revalidatePublic({});
			return { ok: true, title: result.title, previous: result.previous };
		});
	},

	move: async (event) => {
		requireAdmin(event);
		const parsed = z
			.object({ id: idParam, direction: z.enum(['up', 'down']) })
			.safeParse(await form(event));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		return guarded(async () => {
			await moveProject(db, parsed.data.id, parsed.data.direction);
			await revalidatePublic({});
			return { ok: true };
		});
	},

	delete: async (event) => {
		requireAdmin(event);
		const parsed = z.object({ id: idParam }).safeParse(await form(event));
		if (!parsed.success) return fail(400, { message: 'That request was not valid' });
		return guarded(async () => {
			const row = await deleteProject(db, parsed.data.id);
			await removeImages([row.coverImage]);
			await revalidatePublic({ projects: [row.slug] });
			return { ok: true };
		});
	}
};
