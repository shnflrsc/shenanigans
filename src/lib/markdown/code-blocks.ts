import { h } from 'hastscript';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/** Language labels are shown only when they match this allow-pattern (SR-15). */
export const LANGUAGE_LABEL = /^[A-Za-z0-9+#-]{1,20}$/;

function languageOf(code: Element): string | null {
	const classes = code.properties?.className;
	if (!Array.isArray(classes)) return null;
	for (const name of classes) {
		if (typeof name === 'string' && name.startsWith('language-')) {
			const label = name.slice('language-'.length);
			return LANGUAGE_LABEL.test(label) ? label : null;
		}
	}
	return null;
}

/** Removes language-* classes whose value fails the allow-pattern, so no raw fence text is copied into an attribute. */
function dropUnsafeLanguageClasses(code: Element) {
	const classes = code.properties?.className;
	if (!Array.isArray(classes)) return;
	code.properties.className = classes.filter(
		(name) =>
			typeof name !== 'string' ||
			!name.startsWith('language-') ||
			LANGUAGE_LABEL.test(name.slice('language-'.length))
	);
}

const checkIcon = () =>
	h(
		'svg',
		{
			class: 'code-copy-check',
			viewBox: '0 0 24 24',
			width: 14,
			height: 14,
			fill: 'none',
			stroke: 'currentColor',
			strokeWidth: 2,
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			ariaHidden: 'true'
		},
		[h('path', { d: 'M20 6 9 17l-5-5' })]
	);

/**
 * Wraps each fenced code block in a header bar with the language label and a Copy button (UR-9).
 * Runs after sanitizing and only emits fixed markup. The only text taken from the document is the
 * language label, and only when it passes the allow-pattern (SR-15). The button has no inline handler:
 * the site's script attaches one delegated listener (see copy-button.ts).
 */
export function rehypeCodeBlocks() {
	return (tree: Root) => {
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName !== 'pre' || !parent || index === undefined) return;
			const code = node.children.find(
				(child): child is Element => child.type === 'element' && child.tagName === 'code'
			);
			if (!code) return;
			const language = languageOf(code);
			dropUnsafeLanguageClasses(code);

			const header = h('div', { class: 'code-header' }, [
				...(language ? [h('span', { class: 'code-lang' }, language)] : []),
				h('button', { type: 'button', class: 'code-copy', ariaLabel: 'Copy code' }, [
					checkIcon(),
					h('span', { class: 'code-copy-label' }, 'Copy')
				]),
				h('span', { class: 'sr-only code-copy-status', role: 'status' })
			]);
			// Long lines scroll sideways, so keyboard users must be able to focus the block to scroll it.
			node.properties = { ...node.properties, tabIndex: 0 };
			parent.children[index] = h('div', { class: 'code-block' }, [header, node]);
			// The wrapper holds the pre we just moved; do not descend into it again.
			return 'skip';
		});
	};
}
