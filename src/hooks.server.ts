import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { ADMIN_GITHUB_ID, RATE_LIMIT_SECRET } from '$app/env/private';
import { createSupabase } from '#lib/server/auth/supabase.js';
import { resolveSession } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { createRateLimitHandle } from '#lib/server/rate-limit/handle.js';
import { headers } from '#lib/server/headers.js';
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

/**
 * The markdown processor and its syntax highlighter set themselves up on first use, which took about two seconds
 * on the first preview or post. Doing one render at start-up moves that cost out of the first visitor's request.
 */
void import('#lib/markdown/render.js').then(({ renderMarkdown }) =>
	renderMarkdown(['```ts', 'const warm = 1;', '```', '', '> [!NOTE]', '> warm'].join('\n'))
);

export const handle: Handle = sequence(headers, rateLimit, authenticate);

/**
 * Unexpected errors are logged on the server and never shown (FR-30): the visitor gets a generic message
 * and the 500 page, with no stack, query or database detail.
 */
export const handleError: HandleServerError = (input) => {
	if (input.kind === 'unknown') {
		const { error, event } = input;
		console.error(`Unhandled error on ${event.request.method} ${event.url.pathname}`, error);
		return { message: 'Something went wrong', status: 500 };
	}
	// App errors (404 and friends) and framework errors keep their safe defaults.
};
