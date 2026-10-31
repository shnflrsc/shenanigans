import { assertNotRateLimited } from '#lib/server/rate-limit/guard.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	assertNotRateLimited(event);
};
