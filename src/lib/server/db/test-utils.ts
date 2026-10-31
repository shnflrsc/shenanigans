import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** Marker used to roll a test transaction back. */
class Rollback extends Error {}

/**
 * Runs `fn` inside a transaction that is always rolled back, so tests never leave data behind.
 * Needs the local Supabase stack (`bun run db:start`) with migrations applied.
 */
export async function withRollback(fn: (tx: TestTx) => Promise<void>) {
	const client = postgres(url, { max: 1, onnotice: () => {} });
	const db = drizzle(client, { schema });
	try {
		await db.transaction(async (tx) => {
			await fn(tx);
			throw new Rollback();
		});
	} catch (error) {
		if (!(error instanceof Rollback)) throw error;
	} finally {
		await client.end();
	}
}

export type TestTx = Parameters<
	Parameters<ReturnType<typeof drizzle<typeof schema>>['transaction']>[0]
>[0];

/** Runs `fn` as a Supabase role, optionally signed in as the given auth user. */
export async function asRole<T>(
	tx: TestTx,
	role: 'anon' | 'authenticated',
	userId: string | null,
	fn: () => Promise<T>
) {
	await tx.execute(`savepoint as_role`);
	await tx.execute(
		`select set_config('request.jwt.claims', '${JSON.stringify(userId ? { sub: userId, role } : { role })}', true)`
	);
	await tx.execute(`set local role ${role}`);
	try {
		return await fn();
	} catch (error) {
		// An expected SQL error aborts the transaction; roll back to the savepoint so the test can go on.
		await tx.execute(`rollback to savepoint as_role`);
		throw error;
	} finally {
		await tx.execute(`reset role`);
		await tx.execute(`release savepoint as_role`);
	}
}

/** Runs a statement that is expected to fail and recovers the transaction. Returns the database error text. */
export async function failure(tx: TestTx, fn: () => PromiseLike<unknown>): Promise<string> {
	await tx.execute(`savepoint attempt`);
	try {
		await fn();
	} catch (error) {
		await tx.execute(`rollback to savepoint attempt`);
		const cause = (error as { cause?: Error }).cause;
		return `${(error as Error).message} ${cause?.message ?? ''}`;
	}
	await tx.execute(`release savepoint attempt`);
	throw new Error('expected the statement to fail');
}
