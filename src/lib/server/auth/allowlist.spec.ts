import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { githubIdOf, isAllowed } from './allowlist';

const github = (id: string): Pick<User, 'identities'> => ({
	identities: [
		{
			id,
			user_id: 'u',
			identity_id: 'i',
			provider: 'github',
			identity_data: { provider_id: id, user_name: 'someone', email: 'someone@example.com' }
		}
	]
});

describe('allowlist', () => {
	it('accepts the matching numeric GitHub id', () => {
		expect(isAllowed(github('12345'), '12345')).toBe(true);
	});

	it('rejects a different GitHub id', () => {
		expect(isAllowed(github('99999'), '12345')).toBe(false);
	});

	it('rejects a user without a GitHub identity', () => {
		expect(
			isAllowed({ identities: [{ ...github('12345').identities![0], provider: 'email' }] }, '12345')
		).toBe(false);
		expect(isAllowed({ identities: undefined }, '12345')).toBe(false);
	});

	it('ignores username, email and editable metadata', () => {
		const user = {
			...github('99999'),
			user_metadata: { provider_id: '12345', user_name: '12345' },
			email: '12345@example.com'
		};
		expect(isAllowed(user, '12345')).toBe(false);
		expect(githubIdOf(user)).toBe('99999');
	});

	it('never allows when the configured id is not numeric', () => {
		expect(isAllowed(github('abc'), 'abc')).toBe(false);
	});
});
