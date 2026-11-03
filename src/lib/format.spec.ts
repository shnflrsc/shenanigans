import { describe, expect, it } from 'vitest';
import { IMAGE_WIDTHS, optimizedUrl } from './format.js';

describe('optimizedUrl', () => {
	it('goes through the optimizer with the address encoded', () => {
		const url = optimizedUrl(
			'https://x.supabase.co/storage/v1/object/public/images/2026/a.png',
			640
		);
		expect(url).toBe(
			'/_vercel/image?url=https%3A%2F%2Fx.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2F2026%2Fa.png&w=640&q=75'
		);
	});

	it('only uses widths the optimizer allows, in ascending order', () => {
		expect([...IMAGE_WIDTHS].sort((a, b) => a - b)).toEqual(IMAGE_WIDTHS);
	});
});
