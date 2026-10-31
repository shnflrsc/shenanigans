/** True when the browser can run view transitions and the visitor has not asked for reduced motion. */
export function canTransition(): boolean {
	return (
		typeof document !== 'undefined' &&
		typeof document.startViewTransition === 'function' &&
		!window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/**
 * Runs a DOM change inside a view transition when possible, otherwise just runs it (instant).
 * `theme` marks the document so the whole page cross-fades instead of the header, main and footer
 * transitioning separately (see motion.css).
 */
export async function withViewTransition(
	update: () => void | Promise<void>,
	options: { theme?: boolean } = {}
): Promise<void> {
	if (!canTransition()) {
		await update();
		return;
	}
	const root = document.documentElement;
	if (options.theme) root.classList.add('vt-theme');
	try {
		await document.startViewTransition(update).finished;
	} catch {
		// A skipped or interrupted transition still leaves the page in the right state.
	} finally {
		if (options.theme) root.classList.remove('vt-theme');
	}
}
