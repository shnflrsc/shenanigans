import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, checkUpload, objectPath, sniffType } from './uploads';

const bytes = (...values: (number | string)[]) =>
	new Uint8Array(
		values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v]))
	);

const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const png = bytes(0x89, 'PNG', 0x0d, 0x0a);
const gif = bytes('GIF89a', 0, 0);
const webp = bytes('RIFF', 0, 0, 0, 0, 'WEBP');
const avif = bytes(0, 0, 0, 0x1c, 'ftypavif');
const svg = bytes('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');

describe('sniffType', () => {
	it.each([
		['jpeg', jpeg, 'image/jpeg'],
		['png', png, 'image/png'],
		['gif', gif, 'image/gif'],
		['webp', webp, 'image/webp'],
		['avif', avif, 'image/avif']
	])('recognises %s', (_n, data, type) => expect(sniffType(data)).toBe(type));

	it('rejects SVG, HTML and unknown content', () => {
		expect(sniffType(svg)).toBeNull();
		expect(sniffType(bytes('<html><script>alert(1)</script>'))).toBeNull();
		expect(sniffType(bytes(1, 2, 3, 4))).toBeNull();
	});
});

describe('checkUpload (SR-9)', () => {
	it('accepts an allowed image within the size limit', () => {
		expect(checkUpload({ size: 1000, type: 'image/png' }, png)).toEqual({
			ok: true,
			type: 'image/png',
			extension: 'png'
		});
	});

	it('refuses SVG even with an image Content-Type', () => {
		expect(checkUpload({ size: 100, type: 'image/svg+xml' }, svg).ok).toBe(false);
		expect(checkUpload({ size: 100, type: 'image/png' }, svg).ok).toBe(false);
	});

	it('refuses a file whose declared type disagrees with its content', () => {
		expect(checkUpload({ size: 100, type: 'image/jpeg' }, png).ok).toBe(false);
	});

	it('refuses empty and oversized files', () => {
		expect(checkUpload({ size: 0, type: 'image/png' }, png).ok).toBe(false);
		expect(checkUpload({ size: MAX_UPLOAD_BYTES + 1, type: 'image/png' }, png).ok).toBe(false);
		expect(checkUpload({ size: MAX_UPLOAD_BYTES, type: 'image/png' }, png).ok).toBe(true);
	});
});

describe('objectPath', () => {
	it('is random and never uses a client file name', () => {
		const a = objectPath('png', new Date('2026-05-01T00:00:00Z'));
		expect(a).toMatch(/^2026\/[0-9a-f-]{36}\.png$/);
		expect(objectPath('png')).not.toBe(objectPath('png'));
	});
});
