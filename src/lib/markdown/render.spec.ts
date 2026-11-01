import { describe, expect, it } from 'vitest';
import { readTimeMinutes, renderMarkdown } from './render';

const payloads = [
	'<script>window.__pwned = true</script>',
	'<img src=x onerror="window.__pwned = true">',
	'<svg onload="window.__pwned = true"></svg>',
	'<iframe src="javascript:alert(1)"></iframe>',
	'<a href="javascript:alert(1)">x</a>',
	'[click](javascript:alert(1))',
	'[click](JaVaScRiPt:alert(1))',
	'[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
	'![x](javascript:alert(1))',
	'<div onclick="alert(1)" style="background:url(javascript:alert(1))">x</div>',
	'<style>body{display:none}</style>',
	'<form action="https://evil.example"><input name=x></form>',
	'<details open ontoggle=alert(1)>x</details>',
	'<math><mi xlink:href="javascript:alert(1)">x</mi></math>'
];

describe('renderMarkdown is inert (SR-8)', () => {
	it.each(payloads)('neutralises %s', (payload) => {
		const html = renderMarkdown(`before\n\n${payload}\n\nafter`);
		expect(html).not.toMatch(/<script/i);
		expect(html).not.toMatch(/<iframe/i);
		expect(html).not.toMatch(/<style/i);
		expect(html).not.toMatch(/<form/i);
		expect(html).not.toMatch(/\son[a-z]+\s*=/i);
		expect(html).not.toMatch(/javascript:/i);
		expect(html).not.toMatch(/data:text\/html/i);
		expect(html).not.toMatch(/\sstyle\s*=/i);
	});

	it('does not render raw HTML from the source as markup', () => {
		const html = renderMarkdown('<b>bold</b> and <u onclick="x()">u</u>');
		expect(html).not.toContain('<b>');
		expect(html).not.toContain('<u');
	});

	it('escapes markup characters in code', () => {
		const html = renderMarkdown('```html\n<script>alert(1)</script>\n```');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&#x3C;');
	});

	it('keeps ordinary markdown: links, lists, tables, tasks, images', () => {
		const html = renderMarkdown(
			'[link](https://example.com)\n\n- a\n- b\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n\n![alt](https://example.com/a.png)'
		);
		expect(html).toContain(
			'<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>'
		);
		expect(html).toContain('<ul>');
		expect(html).toContain('<table>');
		expect(html).toContain('type="checkbox"');
		expect(html).toContain('<img src="https://example.com/a.png" alt="alt">');
	});
});

describe('alerts (FR-5, UR-7)', () => {
	it.each(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])('renders %s as a callout', (type) => {
		const html = renderMarkdown(`> [!${type}]\n> Something to know.`);
		expect(html).toContain(`markdown-alert-${type.toLowerCase()}`);
		expect(html).toContain('markdown-alert-title');
		expect(html).toContain('<svg');
		expect(html).toContain('Something to know.');
	});

	it('leaves ordinary blockquotes alone', () => {
		const html = renderMarkdown('> just a quote');
		expect(html).toContain('<blockquote>');
		expect(html).not.toContain('markdown-alert');
	});

	it('cannot be forged with a hostile alert body', () => {
		const html = renderMarkdown('> [!NOTE]\n> <img src=x onerror=alert(1)>');
		expect(html).not.toMatch(/onerror/i);
	});
});

describe('code blocks (UR-6, UR-9, SR-15)', () => {
	it('adds a header with the language label and a Copy button', () => {
		const html = renderMarkdown('```ts\nconst a = 1;\n```');
		expect(html).toContain('<div class="code-block">');
		expect(html).toContain('<span class="code-lang">ts</span>');
		expect(html).toContain('type="button"');
		expect(html).toContain('aria-label="Copy code"');
		expect(html).toContain('class="code-copy-label">Copy<');
		expect(html).toContain('role="status"');
	});

	it('highlights with hljs classes and never with inline styles', () => {
		const html = renderMarkdown('```python\ndef greet(name):\n    return name\n```');
		expect(html).toContain('hljs-keyword');
		expect(html).not.toMatch(/\sstyle=/);
	});

	it.each(['c++', 'c#', 'objective-c', 'TS', 'a'.repeat(20)])('shows the label %s', (label) => {
		const html = renderMarkdown('```' + label + '\nx\n```');
		expect(html).toContain(`<span class="code-lang">${label}</span>`);
	});

	it.each([
		'"><img src=x onerror=alert(1)>',
		'a'.repeat(21),
		'ts&lt;x',
		'</span><b>',
		"'onload=alert(1)"
	])('drops an unsafe language label: %s', (label) => {
		const html = renderMarkdown('```' + label + '\nx\n```');
		expect(html).not.toContain('code-lang');
		expect(html).not.toMatch(/<img/i);
		expect(html).not.toMatch(/onerror=|onload=/i);
	});

	it('renders a fence with no language without a label and without highlighting', () => {
		const html = renderMarkdown('```\nplain\n```');
		expect(html).toContain('code-block');
		expect(html).not.toContain('code-lang');
		expect(html).not.toContain('hljs-');
	});

	it('uses the same markup every time (preview and public page share it)', () => {
		const src = '```bash\nbun run dev\n```';
		expect(renderMarkdown(src)).toBe(renderMarkdown(src));
	});
});

describe('readTimeMinutes', () => {
	it('is at least one minute', () => {
		expect(readTimeMinutes('')).toBe(1);
		expect(readTimeMinutes('short')).toBe(1);
	});

	it('grows with the word count and ignores code blocks', () => {
		const words = Array.from({ length: 450 }, () => 'word').join(' ');
		expect(readTimeMinutes(words)).toBe(3);
		expect(readTimeMinutes('```\n' + words + '\n```')).toBe(1);
	});
});

describe('external links', () => {
	it('open in a new tab with noopener noreferrer; relative and mailto links do not', () => {
		const html = renderMarkdown(
			'[a](https://example.com) [b](/blog) [c](mailto:a@b.co) [d](http://example.org/x)'
		);
		expect(html).toContain(
			'<a href="https://example.com" target="_blank" rel="noopener noreferrer">a</a>'
		);
		expect(html).toContain(
			'<a href="http://example.org/x" target="_blank" rel="noopener noreferrer">d</a>'
		);
		expect(html).toContain('<a href="/blog">b</a>');
		expect(html).toContain('<a href="mailto:a@b.co">c</a>');
	});

	it('a document cannot set its own target or rel', () => {
		const html = renderMarkdown('<a href="https://x.test" target="_self" rel="opener">x</a>');
		expect(html).not.toContain('opener"');
		expect(html).not.toContain('_self');
	});
});
