import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

const required = (
	description: string,
	schema: z.ZodType<string, string | undefined> = z.string().min(1)
) => ({
	description,
	schema
});

export const variables = defineEnvVars({
	DATABASE_URL: required(
		'Postgres connection string used by Drizzle.',
		z.string().startsWith('postgres')
	),
	SUPABASE_SERVICE_ROLE_KEY: required('Supabase service role key. Server only.'),
	ADMIN_GITHUB_ID: required(
		'Numeric GitHub account id allowed into /admin.',
		z.string().regex(/^\d+$/, 'must be a numeric GitHub id')
	),
	RATE_LIMIT_SECRET: required(
		'Secret for HMAC-hashing client IPs in rate_limits.',
		z.string().min(16)
	),
	PUBLIC_SUPABASE_URL: { public: true, ...required('Supabase project URL.', z.url()) },
	PUBLIC_SUPABASE_ANON_KEY: { public: true, ...required('Supabase anon key.') }
});
