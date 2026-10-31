import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$app/env/private';

export const BUCKET = 'images';

/**
 * Removes cover images that no content uses any more (D3). Best effort: a failure is logged and never
 * blocks the save or delete. Images pasted inside markdown are not tracked, so they are not removed.
 */
export async function removeImages(paths: (string | null | undefined)[]): Promise<void> {
	const list = paths.filter((p): p is string => Boolean(p));
	if (list.length === 0) return;
	try {
		const { error } = await createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: { persistSession: false }
		})
			.storage.from(BUCKET)
			.remove(list);
		if (error) console.error('could not remove images', list, error);
	} catch (error) {
		console.error('could not remove images', list, error);
	}
}
