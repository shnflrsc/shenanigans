import type { User } from '@supabase/supabase-js';
import { isAllowed } from './allowlist';

/** The slice of the Supabase client the session check needs. */
export interface AuthClient {
	auth: {
		getUser(): Promise<{ data: { user: User | null }; error: unknown }>;
		signOut(): Promise<unknown>;
	};
}

export type SessionResult =
	{ status: 'anonymous' } | { status: 'admin'; user: User } | { status: 'denied' };

/**
 * Validates the session with Supabase (`getUser()`, not `getSession()`, SR-1) and checks the allowlist (SR-3).
 * A signed-in account that is not the admin is signed out immediately (FR-10).
 */
export async function resolveSession(
	supabase: AuthClient,
	allowedGithubId: string
): Promise<SessionResult> {
	const { data, error } = await supabase.auth.getUser();
	if (error || !data.user) return { status: 'anonymous' };
	if (isAllowed(data.user, allowedGithubId)) return { status: 'admin', user: data.user };
	await supabase.auth.signOut();
	return { status: 'denied' };
}
