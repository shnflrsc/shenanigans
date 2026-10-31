import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import {
	AdminError,
	createPost,
	createTag,
	deletePost,
	getPost,
	listProjects,
	listTags,
	setPostStatus,
	updatePost
} from '#lib/server/content/admin.js';
import { fieldErrors, idParam, postInput, tagName } from '#lib/server/content/validation.js';
import { db } from '#lib/server/db/index.js';
import { revalidatePublic } from '#lib/server/revalidate.js';
import { removeImages } from '#lib/server/storage.js';
import type { Actions, PageServerLoad } from './$types';

const idOrNew = z.union([z.literal('new'), idParam]);

export const load: PageServerLoad = async (event) => {
	requireAdmin(event, { redirectToLogin: true });
	const parsed = idOrNew.safeParse(event.params.id);
	if (!parsed.success) error(404, 'Not found');

	const [tags, projects] = await Promise.all([listTags(db), listProjects(db)]);
	const base = {
		tags: tags.map(({ id, name, slug }) => ({ id, name, slug })),
		projects: projects.map((p) => ({ id: p.id, title: p.title }))
	};
	if (parsed.data === 'new') return { ...base, post: null };

	const post = await getPost(db, parsed.data);
	if (!post) error(404, 'Not found');
	return { ...base, post };
};

const saveForm = z.object({
	intent: z.enum(['save', 'publish', 'unpublish']),
	payload: z.string().max(400_000)
});

export const actions: Actions = {
	/** One action for Save draft, Save, Publish and Unpublish: saves the content, then changes status if asked. */
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
		const input = postInput.safeParse(json);
		if (!input.success)
			return fail(422, {
				message: 'Check the highlighted fields',
				errors: fieldErrors(input.error)
			});

		const idPart = idOrNew.safeParse(event.params.id);
		if (!idPart.success) return fail(404, { message: 'Post not found' });

		try {
			const id = idPart.data === 'new' ? await createPost(db, input.data) : idPart.data;
			if (idPart.data !== 'new') {
				const { previousCover } = await updatePost(db, id, input.data);
				if (previousCover !== input.data.coverImage) await removeImages([previousCover]);
			}

			let row: { slug: string };
			if (form.data.intent === 'publish') row = await setPostStatus(db, id, 'published');
			else if (form.data.intent === 'unpublish') row = await setPostStatus(db, id, 'draft');
			else row = { slug: input.data.slug };
			await revalidatePublic({ posts: [row.slug] });

			const saved = await getPost(db, id);
			return {
				ok: true,
				id,
				slug: saved!.slug,
				status: saved!.status,
				publishedAt: saved!.publishedAt?.toISOString() ?? null
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

	delete: async (event) => {
		requireAdmin(event);
		const id = idParam.safeParse(event.params.id);
		if (!id.success) return fail(404, { message: 'Post not found' });
		try {
			const row = await deletePost(db, id.data);
			await removeImages([row.coverImage]);
			await revalidatePublic({ posts: [row.slug] });
		} catch (e) {
			if (e instanceof AdminError) return fail(404, { message: e.message });
			throw e;
		}
		redirect(303, '/admin/posts');
	},

	/** Creates a tag while editing; an existing name in any letter case is reused. */
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
