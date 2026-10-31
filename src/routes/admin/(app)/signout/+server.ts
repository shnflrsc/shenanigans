import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth/require-admin.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	await event.locals.supabase.auth.signOut();
	redirect(303, '/admin');
};
