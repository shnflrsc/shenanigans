import type { Config } from '@sveltejs/adapter-vercel';

/**
 * Incremental static regeneration for the public routes (PR-6, D9). Vercel keeps a built copy of each page and
 * `revalidatePublic` refreshes it right after a save, using this bypass token. The one-minute expiry is a safety net:
 * if a refresh call fails, or content changes outside the dashboard, the page still updates within a minute.
 * Only adapter-vercel reads this; local builds ignore it.
 */
const base = { expiration: 60, bypassToken: process.env.VERCEL_ISR_BYPASS_TOKEN };

/** Pages that look the same for every query string. */
export const isr: Config = { isr: { ...base, allowQuery: [] } };

/** Index pages: the tag filter and the page number are cached separately. */
export const isrFiltered: Config = { isr: { ...base, allowQuery: ['tag', 'page'] } };
