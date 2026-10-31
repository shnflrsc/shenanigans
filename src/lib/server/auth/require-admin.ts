import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

/**
 * Every admin load, form action and endpoint calls this itself; the layout guard is not enough (SR-2).
 * `locals.user` is only ever set by hooks.server.ts for the allowlisted GitHub account.
 *
 * Pages redirect to the login screen; actions and endpoints answer 401 so a script gets a clear failure.
 */
export function requireAdmin(
	event: Pick<RequestEvent, 'locals'>,
	options: { redirectToLogin?: boolean } = {}
): User {
	const user = event.locals.user;
	if (user) return user;
	if (options.redirectToLogin) redirect(303, '/admin');
	error(401, 'Unauthorized');
}
