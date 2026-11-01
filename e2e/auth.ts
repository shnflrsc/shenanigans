import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';
import { test as base, type BrowserContext } from '@playwright/test';
import { sql } from './db';

/** Reads .env the way the app's dev server does, because Playwright does not load it. */
function env(name: string): string {
	const fromEnv = process.env[name];
	if (fromEnv) return fromEnv;
	const text = readFileSync('.env', 'utf8');
	const match = text.match(new RegExp(`^${name}="?([^"\r\n]*)"?`, 'm'));
	if (!match) throw new Error(`${name} is not set`);
	return match[1];
}

/** Must match `ADMIN_GITHUB_ID` in playwright.config.ts. */
export const E2E_ADMIN_GITHUB_ID = '424242';
const EMAIL = 'e2e-admin@example.test';
// The local stack's JWT secret (printed by `supabase status`); a public demo value, not a secret.
const LOCAL_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');
function signJwt(payload: Record<string, unknown>) {
	const data = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify(payload))}`;
	return `${data}.${createHmac('sha256', LOCAL_JWT_SECRET).update(data).digest('base64url')}`;
}

/**
 * Email sign-in is switched off (GitHub is the only provider, SR-12), so e2e tests cannot log in with a
 * password. Instead this creates a local Supabase user whose GitHub identity carries the given id and a
 * real session row, signs a JWT for it with the local stack's secret, and lets the real @supabase/ssr client
 * format the session cookies. The app still validates everything with getUser(). Local stack only.
 */
async function createAdminSession(githubId = E2E_ADMIN_GITHUB_ID) {
	const url = env('PUBLIC_SUPABASE_URL');
	const anon = env('PUBLIC_SUPABASE_ANON_KEY');

	await sql(`delete from auth.users where email = '${EMAIL}'`);
	const [user] = await sql<{
		id: string;
	}>(`insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
		encrypted_password, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
		values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', '${EMAIL}', now(), '{"provider":"github","providers":["github"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', '', '')
		returning id`);
	await sql(`insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
		values (gen_random_uuid(), '${user.id}', 'github', '${githubId}', '{"provider_id":"${githubId}"}'::jsonb, now(), now(), now())`);
	const [session] = await sql<{
		id: string;
	}>(`insert into auth.sessions (id, user_id, created_at, updated_at, aal)
		values (gen_random_uuid(), '${user.id}', now(), now(), 'aal1') returning id`);

	const now = Math.floor(Date.now() / 1000);
	const accessToken = signJwt({
		aud: 'authenticated',
		role: 'authenticated',
		sub: user.id,
		email: EMAIL,
		session_id: session.id,
		aal: 'aal1',
		app_metadata: { provider: 'github', providers: ['github'] },
		user_metadata: {},
		iat: now,
		exp: now + 3600
	});

	let captured: { name: string; value: string }[] = [];
	const supabase = createServerClient(url, anon, {
		cookies: { getAll: () => [], setAll: (cookies) => void (captured = cookies) }
	});
	const { error } = await supabase.auth.setSession({
		access_token: accessToken,
		refresh_token: 'e2e-not-used'
	});
	if (error) throw error;
	return captured.map((c) => ({ name: c.name, value: c.value, domain: 'localhost', path: '/' }));
}

/** Signs the browser context in as the allowlisted admin. */
export async function signInAsAdmin(context: BrowserContext, githubId?: string) {
	await context.addCookies(await createAdminSession(githubId));
}

/** Signs in as a GitHub account that is NOT the admin (for the denial path). */
export const OTHER_GITHUB_ID = '999999';

export const test = base.extend<{ admin: void }>({
	admin: [
		async ({ context }, use) => {
			await signInAsAdmin(context);
			await use();
		},
		{ auto: false }
	]
});
export { expect } from '@playwright/test';
