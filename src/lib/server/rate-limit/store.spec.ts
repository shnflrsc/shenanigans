import { afterAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, like } from 'drizzle-orm';
import postgres from 'postgres';
import * as s from '../db/schema';
import { blockedFor, cleanup, hit, limiterKey } from './store';

// These tests commit rows (concurrency needs separate connections) under a unique prefix and delete them afterwards.
const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const client = postgres(url, { max: 20, onnotice: () => {} });
const db = drizzle(client, { schema: s });
const prefix = `test-${Date.now()}-`;
const key = (name: string) => `${prefix}${name}`;

afterAll(async () => {
	await db.delete(s.rateLimits).where(like(s.rateLimits.key, `${prefix}%`));
	await client.end();
});

describe('limiterKey', () => {
	it('is a keyed hash that depends on secret, limit name and ip, and hides the ip', () => {
		const a = limiterKey('secret-one-secret-one', 'login', '203.0.113.7');
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(a).not.toContain('203');
		expect(limiterKey('secret-one-secret-one', 'login', '203.0.113.8')).not.toBe(a);
		expect(limiterKey('secret-two-secret-two', 'login', '203.0.113.7')).not.toBe(a);
		expect(limiterKey('secret-one-secret-one', 'adminAnonymous', '203.0.113.7')).not.toBe(a);
	});
});

describe('hit', () => {
	it('allows 10 sign-in requests and refuses the 11th with a retry time', async () => {
		const k = key('login');
		for (let i = 1; i <= 10; i++) expect((await hit(db, k, 'login')).allowed).toBe(true);
		const eleventh = await hit(db, k, 'login');
		expect(eleventh.allowed).toBe(false);
		expect(eleventh.retryAfter).toBeGreaterThan(0);
		expect(eleventh.retryAfter).toBeLessThanOrEqual(600);
	});

	it('counts exactly under concurrent requests (no lost increments)', async () => {
		const k = key('concurrent');
		const results = await Promise.all(
			Array.from({ length: 50 }, () => hit(db, k, 'adminAnonymous'))
		);
		const [row] = await db.select().from(s.rateLimits).where(eq(s.rateLimits.key, k));
		expect(row.count).toBe(50);
		// 30 per minute: exactly 30 of the 50 were allowed.
		expect(results.filter((r) => r.allowed)).toHaveLength(30);
		expect(new Set(results.map((r) => r.count)).size).toBe(50);
	});

	it('blocks on the third allowlist rejection for an hour', async () => {
		const k = key('rejection');
		expect(await blockedFor(db, k)).toBe(0);
		await hit(db, k, 'rejection');
		await hit(db, k, 'rejection');
		expect(await blockedFor(db, k)).toBe(0);
		const third = await hit(db, k, 'rejection');
		expect(third.allowed).toBe(false);
		expect(third.retryAfter).toBeGreaterThan(3500);
		expect(await blockedFor(db, k)).toBeGreaterThan(3500);
	});

	it('starts a new window once the old one has expired', async () => {
		const k = key('expired');
		await hit(db, k, 'adminAnonymous');
		await hit(db, k, 'adminAnonymous');
		await db
			.update(s.rateLimits)
			.set({ windowStart: new Date(Date.now() - 61_000) })
			.where(eq(s.rateLimits.key, k));
		const next = await hit(db, k, 'adminAnonymous');
		expect(next.count).toBe(1);
		expect(next.allowed).toBe(true);
	});
});

describe('cleanup', () => {
	it('deletes long-expired rows but keeps blocked ones', async () => {
		const old = new Date(Date.now() - 3 * 3_600_000);
		await db.insert(s.rateLimits).values([
			{ key: key('old'), count: 1, windowStart: old },
			{
				key: key('old-blocked'),
				count: 3,
				windowStart: old,
				blockedUntil: new Date(Date.now() + 60_000)
			}
		]);
		await cleanup(db);
		const rows = await db
			.select()
			.from(s.rateLimits)
			.where(like(s.rateLimits.key, `${prefix}old%`));
		expect(rows.map((r) => r.key)).toEqual([key('old-blocked')]);
	});
});
