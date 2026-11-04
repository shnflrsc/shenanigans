import { describe, expect, it } from 'vitest';
import { lengthHint } from './length-hint';

describe('lengthHint', () => {
	it('asks for a length when empty', () => {
		expect(lengthHint('  ')).toBe('Aim for 120 to 160 characters.');
	});
	it('says when short, fine and long', () => {
		expect(lengthHint('a'.repeat(50))).toContain('longer');
		expect(lengthHint('a'.repeat(140))).toBe('140 characters.');
		expect(lengthHint('a'.repeat(200))).toContain('cut it off');
	});
});
