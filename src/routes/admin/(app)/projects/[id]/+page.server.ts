import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import {
	AdminError,
	createProject,
	createTag,
	deleteProject,
	getProject,
	listProjects,
	listTags,
	setFeatured,
	setProjectStatus,
	updateProject
} from '#lib/server/content/admin.js';
import { fieldErrors, idParam, projectInput, tagName } from '#lib/server/content/validation.js';
import { db } from '#lib/server/db/index.js';
import { revalidatePublic } from '#lib/server/revalidate.js';
import { removeImages } from '#lib/server/storage.js';
import type { Actions, PageServerLoad } from './$types';

const idOrNew = z.union([z.literal('new'), idParam]);

export const load: PageServerLoad = async (event) => {
	requireAdmin(event, { redirectToLogin: true });
	const parsed = idOrNew.safeParse(event.params.id);
	if (!parsed.success) error(404, 'Not found');

	const [tags, all] = await Promise.all([listTags(db), listProjects(db)]);
	const project = parsed.data === 'new' ? null : await getProject(db, parsed.data);
	if (parsed.data !== 'new' && !project) error(404, 'Not found');
	// Which other project would lose the featured flag, for the switch hint.
	const otherFeatured = all.find((p) => p.featured && p.id !== project?.id)?.title ?? null;
	return {
		tags: tags.map(({ id, name, slug }) => ({ id, name, slug })),
		otherFeatured,
		project
	};
};

const saveForm = z.object({
	intent: z.enum(['save', 'publish', 'unpublish']),
	payload: z.string().max(400_000)
});

export const actions: Actions = {
	save: async (event) => {
		requireAdmin(event);
		const form = saveForm.safeParse(Object.fromEntries(await event.request.formData()));
		if (!form.success) return fail(400, { message: 'That request was not valid' });
		let json: unknown;
		try {
			json = JSON.parse(form.data.payload);
		} catch {
			return fail(400, { message: 'That request was not valid' });
		}
		const input = projectInput.safeParse(json);
		if (!input.success) {
			return fail(422, {
				message: 'Check the highlighted fields',
				errors: fieldErrors(input.error)
			});
		}
		const idPart = idOrNew.safeParse(event.params.id);
		if (!idPart.success) return fail(404, { message: 'Project not found' });

		try {
			const id = idPart.data === 'new' ? await createProject(db, input.data) : idPart.data;
			if (idPart.data !== 'new') {
				const { previousCover } = await updateProject(db, id, input.data);
				if (previousCover !== input.data.coverImage) await removeImages([previousCover]);
			}
			let row: { slug: string };
			if (form.data.intent === 'publish') row = await setProjectStatus(db, id, 'published');
			else if (form.data.intent === 'unpublish') row = await setProjectStatus(db, id, 'draft');
			else row = { slug: input.data.slug };
			await revalidatePublic({ projects: [row.slug] });
			const saved = await getProject(db, id);
			return {
				ok: true,
				id,
				slug: saved!.slug,
				status: saved!.status,
				publishedAt: saved!.firstPublishedAt?.toISOString() ?? null
			};
		} catch (e) {
			if (e instanceof AdminError) {
				return fail(e.code === 'not_found' ? 404 : 409, {
					message: e.message,
					errors: e.field ? { [e.field]: e.message } : {}
				});
			}
			throw e;
		}
	},

	setFeatured: async (event) => {
		requireAdmin(event);
		const id = idParam.safeParse(event.params.id);
		const on = z
			.enum(['true', 'false'])
			.safeParse((await event.request.formData()).get('featured'));
		if (!id.success || !on.success) return fail(400, { message: 'That request was not valid' });
		try {
			const result = await setFeatured(db, id.data, on.data === 'true');
			await revalidatePublic({});
			return { ok: true, previous: result.previous };
		} catch (e) {
			if (e instanceof AdminError) return fail(404, { message: e.message });
			throw e;
		}
	},

	delete: async (event) => {
		requireAdmin(event);
		const id = idParam.safeParse(event.params.id);
		if (!id.success) return fail(404, { message: 'Project not found' });
		try {
			const row = await deleteProject(db, id.data);
			await removeImages([row.coverImage]);
			await revalidatePublic({ projects: [row.slug] });
		} catch (e) {
			if (e instanceof AdminError) return fail(404, { message: e.message });
			throw e;
		}
		redirect(303, '/admin/projects');
	},

	createTag: async (event) => {
		requireAdmin(event);
		const name = tagName.safeParse((await event.request.formData()).get('name'));
		if (!name.success) return fail(422, { message: name.error.issues[0].message });
		try {
			const { tag } = await createTag(db, name.data);
			return { ok: true, tag: { id: tag.id, name: tag.name, slug: tag.slug } };
		} catch (e) {
			if (e instanceof AdminError) return fail(422, { message: e.message });
			throw e;
		}
	}
};
