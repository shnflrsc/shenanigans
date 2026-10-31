import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';
import { ADMIN_GITHUB_ID, RATE_LIMIT_SECRET } from '$app/env/private';
import { createSupabase } from '#lib/server/auth/supabase.js';
import { resolveSession } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { createRateLimitHandle } from '#lib/server/rate-limit/handle.js';
import { checkRequest } from '#lib/server/rate-limit/index.js';

/** Counts login-surface requests per client IP before any auth call (SR-14). */
const rateLimit = createRateLimitHandle((ip, pathname, hasSessionCookie) =>
	checkRequest({ db, secret: RATE_LIMIT_SECRET, ip }, pathname, hasSessionCookie)
);

/** Validates the session with Supabase on every request that has one (SR-1) and applies the allowlist (SR-3). */
const authenticate: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabase(event);
	event.locals.user = null;
	event.locals.denied = false;

	// Visitors carry no session cookie, so public pages skip the Supabase round trip.
	// Rate-limited requests never reach Supabase.
	const hasSession = event.cookies.getAll().some((c) => c.name.startsWith('sb-'));
	if (hasSession && !event.locals.rateLimit) {
		const session = await resolveSession(event.locals.supabase, ADMIN_GITHUB_ID);
		if (session.status === 'admin') event.locals.user = session.user;
		if (session.status === 'denied') event.locals.denied = true;
	}

	return resolve(event);
};

export const handle: Handle = sequence(rateLimit, authenticate);
