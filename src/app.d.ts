import type { User } from '@supabase/supabase-js';
import type { ServerSupabase } from '#lib/server/auth/supabase.js';

declare global {
	/** Build-time flag: static/resume.pdf exists (vite.config.ts). */
	const __HAS_RESUME__: boolean;
	/** Build-time flag: on Vercel, cover images go through its image optimizer (vite.config.ts). */
	const __OPTIMIZE_IMAGES__: boolean;

	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			/** Supabase client bound to this request's cookies. */
			supabase: ServerSupabase;
			/** The validated admin, or null. Never set for any other account. */
			user: User | null;
			/** True when a non-admin account was just signed out during this request. */
			denied: boolean;
			/** Set by the rate-limit handle when this request is over its limit (SR-14). */
			rateLimit: { retryAfter: number } | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
