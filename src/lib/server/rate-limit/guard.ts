import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/** Answers 429 when the rate-limit handle marked this request. Plain message, no detail about why. */
export function assertNotRateLimited(event: Pick<RequestEvent, 'locals'>): void {
	if (event.locals.rateLimit) error(429, 'Too many requests');
}
