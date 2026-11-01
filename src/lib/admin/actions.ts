import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { toast } from 'svelte-sonner';

/** What to tell the admin after a save: a short title, nothing more. */
export function saveToast(
	intent: 'save' | 'publish' | 'unpublish',
	status: 'draft' | 'published'
): { title: string } {
	if (intent === 'publish') return { title: 'Published.' };
	if (intent === 'unpublish') return { title: 'Unpublished.' };
	return { title: status === 'published' ? 'Saved.' : 'Draft saved.' };
}

type Result = { ok: boolean; data?: Record<string, unknown>; message?: string };

/**
 * Calls a form action on the current page from a button or menu item (no form in the DOM), then
 * refreshes the page data. Failures show a toast that stays until dismissed; successes close after 5 seconds.
 */
export async function runAction(
	action: string,
	fields: Record<string, string>,
	options: { success?: string; description?: string } = {}
): Promise<Result> {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) body.set(key, value);
	try {
		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());
		if (result.type === 'success') {
			await invalidateAll();
			if (options.success) toast.success(options.success, { description: options.description });
			return { ok: true, data: result.data as Record<string, unknown> | undefined };
		}
		const message =
			result.type === 'failure'
				? String(
						(result.data as { message?: string } | undefined)?.message ?? 'Something went wrong'
					)
				: response.status === 401 || result.type === 'redirect'
					? 'Your session expired. Sign in again to continue.'
					: 'Something went wrong';
		toast.error(message, { duration: Infinity, closeButton: true });
		return { ok: false, message };
	} catch {
		const message = 'Could not reach the server. Check your connection and try again.';
		toast.error(message, { duration: Infinity, closeButton: true });
		return { ok: false, message };
	}
}
