import { defineConfig } from '@playwright/test';

export default defineConfig({
	fullyParallel: false,
	workers: 1,
	webServer: { command: 'bun run build && bun run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}'
});
