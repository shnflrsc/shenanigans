import type { Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Links to other sites open in a new tab (target and rel are fixed values, set after sanitizing, so nothing
 * from the document reaches them). Same-site and relative links keep their default behaviour.
 */
export function rehypeExternalLinks() {
	return (tree: Root) => {
		visit(tree, 'element', (node) => {
			if (node.tagName !== 'a') return;
			const href = node.properties?.href;
			if (typeof href === 'string' && /^https?:\/\//i.test(href)) {
				node.properties = { ...node.properties, target: '_blank', rel: ['noopener', 'noreferrer'] };
			}
		});
	};
}
