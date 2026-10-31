import { defineConfig } from '@playwright/test';

export default defineConfig({
	fullyParallel: false,
	workers: 1,
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		// Tests act as a throwaway GitHub account, never the real admin, so a real sign-in on the same local stack cannot collide.
		env: { ADMIN_GITHUB_ID: '424242' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
