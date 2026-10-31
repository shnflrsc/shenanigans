import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { existsSync } from 'node:fs';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import adapterVercel from '@sveltejs/adapter-vercel';
import adapterNode from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const supabaseOrigin = env.PUBLIC_SUPABASE_URL
		? (new URL(env.PUBLIC_SUPABASE_URL).origin as `${string}://${string}.${string}`)
		: undefined;

	return {
		// The résumé button only shows when the file exists, so it never links to a missing file (FR-23).
		define: { __HAS_RESUME__: JSON.stringify(existsSync('static/resume.pdf')) },
		plugins: [
			enhancedImages(),
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				// adapter-vercel needs symlinks (fails on Windows without developer mode), so use it only on Vercel
				adapter: process.env.VERCEL ? adapterVercel() : adapterNode(),
				// Strict CSP (SR-10): SvelteKit adds nonces for its own inline scripts and styles.
				csp: {
					mode: 'nonce',
					directives: {
						'default-src': ['none'],
						'script-src': ['self'],
						'style-src': ['self'],
						// SvelteKit's route announcer sets one fixed inline style attribute; allow exactly that hash, nothing else.
						'style-src-attr': [
							'unsafe-hashes',
							'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
						],
						'img-src': ['self', 'data:', ...(supabaseOrigin ? [supabaseOrigin] : [])],
						'font-src': ['self'],
						'connect-src': ['self'],
						'manifest-src': ['self'],
						'base-uri': ['self'],
						'object-src': ['none'],
						'frame-ancestors': ['none'],
						// Browsers also check redirects after a form post: sign-in goes to Supabase, then GitHub.
						'form-action': [
							'self',
							'https://github.com',
							...(supabaseOrigin ? [supabaseOrigin] : [])
						]
					}
				}
			})
		],
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium', headless: true }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**']
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
