import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderMarkdown } from './render';
import { installCopyButtons } from './copy-button';

let copied: string[];
let uninstall: () => void;

beforeEach(() => {
	copied = [];
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: { writeText: async (text: string) => void copied.push(text) }
	});
	vi.useFakeTimers();
	uninstall = installCopyButtons();
});

afterEach(() => {
	uninstall();
	vi.useRealTimers();
	document.body.innerHTML = '';
});

const mount = (markdown: string) => {
	document.body.innerHTML = renderMarkdown(markdown);
	return document.querySelector<HTMLButtonElement>('.code-copy')!;
};

describe('Copy button', () => {
	it('copies exactly the code, not the label or the trailing newline', async () => {
		const button = mount('```ts\nconst a = 1;\nconst b = 2;\n```');
		button.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(copied).toEqual(['const a = 1;\nconst b = 2;']);
	});

	it('reads Copied with a status announcement for about two seconds, then reverts', async () => {
		const button = mount('```bash\nbun run dev\n```');
		expect(button.textContent).toContain('Copy');
		button.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(button.querySelector('.code-copy-label')?.textContent).toBe('Copied');
		expect(button.classList.contains('is-copied')).toBe(true);
		expect(document.querySelector('.code-copy-status')?.textContent).toBe('Copied to clipboard');

		await vi.advanceTimersByTimeAsync(1900);
		expect(button.querySelector('.code-copy-label')?.textContent).toBe('Copied');
		await vi.advanceTimersByTimeAsync(200);
		expect(button.querySelector('.code-copy-label')?.textContent).toBe('Copy');
		expect(button.classList.contains('is-copied')).toBe(false);
		expect(document.querySelector('.code-copy-status')?.textContent).toBe('');
	});

	it('is a real, named, keyboard-focusable button', () => {
		const button = mount('```js\nx\n```');
		expect(button.tagName).toBe('BUTTON');
		expect(button.type).toBe('button');
		expect(button.getAttribute('aria-label')).toBe('Copy code');
		button.focus();
		expect(document.activeElement).toBe(button);
	});

	it('works for markup added after the listener was installed (the live preview)', async () => {
		document.body.innerHTML = '<p>empty</p>';
		document.body.insertAdjacentHTML('beforeend', renderMarkdown('```py\nprint(1)\n```'));
		document.querySelector<HTMLButtonElement>('.code-copy')!.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(copied).toEqual(['print(1)']);
	});
});
