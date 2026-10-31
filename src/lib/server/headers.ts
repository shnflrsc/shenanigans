import type { Handle } from '@sveltejs/kit/hooks';

const isAdminPath = (pathname: string) => pathname === '/admin' || pathname.startsWith('/admin/');

/**
 * Security headers on every response (SR-10, SR-11) and cache policy (PR-1, PR-2).
 * The Content Security Policy itself is configured in vite.config.ts (SvelteKit adds nonces).
 */
export const headers: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const { pathname, protocol } = event.url;
	const h = response.headers;

	h.set('X-Content-Type-Options', 'nosniff');
	h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	h.set('X-Frame-Options', 'DENY');
	h.set('Cross-Origin-Opener-Policy', 'same-origin');
	h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
	if (protocol === 'https:')
		h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	if (isAdminPath(pathname) || pathname.startsWith('/auth/')) {
		// Admin pages are never cached and never indexed (PR-2, SR-11).
		h.set('Cache-Control', 'private, no-store');
		h.set('X-Robots-Tag', 'noindex, nofollow');
	} else if (
		event.request.method === 'GET' &&
		response.status === 200 &&
		!h.has('Cache-Control') &&
		(h.get('content-type') ?? '').startsWith('text/html')
	) {
		// Public pages: short shared cache so repeat requests skip the database (PR-1). Kept short for PR-6.
		h.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=30');
	}
	return response;
};
