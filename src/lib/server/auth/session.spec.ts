import { describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { resolveSession, type AuthClient } from './session';

const user = (id: string) =>
	({
		id: 'uuid',
		identities: [{ id, provider: 'github', identity_data: { provider_id: id } }]
	}) as unknown as User;

function client(result: { user: User | null; error?: unknown }) {
	const signOut = vi.fn(async () => ({}));
	const supabase: AuthClient = {
		auth: {
			getUser: async () => ({ data: { user: result.user }, error: result.error ?? null }),
			signOut
		}
	};
	return { supabase, signOut };
}

describe('resolveSession', () => {
	it('treats a missing session as anonymous', async () => {
		const { supabase, signOut } = client({ user: null });
		expect(await resolveSession(supabase, '1')).toEqual({ status: 'anonymous' });
		expect(signOut).not.toHaveBeenCalled();
	});

	it('treats a failed validation as anonymous', async () => {
		const { supabase } = client({ user: user('1'), error: new Error('bad jwt') });
		expect(await resolveSession(supabase, '1')).toEqual({ status: 'anonymous' });
	});

	it('returns the admin for the allowlisted GitHub id', async () => {
		const { supabase } = client({ user: user('1') });
		expect((await resolveSession(supabase, '1')).status).toBe('admin');
	});

	it('signs out and denies any other account immediately', async () => {
		const { supabase, signOut } = client({ user: user('2') });
		expect(await resolveSession(supabase, '1')).toEqual({ status: 'denied' });
		expect(signOut).toHaveBeenCalledOnce();
	});
});
