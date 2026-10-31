import type { Db } from '../content/public';
import { blockedFor, cleanup, hit, limiterKey, type LimitName } from './store';

export type Surface = 'login' | 'adminAnonymous' | null;

/**
 * Which limit applies to a request (SR-14). The login surface is the /admin login page, the action that
 * starts GitHub sign-in (a POST to /admin) and the OAuth callback. Other /admin/* routes are limited only
 * for requests that carry no session cookie, because this runs before any auth call.
 */
export function classify(pathname: string, hasSessionCookie: boolean): Surface {
	const path = pathname.replace(/\/+$/, '') || '/';
	if (path === '/admin' || path === '/auth/callback') return 'login';
	if (path.startsWith('/admin/') && !hasSessionCookie) return 'adminAnonymous';
	return null;
}

export type RateDecision = { retryAfter: number } | null;

type Context = { db: Db; secret: string; ip: string };

/** Returns a retry time when the request must be refused. Fails open (and logs) if the database check fails. */
export async function checkRequest(
	ctx: Context,
	pathname: string,
	hasSessionCookie: boolean
): Promise<RateDecision> {
	const surface = classify(pathname, hasSessionCookie);
	if (!surface) return null;
	try {
		if (surface === 'login') {
			const blocked = await blockedFor(ctx.db, limiterKey(ctx.secret, 'rejection', ctx.ip));
			if (blocked > 0) return { retryAfter: blocked };
		}
		const result = await hit(ctx.db, limiterKey(ctx.secret, surface, ctx.ip), surface);
		// Housekeeping on roughly 1% of writes.
		if (Math.random() < 0.01) void cleanup(ctx.db).catch(() => {});
		return result.allowed ? null : { retryAfter: result.retryAfter };
	} catch (error) {
		// The allowlist is the real gate; failing closed could lock the owner out.
		console.error('rate limit check failed, allowing request', error);
		return null;
	}
}

/** Counts a non-owner GitHub account completing sign-in. The third one blocks the IP for an hour. */
export async function recordRejection(ctx: Context): Promise<void> {
	try {
		await hit(ctx.db, limiterKey(ctx.secret, 'rejection' satisfies LimitName, ctx.ip), 'rejection');
	} catch (error) {
		console.error('could not record allowlist rejection', error);
	}
}
