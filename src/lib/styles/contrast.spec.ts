import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** Reads the hex tokens of one theme block from tokens.css. */
function tokens(selector: string): Record<string, string> {
	const css = readFileSync('src/lib/styles/tokens.css', 'utf8');
	const block = css.slice(css.indexOf(selector));
	const body = block.slice(block.indexOf('{') + 1, block.indexOf('}'));
	return Object.fromEntries(
		[...body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]])
	);
}

const channel = (v: number) => {
	const c = v / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
	const n = parseInt(hex.slice(1), 16);
	return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export const contrast = (a: string, b: string) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

const themes = {
	light: tokens(":root,\n[data-theme='light']"),
	dark: tokens("[data-theme='dark']")
};

/**
 * Text pairs the markdown styles use (UR-8): body text and alert text on paper and paper-soft,
 * comments and muted syntax on the code block (paper-soft), inline code on fill-muted, the code header on paper-soft.
 */
const pairs: [string, string, number][] = [
	['ink', 'paper', 4.5],
	['ink', 'paper-soft', 4.5],
	['ink-muted', 'paper', 4.5],
	['ink-muted', 'paper-soft', 4.5], // alert text, syntax strings, code header
	['ink-subtle', 'paper-soft', 4.5], // syntax comments, alert icon
	['ink-subtle', 'paper', 4.5],
	['ink', 'fill-muted', 4.5], // inline code
	['ink-muted', 'fill-muted', 4.5],
	['on-ink', 'ink', 4.5]
];

describe.each(Object.entries(themes))('contrast in the %s theme', (_name, t) => {
	it.each(pairs)('%s on %s is at least %s:1', (fg, bg, min) => {
		expect(t[fg], `missing token ${fg}`).toBeDefined();
		expect(t[bg], `missing token ${bg}`).toBeDefined();
		expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
	});
});
