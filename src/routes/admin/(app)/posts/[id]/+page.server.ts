import { requireAdmin } from '#lib/server/auth/require-admin.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	requireAdmin(event, { redirectToLogin: true });
};
