import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { createRateLimitHandle } from './handle';

function event(headers: Record<string, string>, ip = '198.51.100.9') {
	return {
		url: new URL('http://localhost/admin'),
		request: new Request('http://localhost/admin', { headers }),
		cookies: { getAll: () => [] },
		locals: {} as App.Locals,
		getClientAddress: () => ip
	} as unknown as RequestEvent;
}

describe('rate limit handle', () => {
	it('keys on the platform address, so X-Forwarded-For spoofing does not change the counted IP', async () => {
		const check = vi.fn<(ip: string, path: string, session: boolean) => Promise<null>>(
			async () => null
		);
		const handle = createRateLimitHandle(check);
		const resolve = async () => new Response('ok');
		await handle({ event: event({}), resolve });
		await handle({ event: event({ 'x-forwarded-for': '1.1.1.1' }), resolve });
		await handle({
			event: event({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3', 'x-real-ip': '4.4.4.4' }),
			resolve
		});
		expect(check.mock.calls.map((c) => c[0])).toEqual([
			'198.51.100.9',
			'198.51.100.9',
			'198.51.100.9'
		]);
	});

	it('adds Retry-After to the 429 response of a limited request', async () => {
		const handle = createRateLimitHandle(async () => ({ retryAfter: 42 }));
		const e = event({});
		const response = await handle({
			event: e,
			resolve: async () => new Response('slow down', { status: 429 })
		});
		expect(response.headers.get('Retry-After')).toBe('42');
		expect(e.locals.rateLimit).toEqual({ retryAfter: 42 });
	});

	it('does not touch other responses', async () => {
		const handle = createRateLimitHandle(async () => null);
		const response = await handle({ event: event({}), resolve: async () => new Response('ok') });
		expect(response.headers.has('Retry-After')).toBe(false);
	});
});
