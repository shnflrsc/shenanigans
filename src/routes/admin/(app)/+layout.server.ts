import { requireAdmin } from '#lib/server/auth/require-admin.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = requireAdmin(event, { redirectToLogin: true });
	return { admin: { id: user.id } };
};
