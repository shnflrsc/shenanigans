import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';
import { ADMIN_GITHUB_ID } from '$app/env/private';
import { createSupabase } from '#lib/server/auth/supabase.js';
import { resolveSession } from '#lib/server/auth/session.js';

/** Validates the session with Supabase on every request (SR-1) and applies the allowlist (SR-3). */
const authenticate: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabase(event);
	event.locals.user = null;
	event.locals.denied = false;

	// Public pages carry no session cookie from a visitor, so skip the Supabase round trip for them.
	const hasSession = event.cookies.getAll().some((c) => c.name.startsWith('sb-'));
	if (hasSession) {
		const session = await resolveSession(event.locals.supabase, ADMIN_GITHUB_ID);
		if (session.status === 'admin') event.locals.user = session.user;
		if (session.status === 'denied') event.locals.denied = true;
	}

	return resolve(event, {
		// Supabase reads these headers; keep them out of the way of the app's own.
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

export const handle: Handle = sequence(authenticate);
