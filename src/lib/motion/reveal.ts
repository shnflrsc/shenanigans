import type { Action } from 'svelte/action';

/** How much of a section must be on screen before it slides in. Small, so tall sections are never stuck. */
const THRESHOLD = 0.05;

/**
 * Slide-in fade for a whole section (DESIGN.md Motion, UR-11).
 *
 * The CSS hides every `data-reveal` section once the page has marked itself as running script (the `js` class
 * on <html>); this action shows each one, once, with a transition, the first time it scrolls into view. That
 * includes a section peeking into the first screen, so every section after the first behaves the same way.
 * With no script nothing is ever hidden, and if this action never runs the CSS fallback shows the section
 * after 2.5 seconds. Reduced motion shows everything at once.
 */
/** Pass `true` for the first section of a page, which plays its slide-in on load (CSS) instead. */
export const reveal: Action<HTMLElement, boolean | undefined> = (node, firstSection) => {
	if (firstSection) return {};
	const show = () => node.classList.add('reveal-in');

	if (
		window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
		typeof IntersectionObserver === 'undefined'
	) {
		show();
		return {};
	}

	const stop = () => {
		observer.disconnect();
		window.removeEventListener('scroll', onScroll);
		cancelAnimationFrame(frame);
	};
	const reveal = () => {
		show();
		stop();
	};

	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) reveal();
		},
		{ threshold: THRESHOLD }
	);
	observer.observe(node);

	// A fast scroll or a jump can carry a section from below the screen to above it without it ever
	// intersecting, so the observer never fires for it. A section scrolled past is shown here.
	let frame = 0;
	const onScroll = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (node.getBoundingClientRect().bottom < 0) reveal();
		});
	};
	window.addEventListener('scroll', onScroll, { passive: true });

	return { destroy: stop };
};
