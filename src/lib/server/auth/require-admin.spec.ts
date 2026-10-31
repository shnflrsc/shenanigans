import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { requireAdmin } from './require-admin';

const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof requireAdmin>[0];

describe('requireAdmin', () => {
	it('returns the admin', () => {
		const user = { id: 'u' } as User;
		expect(requireAdmin(event(user))).toBe(user);
	});

	it('answers 401 for actions and endpoints without a session', () => {
		expect(() => requireAdmin(event(null))).toThrowError(expect.objectContaining({ status: 401 }));
	});

	it('redirects pages to the login screen', () => {
		expect(() => requireAdmin(event(null), { redirectToLogin: true })).toThrowError(
			expect.objectContaining({ status: 303, location: '/admin' })
		);
	});
});

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

/** Server files under routes/admin that are allowed to run without an admin session. */
const PUBLIC_ADMIN_ROUTES = new Set(['admin/+page.server.ts']);
const SERVER_FILES = new Set(['+page.server.ts', '+layout.server.ts', '+server.ts']);

describe('route inventory (SR-2)', () => {
	it('every admin server file guards itself with requireAdmin', () => {
		const routes = join(process.cwd(), 'src', 'routes');
		const unguarded = walk(join(routes, 'admin'))
			.filter((file) => SERVER_FILES.has(basename(file)))
			.map((file) => relative(routes, file).split(sep).join('/'))
			.filter((rel) => !PUBLIC_ADMIN_ROUTES.has(rel))
			.filter((rel) => !readFileSync(join(routes, rel), 'utf8').includes('requireAdmin('));
		expect(unguarded).toEqual([]);
	});

	it('finds the guarded files it is meant to check', () => {
		const routes = join(process.cwd(), 'src', 'routes');
		const found = walk(join(routes, 'admin')).filter((file) => SERVER_FILES.has(basename(file)));
		expect(found.length).toBeGreaterThan(0);
	});
});
