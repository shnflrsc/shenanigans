import { describe, expect, it, vi } from 'vitest';
import { checkRequest, classify } from './index';
import type { Db } from '../content/public';

describe('classify', () => {
	it('puts the login page, sign-in action and OAuth callback on the login limit', () => {
		expect(classify('/admin', false)).toBe('login');
		expect(classify('/admin/', true)).toBe('login');
		expect(classify('/auth/callback', false)).toBe('login');
	});

	it('limits other admin routes only for requests without a session cookie', () => {
		expect(classify('/admin/posts', false)).toBe('adminAnonymous');
		expect(classify('/admin/posts', true)).toBeNull();
	});

	it('leaves public pages alone', () => {
		expect(classify('/', false)).toBeNull();
		expect(classify('/blog/hello', false)).toBeNull();
		expect(classify('/administrator', false)).toBeNull();
	});
});

describe('checkRequest', () => {
	it('fails open and logs when the database check fails', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const db = {
			execute: async () => {
				throw new Error('db down');
			}
		} as unknown as Db;
		expect(
			await checkRequest({ db, secret: 's'.repeat(20), ip: '1.2.3.4' }, '/admin', false)
		).toBeNull();
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it('does not touch the database for public pages', async () => {
		const execute = vi.fn();
		const db = { execute } as unknown as Db;
		await checkRequest({ db, secret: 's'.repeat(20), ip: '1.2.3.4' }, '/blog', false);
		expect(execute).not.toHaveBeenCalled();
	});
});
