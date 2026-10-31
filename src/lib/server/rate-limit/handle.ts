import type { Handle } from '@sveltejs/kit/hooks';
import { checkRequest, type RateDecision } from './index';

type Check = (ip: string, pathname: string, hasSessionCookie: boolean) => Promise<RateDecision>;

/**
 * Runs before any auth call (SR-14). The client address comes only from the platform
 * (`getClientAddress()`), never from request headers a visitor can set.
 * A limited request is marked on `locals.rateLimit`; routes then answer 429 (see guard.ts) and this
 * handle adds `Retry-After` to that response.
 */
export function createRateLimitHandle(check: Check): Handle {
	return async ({ event, resolve }) => {
		event.locals.rateLimit = null;
		const hasSessionCookie = event.cookies.getAll().some((c) => c.name.startsWith('sb-'));

		let ip: string | null = null;
		try {
			ip = event.getClientAddress();
		} catch {
			// No address available (for example during prerendering): nothing to key on.
		}
		if (ip) event.locals.rateLimit = await check(ip, event.url.pathname, hasSessionCookie);

		const response = await resolve(event);
		if (event.locals.rateLimit && response.status === 429) {
			response.headers.set('Retry-After', String(event.locals.rateLimit.retryAfter));
		}
		return response;
	};
}

export { checkRequest };
