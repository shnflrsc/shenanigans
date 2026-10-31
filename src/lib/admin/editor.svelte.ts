import { deserialize } from '$app/forms';

export type Intent = 'save' | 'publish' | 'unpublish';
export type Phase = 'idle' | 'saving' | 'saved' | 'failed' | 'expired';
export type IndicatorState = 'clean' | 'unsaved' | 'saving' | 'saved' | 'failed' | 'expired';

export type SaveResult = {
	id: string;
	slug: string;
	status: 'draft' | 'published';
	publishedAt: string | null;
};

/**
 * Editor state shared by the post and project editors. Everything typed stays in `data` no matter what
 * the server says, so a failed save (including an expired session or a lost connection) never loses text (FR-22).
 * There is no autosave (FR-21): `dirty` drives the "Unsaved changes" indicator and the leave warning.
 */
export class Editor<T extends object> {
	data = $state() as T;
	#baseline = $state('');
	phase = $state<Phase>('idle');
	errors = $state<Record<string, string>>({});
	message = $state<string | null>(null);

	constructor(initial: T) {
		this.data = initial;
		this.#baseline = JSON.stringify(initial);
	}

	dirty = $derived(JSON.stringify(this.data) !== this.#baseline);

	status: IndicatorState = $derived(
		this.phase === 'saving'
			? 'saving'
			: this.phase === 'expired'
				? 'expired'
				: this.phase === 'failed'
					? 'failed'
					: this.dirty
						? 'unsaved'
						: this.phase === 'saved'
							? 'saved'
							: 'clean'
	);

	/** Marks the current content as saved without a request (after a redirect to the saved item). */
	markSaved() {
		this.#baseline = JSON.stringify(this.data);
		this.phase = 'saved';
	}

	dismissError() {
		if (this.phase === 'failed') this.phase = 'idle';
		this.message = null;
	}

	/** Saves, and publishes or unpublishes when asked. Returns the result, or null if it failed. */
	async submit(intent: Intent): Promise<SaveResult | null> {
		this.phase = 'saving';
		this.errors = {};
		this.message = null;

		const body = new FormData();
		body.set('intent', intent);
		body.set('payload', JSON.stringify(this.data));

		let response: Response;
		try {
			response = await fetch('?/save', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
		} catch {
			this.phase = 'failed';
			this.message =
				'Could not reach the server. Your changes are still here. Check your connection and try again.';
			return null;
		}

		if (response.status === 401 || response.status === 403) {
			this.phase = 'expired';
			this.message = 'Your session expired.';
			return null;
		}
		let result: ReturnType<typeof deserialize>;
		try {
			result = deserialize(await response.text());
		} catch {
			this.phase = 'failed';
			this.message = 'The server sent something unexpected. Your changes are still here.';
			return null;
		}

		if (result.type === 'success') {
			this.#baseline = JSON.stringify(this.data);
			this.phase = 'saved';
			return result.data as unknown as SaveResult;
		}
		if (result.type === 'redirect') {
			// Sent to the login screen: the session is gone.
			this.phase = 'expired';
			this.message = 'Your session expired.';
			return null;
		}
		const data = (result.type === 'failure' ? result.data : undefined) as
			{ message?: string; errors?: Record<string, string> } | undefined;
		this.phase = 'failed';
		this.errors = data?.errors ?? {};
		this.message =
			data?.message ??
			(response.status === 429
				? 'Too many requests. Wait a moment and try again.'
				: 'Something went wrong. Your changes are still here.');
		return null;
	}
}
