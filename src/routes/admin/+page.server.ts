import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { assertNotRateLimited } from '#lib/server/rate-limit/guard.js';
import type { Actions, PageServerLoad } from './$types';

// The login page is the one admin route that must work without a session (SR-2 exemption, see require-admin.spec.ts).
const query = z.object({ notice: z.enum(['denied', 'error']).optional() });

export const load: PageServerLoad = async (event) => {
	assertNotRateLimited(event);
	if (event.locals.user) redirect(303, '/admin/posts');
	const parsed = query.safeParse({ notice: event.url.searchParams.get('notice') ?? undefined });
	return {
		notice: event.locals.denied ? 'denied' : parsed.success ? (parsed.data.notice ?? null) : null
	};
};

export const actions: Actions = {
	/** Starts GitHub sign-in: the browser is sent to GitHub, which returns to /auth/callback. */
	signin: async (event) => {
		assertNotRateLimited(event);
		const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
			provider: 'github',
			options: { redirectTo: `${event.url.origin}/auth/callback`, skipBrowserRedirect: true }
		});
		if (error || !data.url) return fail(502, { notice: 'error' as const });
		// Only the Supabase Auth origin is allowed as an external target.
		redirect(303, data.url, { external: [new URL(PUBLIC_SUPABASE_URL).origin] });
	}
};
