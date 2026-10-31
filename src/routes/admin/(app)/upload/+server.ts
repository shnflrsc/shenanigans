import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$app/env/private';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import { checkUpload, objectPath } from '#lib/server/uploads.js';
import type { RequestHandler } from './$types';

const BUCKET = 'images';

/**
 * Image upload for covers and markdown (FR-13). Admin only. The type is checked from the file's own bytes,
 * the size is capped, the object name is random, and only the storage path is returned (SR-9).
 * The service role key stays on the server; the bucket is public-read, admin-write.
 */
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const form = await event.request.formData().catch(() => null);
	const file = form?.get('file');
	if (!(file instanceof File))
		return json({ message: 'Choose an image to upload.' }, { status: 400 });

	const bytes = new Uint8Array(await file.arrayBuffer());
	const check = checkUpload(file, bytes.subarray(0, 16));
	if (!check.ok) return json({ message: check.message }, { status: 422 });

	const storage = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	}).storage;
	const path = objectPath(check.extension);

	let { error } = await storage.from(BUCKET).upload(path, bytes, {
		contentType: check.type,
		cacheControl: '31536000',
		upsert: false
	});
	if (error && /bucket not found/i.test(error.message)) {
		await storage.createBucket(BUCKET, {
			public: true,
			fileSizeLimit: '5MB',
			allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
		});
		({ error } = await storage.from(BUCKET).upload(path, bytes, {
			contentType: check.type,
			cacheControl: '31536000',
			upsert: false
		}));
	}
	if (error) {
		console.error('image upload failed', error);
		return json({ message: 'The upload failed. Try again.' }, { status: 502 });
	}
	return json({
		path,
		url: `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
	});
};
