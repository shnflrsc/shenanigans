import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { ADMIN_GITHUB_ID, RATE_LIMIT_SECRET } from '$app/env/private';
import { resolveSession } from '#lib/server/auth/session.js';
import { db } from '#lib/server/db/index.js';
import { assertNotRateLimited } from '#lib/server/rate-limit/guard.js';
import { recordRejection } from '#lib/server/rate-limit/index.js';
import type { PageServerLoad } from './$types';

// The OAuth callback must work without a session (SR-2 exemption: it is how a session starts).
// It is a page route, not an endpoint, so a 429 here renders the styled error page.
const params = z.object({ code: z.string().min(1).max(2048) });

export const load: PageServerLoad = async (event) => {
	assertNotRateLimited(event);
	const parsed = params.safeParse({ code: event.url.searchParams.get('code') });
	if (!parsed.success) redirect(303, '/admin?notice=error');

	const { error } = await event.locals.supabase.auth.exchangeCodeForSession(parsed.data.code);
	if (error) redirect(303, '/admin?notice=error');

	const session = await resolveSession(event.locals.supabase, ADMIN_GITHUB_ID);
	if (session.status === 'admin') redirect(303, '/admin/posts');
	if (session.status === 'denied') {
		await recordRejection({ db, secret: RATE_LIMIT_SECRET, ip: event.getClientAddress() });
		redirect(303, '/admin?notice=denied');
	}
	redirect(303, '/admin?notice=error');
};
