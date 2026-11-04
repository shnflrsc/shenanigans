import { describe, expect, it } from 'vitest';
import { sslFor } from './ssl';

describe('sslFor', () => {
	it('stays off for the local stack', () => {
		expect(sslFor('postgresql://postgres:postgres@127.0.0.1:54322/postgres')).toBe(false);
		expect(sslFor('postgresql://postgres:postgres@localhost:54322/postgres')).toBe(false);
	});

	it('is required for a hosted database', () => {
		expect(sslFor('postgresql://postgres.abc:pw@aws-0-eu.pooler.supabase.com:6543/postgres')).toBe(
			'require'
		);
	});
});
