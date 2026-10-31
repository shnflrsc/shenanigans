import type { User } from '@supabase/supabase-js';

/**
 * The numeric GitHub account id of a Supabase user, read from the server-provided `identities`
 * (never from `user_metadata`, which the user can edit, and never from username or email) (SR-3).
 */
export function githubIdOf(user: Pick<User, 'identities'>): string | null {
	const identity = user.identities?.find((i) => i.provider === 'github');
	if (!identity) return null;
	const id = identity.id ?? identity.identity_data?.provider_id;
	return id === undefined || id === null || id === '' ? null : String(id);
}

/** True only when the user signed in with GitHub and the numeric id equals the allowed id. */
export function isAllowed(user: Pick<User, 'identities'>, allowedGithubId: string): boolean {
	const id = githubIdOf(user);
	return id !== null && /^\d+$/.test(allowedGithubId) && id === allowedGithubId;
}
