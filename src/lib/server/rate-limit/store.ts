import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db } from '../content/public';

/** Limits from SOFTWARE.md SR-14. Windows are fixed windows. */
export const LIMITS = {
	/** Sign-in start and callback requests. */
	login: { max: 10, windowSeconds: 10 * 60 },
	/** Allowlist rejections: the third one blocks the IP from the login surface for an hour. */
	rejection: { max: 3, windowSeconds: 60 * 60, blockAt: 3, blockSeconds: 60 * 60 },
	/** Unauthenticated requests to other /admin/* routes. */
	adminAnonymous: { max: 30, windowSeconds: 60 }
} as const;

export type LimitName = keyof typeof LIMITS;

export type HitResult = {
	/** False once the count exceeds the limit or the key is blocked. */
	allowed: boolean;
	count: number;
	/** Seconds until the caller may try again; 0 when allowed. */
	retryAfter: number;
};

/** Keyed hash of limit name + IP. The IP itself is never stored (SR-14). */
export function limiterKey(secret: string, name: LimitName, ip: string): string {
	return createHmac('sha256', secret).update(`${name}\u0000${ip}`).digest('hex');
}

type Row = { count: number; blocked_remaining: number | null; window_remaining: number };

/**
 * Counts one hit with a single atomic upsert, so two simultaneous requests cannot read the same
 * stale count. An expired window restarts at 1.
 */
export async function hit(db: Db, key: string, name: LimitName): Promise<HitResult> {
	const limit = LIMITS[name];
	const blockAt = 'blockAt' in limit ? limit.blockAt : null;
	const blockSeconds = 'blockSeconds' in limit ? limit.blockSeconds : 0;

	const result = await db.execute<Row>(sql`
		insert into rate_limits as r (key, count, window_start, blocked_until)
		values (
			${key}, 1, now(),
			case when ${blockAt}::int is not null and 1 >= ${blockAt}::int then now() + make_interval(secs => ${blockSeconds}) end
		)
		on conflict (key) do update set
			count = case when r.window_start <= now() - make_interval(secs => ${limit.windowSeconds})
				then 1 else r.count + 1 end,
			window_start = case when r.window_start <= now() - make_interval(secs => ${limit.windowSeconds})
				then now() else r.window_start end,
			blocked_until = case
				when ${blockAt}::int is not null and (
					case when r.window_start <= now() - make_interval(secs => ${limit.windowSeconds})
						then 1 else r.count + 1 end
				) >= ${blockAt}::int
				then now() + make_interval(secs => ${blockSeconds})
				else r.blocked_until
			end
		returning
			count,
			greatest(extract(epoch from (blocked_until - now())), 0)::float as blocked_remaining,
			greatest(extract(epoch from (window_start + make_interval(secs => ${limit.windowSeconds}) - now())), 0)::float as window_remaining
	`);
	const row = [...result][0];
	if (!row) throw new Error('rate_limits upsert returned no row');

	const blocked = (row.blocked_remaining ?? 0) > 0;
	// Rejection counters block rather than refuse their own recording.
	const over = name !== 'rejection' && row.count > limit.max;
	if (blocked)
		return { allowed: false, count: row.count, retryAfter: Math.ceil(row.blocked_remaining!) };
	if (over)
		return {
			allowed: false,
			count: row.count,
			retryAfter: Math.max(1, Math.ceil(row.window_remaining))
		};
	return { allowed: true, count: row.count, retryAfter: 0 };
}

/** Seconds a key is still blocked for, without counting a hit. 0 when not blocked. */
export async function blockedFor(db: Db, key: string): Promise<number> {
	const result = await db.execute<{ remaining: number }>(sql`
		select greatest(extract(epoch from (blocked_until - now())), 0)::float as remaining
		from rate_limits where key = ${key}
	`);
	const row = [...result][0];
	return row ? Math.ceil(row.remaining) : 0;
}

/** Deletes rows whose window and block have both long expired. Cheap; run occasionally. */
export async function cleanup(db: Db): Promise<void> {
	await db.execute(sql`
		delete from rate_limits
		where window_start < now() - interval '2 hours'
		and (blocked_until is null or blocked_until < now())
	`);
}
