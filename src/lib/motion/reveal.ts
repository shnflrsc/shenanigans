import type { Action } from 'svelte/action';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How much of an element must be on screen before it is revealed. */
const THRESHOLD = 0.15;
/** Beyond this many siblings, the stagger stops growing so long lists do not crawl in. */
const MAX_STAGGER_STEPS = 8;

/**
 * Reveal on scroll (UR-11). Elements that start below the fold are hidden by the `reveal-hidden` class and
 * shown, once, when they scroll into view. Elements already on screen are never hidden, so nothing flashes,
 * and nothing is hidden at all when the visitor asks for reduced motion. This only runs in the browser: with
 * no script, or if it fails, nothing was ever hidden (and the CSS fallback shows stragglers after 2.5s).
 */
export function revealElements(elements: Element[]): () => void {
	if (reduced() || typeof IntersectionObserver === 'undefined') return () => {};

	const hidden: Element[] = [];
	const indexByParent = new Map<Element | null, number>();

	for (const el of elements) {
		if (!(el instanceof HTMLElement)) continue;
		el.setAttribute('data-reveal', '');
		// Stagger siblings that arrive together.
		const parent = el.parentElement;
		const step = Math.min(indexByParent.get(parent) ?? 0, MAX_STAGGER_STEPS);
		indexByParent.set(parent, (indexByParent.get(parent) ?? 0) + 1);
		el.style.setProperty('--i', String(step));

		const rect = el.getBoundingClientRect();
		const alreadyVisible = rect.top < window.innerHeight * (1 - THRESHOLD * 0.5);
		if (alreadyVisible) continue;
		el.classList.add('reveal-hidden');
		hidden.push(el);
	}

	if (hidden.length === 0) return () => {};

	const pending = new Set(hidden);
	const show = (el: Element) => {
		el.classList.remove('reveal-hidden');
		pending.delete(el);
		observer.unobserve(el);
	};

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) if (entry.isIntersecting) show(entry.target);
		},
		{ threshold: THRESHOLD }
	);
	for (const el of hidden) observer.observe(el);

	// A fast scroll or a jump can carry an element from below the screen to above it without it ever
	// intersecting, so the observer never fires for it. Anything scrolled past is shown here.
	let frame = 0;
	const onScroll = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			for (const el of [...pending]) if (el.getBoundingClientRect().bottom < 0) show(el);
			if (pending.size === 0) window.removeEventListener('scroll', onScroll);
		});
	};
	window.addEventListener('scroll', onScroll, { passive: true });

	return () => {
		window.removeEventListener('scroll', onScroll);
		cancelAnimationFrame(frame);
		observer.disconnect();
		for (const el of hidden) el.classList.remove('reveal-hidden');
	};
}

/**
 * Svelte action for a section's content container: reveals each direct child, and for children marked
 * `data-reveal-group` (grids and lists) reveals each of their items instead, so cards and rows arrive one by one.
 * A container with a single wrapper child reveals that wrapper's children, so a title and its content stagger.
 */
export const revealChildren: Action<HTMLElement> = (node) => {
	const level = node.children.length === 1 ? [...node.children[0].children] : [...node.children];
	const targets = (level.length ? level : [...node.children]).flatMap((child) =>
		child.hasAttribute('data-reveal-group') ? [...child.children] : [child]
	);
	const stop = revealElements(targets);
	return { destroy: stop };
};
