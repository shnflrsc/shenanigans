import { describe, expect, it } from 'vitest';
import { variables } from './env';

const check = (name: keyof typeof variables, value: string | undefined) =>
	variables[name].schema!['~standard'].validate(value);

describe('env schemas', () => {
	it('rejects a missing value', async () => {
		const result = await check('DATABASE_URL', undefined);
		expect(result.issues).toBeDefined();
	});

	it('requires a numeric GitHub id', async () => {
		expect((await check('ADMIN_GITHUB_ID', 'octocat')).issues).toBeDefined();
		expect((await check('ADMIN_GITHUB_ID', '12345')).issues).toBeUndefined();
	});

	it('requires a long rate limit secret', async () => {
		expect((await check('RATE_LIMIT_SECRET', 'short')).issues).toBeDefined();
	});

	it('keeps secrets private and only the Supabase URL and anon key public', () => {
		const publicNames = Object.entries(variables)
			.filter(([, v]) => 'public' in v && v.public)
			.map(([k]) => k);
		expect(publicNames.sort()).toEqual(['PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_URL']);
	});
});
