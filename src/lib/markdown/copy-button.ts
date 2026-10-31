const COPIED_MS = 2000;

/**
 * One delegated click listener for every Copy button on the page (UR-9). Works for markup added later,
 * such as the admin live preview, and needs no inline handler, so the strict CSP holds (SR-15).
 * Returns a function that removes the listener.
 */
export function installCopyButtons(root: Document = document): () => void {
	const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

	const show = (button: Element, copied: boolean) => {
		const label = button.querySelector('.code-copy-label');
		const status = button.parentElement?.querySelector('.code-copy-status');
		button.classList.toggle('is-copied', copied);
		if (label) label.textContent = copied ? 'Copied' : 'Copy';
		if (status) status.textContent = copied ? 'Copied to clipboard' : '';
	};

	const onClick = async (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const button = target.closest('.code-copy');
		if (!button) return;
		const code = button.closest('.code-block')?.querySelector('pre code');
		if (!code) return;

		// Exactly the code: not the language label, and without the newline Markdown adds after a fence.
		const text = (code.textContent ?? '').replace(/\n$/, '');
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			return;
		}

		clearTimeout(timers.get(button));
		show(button, true);
		timers.set(
			button,
			setTimeout(() => show(button, false), COPIED_MS)
		);
	};

	root.addEventListener('click', onClick);
	return () => root.removeEventListener('click', onClick);
}
