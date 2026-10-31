import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';

/**
 * A Supabase client bound to this request's cookies (SR-6). Session cookies are forced httpOnly,
 * SameSite=Lax and Secure on https. Only the server talks to Supabase Auth, so the browser never needs to read them.
 */
export function createSupabase(event: Pick<RequestEvent, 'cookies' | 'url'>) {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, {
						...options,
						path: '/',
						httpOnly: true,
						sameSite: 'lax',
						secure: event.url.protocol === 'https:'
					});
				}
			}
		}
	});
}

export type ServerSupabase = ReturnType<typeof createSupabase>;
