import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A URL slug from free text: lower case, words joined by single hyphens, accents removed. */
export function slugify(text: string): string {
	return text
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/, '');
}

const slug = z
	.string()
	.trim()
	.min(1, 'Add a slug')
	.max(80)
	.regex(SLUG_PATTERN, 'Use lower case letters, numbers and single hyphens');

/** Empty strings from forms become null. */
const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((v) => (v === '' ? null : v))
		.nullable()
		.optional()
		.transform((v) => v ?? null);

const optionalUrl = z
	.string()
	.trim()
	.max(500)
	.transform((v) => (v === '' ? null : v))
	.nullable()
	.optional()
	.transform((v) => v ?? null)
	.refine((v) => v === null || /^https?:\/\//i.test(v), 'Use a full link starting with https://');

/** Storage path of an uploaded image: random name under the images bucket, no traversal (SR-9). */
export const storagePath = z
	.string()
	.trim()
	.max(300)
	.regex(/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/, 'Not a valid image path')
	.refine((v) => !v.includes('..'), 'Not a valid image path');

const cover = {
	coverImage: z
		.union([storagePath, z.literal('')])
		.nullable()
		.optional()
		.transform((v) => (v ? v : null)),
	coverAlt: optionalText(300)
};

/** A cover needs alt text (3.2): "Add alt text for the cover image". */
const needsAlt = <T extends { coverImage: string | null; coverAlt: string | null }>(
	v: T,
	ctx: z.RefinementCtx
) => {
	if (v.coverImage && !v.coverAlt) {
		ctx.addIssue({
			code: 'custom',
			path: ['coverAlt'],
			message: 'Add alt text for the cover image'
		});
	}
};

const tagIds = z.array(z.uuid()).max(20).default([]);

export const postInput = z
	.object({
		title: z.string().trim().min(1, 'Add a title').max(200),
		slug,
		excerpt: z.string().trim().min(1, 'Add an excerpt').max(500),
		body: z.string().max(200_000).default(''),
		projectId: z
			.union([z.uuid(), z.literal('')])
			.nullable()
			.optional()
			.transform((v) => (v ? v : null)),
		tagIds,
		...cover
	})
	.superRefine(needsAlt);
export type PostInput = z.infer<typeof postInput>;

export const projectInput = z
	.object({
		title: z.string().trim().min(1, 'Add a title').max(200),
		slug,
		summary: z.string().trim().min(1, 'Add a summary').max(500),
		body: z
			.string()
			.max(200_000)
			.nullable()
			.optional()
			.transform((v) => (v && v.trim() !== '' ? v : null)),
		year: z
			.union([z.coerce.number().int().min(1990).max(2100), z.literal('')])
			.nullable()
			.optional()
			.transform((v) => (v === '' || v === undefined ? null : v)),
		role: optionalText(100),
		team: optionalText(100),
		liveUrl: optionalUrl,
		repoUrl: optionalUrl,
		tagIds,
		...cover
	})
	.superRefine(needsAlt);
export type ProjectInput = z.infer<typeof projectInput>;

export const tagName = z.string().trim().min(1, 'Add a name').max(40);
export const idParam = z.uuid();

/** Flattens Zod issues to { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = issue.path.join('.') || 'form';
		out[key] ??= issue.message;
	}
	return out;
}
