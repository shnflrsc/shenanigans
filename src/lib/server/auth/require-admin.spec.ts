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
/**
 * Public server files that may write: the sign-in form (rate limited, SR-14) and the OAuth callback (it starts the
 * session and records a rejected account). A new public write must be added here on purpose, with a security review.
 */
const KNOWN_PUBLIC_WRITES = new Set(['admin/+page.server.ts', 'auth/callback/+page.server.ts']);
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

	it('every load function, form action and endpoint calls requireAdmin itself', () => {
		const routes = join(process.cwd(), 'src', 'routes');
		const handler =
			/^\s*(?:export const (?:load|GET|POST|PUT|PATCH|DELETE)\b|\w+: async \(event\))/gm;
		const short = walk(join(routes, 'admin'))
			.filter((file) => SERVER_FILES.has(basename(file)))
			.map((file) => relative(routes, file).split(sep).join('/'))
			.filter((rel) => !PUBLIC_ADMIN_ROUTES.has(rel))
			.filter((rel) => {
				const text = readFileSync(join(routes, rel), 'utf8');
				return (text.match(/requireAdmin\(/g) ?? []).length < (text.match(handler) ?? []).length;
			});
		expect(short).toEqual([]);
	});

	it('a write endpoint outside the admin area must be on the list of known public writes', () => {
		const routes = join(process.cwd(), 'src', 'routes');
		const writes =
			/export const (?:actions|POST|PUT|PATCH|DELETE)\b|export (?:async )?function (?:POST|PUT|PATCH|DELETE)\b|\b(?:db|tx)\.(?:insert|update|delete)\(|\bcontent\.(?:create|update|delete|save|set|publish|unpublish)\w*\(/;
		const unlisted = walk(routes)
			.filter((file) => SERVER_FILES.has(basename(file)))
			.map((file) => relative(routes, file).split(sep).join('/'))
			.filter((rel) => !rel.startsWith('admin/(app)/'))
			.filter((rel) => !KNOWN_PUBLIC_WRITES.has(rel))
			.filter((rel) => writes.test(readFileSync(join(routes, rel), 'utf8')));
		expect(unlisted).toEqual([]);
	});

	it('keeps the list of known public writes small and real', () => {
		const routes = join(process.cwd(), 'src', 'routes');
		for (const rel of KNOWN_PUBLIC_WRITES) {
			expect(statSync(join(routes, rel)).isFile(), rel).toBe(true);
		}
	});

	it('finds the guarded files it is meant to check', () => {
		const routes = join(process.cwd(), 'src', 'routes');
		const found = walk(join(routes, 'admin')).filter((file) => SERVER_FILES.has(basename(file)));
		expect(found.length).toBeGreaterThan(0);
	});
});
